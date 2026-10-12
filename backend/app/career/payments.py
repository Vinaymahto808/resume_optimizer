"""Manual UPI payments for Turbo: the user pays a static UPI QR, uploads proof, and an admin approves it.

Nothing here grants access from the proof itself. Turbo is granted by an admin calling approve, after
checking the UTR and amount in the payee's bank / PhonePe Business app, or automatically when the
payee's phone forwards the bank's credit SMS to the SMS webhook and its UTR and amount match."""

import hashlib
import hmac
import logging
import os
import re
import secrets
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote

from fastapi import (
    APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile,
)
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.career import plans
from app.career.admin import require_admin
from app.career.identity import get_profile
from app.career.models import PaymentRequest, SeekerProfile, UpiCredit
from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/career", tags=["career-payments"])

MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024  # Vercel rejects request bodies over 4.5 MB
DAILY_REQUEST_LIMIT = 5
_UTR_RE = re.compile(r"^\d{12}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"   # no 0/O/1/I, easy to read back from a bank app

BillingPeriod = Literal["monthly", "quarterly", "annual"]


# ------------------------------------------------------------- config -----

def upi_id() -> str:
    return os.getenv("UPI_ID", "").strip()


def payee_name() -> str:
    return os.getenv("UPI_PAYEE_NAME", "").strip() or "ProfileOptimizer"


def qr_image_path() -> Optional[Path]:
    raw = os.getenv("UPI_QR_IMAGE", "").strip()
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def sms_webhook_secret() -> str:
    return os.getenv("SMS_WEBHOOK_SECRET", "").strip()


def sms_allowed_senders() -> list[str]:
    return [s.strip().upper() for s in os.getenv("SMS_ALLOWED_SENDERS", "").split(",") if s.strip()]


def auto_verify_enabled() -> bool:
    # Both are required: without a sender allowlist, anyone could text the payee's phone a fake
    # "credited" message and have it forwarded.
    return bool(sms_webhook_secret() and sms_allowed_senders())


def screenshot_dir() -> Path:
    # Under UPLOAD_DIR, which is never mounted as static files (the SPA fallback 404s /uploads too).
    return Path(settings.UPLOAD_DIR) / "payments"


def reference_code(client_id: str) -> str:
    """A short code the user puts in the UPI note so the admin can match the bank entry to the request.
    Derived from the client id, so it stays the same across page reloads."""
    digest = hmac.new(settings.SECRET_KEY.encode(), f"upi-ref|{client_id}".encode(), hashlib.sha256).digest()
    return "PO-" + "".join(_REF_ALPHABET[b % len(_REF_ALPHABET)] for b in digest[:5])


def upi_link(amount_inr: int, ref: str) -> str:
    return (f"upi://pay?pa={quote(upi_id(), safe='@.')}&pn={quote(payee_name())}"
            f"&am={amount_inr:.2f}&cu=INR&tn={quote(ref)}")


def _qr_data_uri(link: str) -> str:
    import segno
    return segno.make(link, error="m").svg_data_uri(scale=6, border=2)


def _require_upi_mode() -> None:
    if plans.billing_mode() != "upi_manual":
        raise HTTPException(status_code=409, detail="UPI payments are not enabled on this server.")


# --------------------------------------------------------- file checks ----

def sniff_image(data: bytes) -> Optional[str]:
    """Return the real image type from the file's magic bytes, ignoring its name and declared type."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


_MEDIA_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


# ----------------------------------------------------------- bank SMS -----

_CREDIT_RE = re.compile(r"\b(credited|received|deposited)\b", re.I)
_AMOUNT_RE = re.compile(
    r"(?:rs\.?|inr|₹|credited\s+(?:by|with))\s*:?\s*(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d{1,2})?)", re.I)
_TWELVE_DIGITS_RE = re.compile(r"(?<!\d)\d{12}(?!\d)")
_LABELLED_UTR_RE = re.compile(r"(?:ref|utr|rrn|upi)[^\d]{0,12}(\d{12})(?!\d)", re.I)


def parse_credit_sms(message: str) -> Optional[tuple[int, str]]:
    """Return (amount in paise, UTR) from a bank's UPI credit SMS, or None if it isn't one.

    Handles the common formats, e.g. HDFC "Money Received - INR 499.00 ... (UPI Ref No 412345678901)",
    SBI "A/C X1234 credited by 499.0 ... Refno 412345678901", ICICI "credited:Rs. 499.00 ... UPI-412345678901-NAME"
    and Axis "INR 499.00 credited ... UPI/P2A/412345678901/NAME". The first amount is the credited one;
    a balance, if present, comes after it."""
    if not message or not _CREDIT_RE.search(message):
        return None
    amount = _AMOUNT_RE.search(message)
    if not amount:
        return None
    try:
        paise = int(Decimal(amount.group(1).replace(",", "")) * 100)
    except InvalidOperation:
        return None
    candidates = set(_TWELVE_DIGITS_RE.findall(message))
    if len(candidates) == 1:
        utr = candidates.pop()
    else:
        labelled = _LABELLED_UTR_RE.search(message)
        if not labelled:
            return None
        utr = labelled.group(1)
    return (paise, utr) if paise > 0 else None


# --------------------------------------------------------------- email ----

def _notify(to_email: str, subject: str, body: str) -> None:
    """Send one email; failures are logged and never break the request."""
    if not to_email:
        return
    try:
        from app.notification_service import Notification, get_notification_service
        get_notification_service().send(Notification(
            to_email=to_email, subject=subject, body=body, notification_type="upi_payment"))
    except Exception:   # noqa: BLE001
        logger.exception("UPI payment email to %s failed", to_email)


def _period_label(period: str) -> str:
    return plans.BILLING_PERIODS.get(period, {}).get("label", period)


# ------------------------------------------------------------ helpers -----

def request_dict(req: PaymentRequest, admin: bool = False) -> dict:
    out = {
        "id": req.id, "plan_period": req.plan_period, "plan_label": _period_label(req.plan_period),
        "amount_inr": req.amount_inr, "reference_code": req.reference_code, "utr": req.utr,
        "email": req.email, "status": req.status, "reject_reason": req.reject_reason or "",
        "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }
    if admin:
        out["client_id"] = req.client_id
    return out


def latest_request(db: Session, client_id: str) -> Optional[PaymentRequest]:
    return db.query(PaymentRequest).filter(PaymentRequest.client_id == client_id) \
        .order_by(PaymentRequest.created_at.desc()).first()


def _request_or_404(db: Session, req_id: str) -> PaymentRequest:
    req = db.get(PaymentRequest, req_id, populate_existing=True)
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found.")
    return req


# ---------------------------------------------------------- user side -----

@router.get("/payments/upi")
def upi_details(period: BillingPeriod = "monthly", profile: SeekerProfile = Depends(get_profile)):
    _require_upi_mode()
    amount = plans.BILLING_PERIODS[period]["price_inr"]
    ref = reference_code(profile.client_id)
    link = upi_link(amount, ref)
    has_static = qr_image_path() is not None
    return {
        "upi_id": upi_id(), "payee_name": payee_name(), "period": period, "amount_inr": amount,
        "reference_code": ref, "upi_link": link,
        # A static QR from the bank app can't carry the amount, so the user types it in.
        "qr_image_url": "/api/career/payments/qr-image" if has_static else None,
        "qr_data_uri": None if has_static else _qr_data_uri(link),
        "auto_verify": auto_verify_enabled(),
    }


@router.get("/payments/qr-image", include_in_schema=False)
def upi_qr_image():
    _require_upi_mode()
    path = qr_image_path()
    if not path:
        raise HTTPException(status_code=404, detail="No QR image configured.")
    return FileResponse(str(path), headers={"Cache-Control": "public, max-age=3600"})


@router.get("/payments/me")
def my_payment(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    req = latest_request(db, profile.client_id)
    return {"request": request_dict(req) if req else None}


@router.post("/payments")
async def create_payment(
    background: BackgroundTasks,
    period: BillingPeriod = Form(...),
    utr: str = Form(..., max_length=40),
    email: str = Form(..., max_length=254),
    screenshot: Optional[UploadFile] = File(None),
    profile: SeekerProfile = Depends(get_profile),
    db: Session = Depends(get_db),
):
    _require_upi_mode()
    auto = auto_verify_enabled()
    utr = re.sub(r"\s+", "", utr)
    email = email.strip()
    if not _UTR_RE.match(utr):
        raise HTTPException(status_code=422, detail="UTR / UPI transaction ID must be exactly 12 digits.")
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")

    since = datetime.utcnow() - timedelta(days=1)
    recent = db.query(func.count(PaymentRequest.id)).filter(
        PaymentRequest.client_id == profile.client_id, PaymentRequest.created_at >= since).scalar() or 0
    if recent >= DAILY_REQUEST_LIMIT:
        raise HTTPException(status_code=429, detail="Too many payment submissions today. Try again tomorrow.")
    if db.query(PaymentRequest.id).filter(PaymentRequest.client_id == profile.client_id,
                                          PaymentRequest.status == "pending").first():
        raise HTTPException(status_code=409, detail="You already have a payment under review.")
    if db.query(PaymentRequest.id).filter(PaymentRequest.utr == utr).first():
        raise HTTPException(status_code=409, detail="This UTR has already been submitted.")

    # With SMS auto-verification the bank SMS is the proof, so the screenshot is optional.
    filename, data = "", None
    if screenshot is None:
        if not auto:
            raise HTTPException(status_code=422, detail="Attach a screenshot of the payment.")
    else:
        data = await screenshot.read(MAX_SCREENSHOT_BYTES + 1)
        if len(data) > MAX_SCREENSHOT_BYTES:
            raise HTTPException(status_code=413, detail="Screenshot is too large (4 MB max).")
        kind = sniff_image(data)
        if not kind:
            raise HTTPException(status_code=415, detail="Screenshot must be a PNG, JPG or WebP image.")
        filename = f"{secrets.token_hex(16)}.{kind}"

    req = PaymentRequest(
        client_id=profile.client_id, plan_period=period, amount_inr=plans.BILLING_PERIODS[period]["price_inr"],
        reference_code=reference_code(profile.client_id), utr=utr, screenshot_path=filename, screenshot_data=data,
        email=email)
    db.add(req)
    if not profile.email:
        profile.email = email
    try:
        db.commit()
    except IntegrityError:
        # Lost a race with a concurrent submit (same UTR, or a second pending request).
        db.rollback()
        raise HTTPException(status_code=409, detail="This payment was already submitted.")
    db.refresh(req)

    # The bank SMS may have arrived before the user typed the UTR in.
    if auto and _auto_approve(db, utr, background):
        return {"request": request_dict(_request_or_404(db, req.id))}

    background.add_task(
        _notify, os.getenv("ADMIN_EMAIL", "").strip(),
        f"New UPI payment to review: ₹{req.amount_inr} ({req.reference_code})",
        f"A Turbo payment is waiting for review.\n\n"
        f"Plan: {_period_label(req.plan_period)}\nAmount: ₹{req.amount_inr}\nReference: {req.reference_code}\n"
        f"UTR: {req.utr}\nEmail: {req.email}\n\n"
        f"Verify the UTR and amount in your PhonePe Business app, then approve or reject:\n"
        f"{settings.FRONTEND_URL}/admin/payments\n")
    return {"request": request_dict(req)}


# --------------------------------------------------------- admin side -----

class RejectBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


@router.get("/admin/payments", dependencies=[Depends(require_admin)])
def admin_list(status: Literal["pending", "approved", "rejected"] = "pending",
               limit: int = Query(200, ge=1, le=500), db: Session = Depends(get_db)):
    q = db.query(PaymentRequest).filter(PaymentRequest.status == status)
    # The pending queue is worked oldest first; history reads newest first.
    q = q.order_by(PaymentRequest.created_at.asc() if status == "pending" else PaymentRequest.reviewed_at.desc())
    return {"requests": [request_dict(r, admin=True) for r in q.limit(limit).all()]}


@router.get("/admin/payments/{req_id}/screenshot", dependencies=[Depends(require_admin)])
def admin_screenshot(req_id: str, db: Session = Depends(get_db)):
    req = _request_or_404(db, req_id)
    media = _MEDIA_TYPES.get(Path(req.screenshot_path or "").suffix.lstrip("."), "application/octet-stream")
    if req.screenshot_data:
        return Response(content=bytes(req.screenshot_data), media_type=media, headers={"Cache-Control": "no-store"})
    # Requests submitted before screenshots moved into the database keep a file on disk.
    folder = screenshot_dir().resolve()
    path = (folder / (req.screenshot_path or "")).resolve()
    if not req.screenshot_path or path.parent != folder or not path.is_file():
        raise HTTPException(status_code=404, detail="Screenshot not found.")
    return FileResponse(str(path), media_type=media, headers={"Cache-Control": "no-store"})


def _approve(db: Session, req_id: str, background: BackgroundTasks,
             credit: Optional[UpiCredit] = None) -> tuple[PaymentRequest, Optional[SeekerProfile]]:
    """Approve a pending request and extend Turbo. Returns (request, profile); profile is None when the
    request was already approved, so the plan is never extended twice."""
    # Flip pending -> approved with a conditional UPDATE so two clicks (or an admin and the SMS
    # webhook) can't both extend the plan; the plan change commits in the same transaction.
    flipped = db.execute(
        update(PaymentRequest).where(PaymentRequest.id == req_id, PaymentRequest.status == "pending")
        .values(status="approved", reviewed_at=datetime.utcnow())
    ).rowcount
    if flipped != 1:
        db.rollback()
        req = _request_or_404(db, req_id)
        if req.status == "approved":
            return req, None
        raise HTTPException(status_code=409, detail=f"This request is already {req.status}.")

    req = _request_or_404(db, req_id)
    profile = db.get(SeekerProfile, req.client_id)
    if profile is None:
        profile = SeekerProfile(client_id=req.client_id, email=req.email)
        db.add(profile)
    plans.extend_turbo(profile, req.plan_period)
    if credit is not None:
        credit.request_id = req.id
    db.commit()
    db.refresh(req)

    expires = profile.plan_expires_at.strftime("%d %b %Y")
    background.add_task(
        _notify, req.email, "Your ProfileOptimizer Turbo plan is active",
        f"Thanks! We've confirmed your UPI payment of ₹{req.amount_inr} (ref {req.reference_code}).\n\n"
        f"Turbo ({_period_label(req.plan_period)}) is now active until {expires}.\n\n"
        f"Open the app: {settings.FRONTEND_URL}\n")
    return req, profile


def _auto_approve(db: Session, utr: str, background: BackgroundTasks) -> bool:
    """Approve the pending request with this UTR if a bank SMS confirmed at least its amount."""
    credit = db.query(UpiCredit).filter(UpiCredit.utr == utr, UpiCredit.request_id.is_(None)).first()
    req = db.query(PaymentRequest).filter(PaymentRequest.utr == utr, PaymentRequest.status == "pending").first()
    if credit is None or req is None:
        return False
    if credit.amount_paise < req.amount_inr * 100:
        # Underpaid: leave it in the queue for the admin to decide.
        logger.warning("UPI credit %s is ₹%.2f, request %s needs ₹%d", utr, credit.amount_paise / 100,
                       req.id, req.amount_inr)
        return False
    try:
        _, profile = _approve(db, req.id, background, credit=credit)
    except HTTPException:
        return False
    if profile is not None:
        logger.info("Auto-approved UPI payment %s (UTR %s) from bank SMS", req.id, utr)
    return profile is not None


@router.post("/payments/sms-webhook", include_in_schema=False)
async def sms_webhook(
    request: Request,
    background: BackgroundTasks,
    x_webhook_secret: Optional[str] = Header(None),
    secret: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Receives bank SMS forwarded by an SMS-to-webhook app on the payee's phone.

    Accepts JSON ({"message": ..., "from": ...}; also text/body/content and sender/phone/address keys),
    a form post with the same fields, or the raw SMS as the body. The secret goes in the X-Webhook-Secret
    header, or ?secret= for apps that can't set headers. Ignored messages still return 200 so the app
    doesn't keep retrying them."""
    expected = sms_webhook_secret()
    if not expected or not sms_allowed_senders():
        raise HTTPException(status_code=404, detail="Not found")
    given = x_webhook_secret or secret or ""
    if not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Bad webhook secret.")

    fields: dict = {}
    content_type = request.headers.get("content-type", "")
    if "json" in content_type:
        try:
            body = await request.json()
        except ValueError:
            body = None
        fields = body if isinstance(body, dict) else {"message": body if isinstance(body, str) else ""}
    elif "form" in content_type:
        fields = dict(await request.form())
    else:
        fields = {"message": (await request.body()).decode("utf-8", "replace")}

    def pick(*keys: str) -> str:
        return next((str(fields[k]) for k in keys if fields.get(k)), "")

    message = pick("message", "text", "body", "content", "msg", "sms")[:2000]
    sender = pick("from", "sender", "phone", "address", "number")[:100]
    if not any(allowed in sender.upper() for allowed in sms_allowed_senders()):
        return {"status": "ignored", "reason": "sender not allowed"}
    parsed = parse_credit_sms(message)
    if not parsed:
        return {"status": "ignored", "reason": "not a UPI credit"}
    paise, utr = parsed

    db.add(UpiCredit(utr=utr, amount_paise=paise, sender=sender, message=message))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()   # the same SMS forwarded twice; still try to match below
    matched = _auto_approve(db, utr, background)
    return {"status": "matched" if matched else "stored", "utr": utr, "amount_inr": paise / 100}


@router.post("/admin/payments/{req_id}/approve", dependencies=[Depends(require_admin)])
def admin_approve(req_id: str, background: BackgroundTasks, db: Session = Depends(get_db)):
    req, profile = _approve(db, req_id, background)
    if profile is None:
        return {"request": request_dict(req, admin=True), "already_processed": True}
    return {"request": request_dict(req, admin=True), "already_processed": False,
            "plan_expires_at": profile.plan_expires_at.isoformat()}


@router.post("/admin/payments/{req_id}/reject", dependencies=[Depends(require_admin)])
def admin_reject(req_id: str, body: RejectBody, background: BackgroundTasks, db: Session = Depends(get_db)):
    reason = body.reason.strip()
    flipped = db.execute(
        update(PaymentRequest).where(PaymentRequest.id == req_id, PaymentRequest.status == "pending")
        .values(status="rejected", reject_reason=reason, reviewed_at=datetime.utcnow())
    ).rowcount
    if flipped != 1:
        db.rollback()
        req = _request_or_404(db, req_id)
        raise HTTPException(status_code=409, detail=f"This request is already {req.status}.")
    db.commit()
    req = _request_or_404(db, req_id)

    background.add_task(
        _notify, req.email, "Your ProfileOptimizer payment could not be verified",
        f"We couldn't verify your UPI payment of ₹{req.amount_inr} (ref {req.reference_code}, UTR {req.utr}).\n\n"
        f"Reason: {reason}\n\n"
        f"If you were charged, reply to this email with your bank statement, or submit the correct "
        f"details in the app: {settings.FRONTEND_URL}\n")
    return {"request": request_dict(req, admin=True)}
