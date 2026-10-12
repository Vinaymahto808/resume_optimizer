import { useEffect, useState } from "react";
import { career, apiError } from "../../api";
import { CopyButton, ErrorNote, Field, Loading, Note, Spinner } from "./ui";
import { inr } from "./format";

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const POLL_MS = 4000;

function Row({ name, value, copy }) {
  return (
    <div className="cp-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ minWidth: 0 }}>
        <div className="cp-stat-label">{name}</div>
        <div style={{ fontWeight: 700, color: "var(--text-heading)", wordBreak: "break-all" }}>{value}</div>
      </div>
      {copy && <CopyButton text={copy} />}
    </div>
  );
}

export function UnderReview({ request, auto = false }) {
  if (auto) {
    return (
      <Note tone="warn">
        <Spinner /> <strong>Confirming your payment…</strong> This usually takes under a minute once the bank
        credit arrives. Keep this page open, it updates on its own. UTR {request.utr}, {inr(request.amount_inr)}.
        If it takes longer we'll check it by hand and email {request.email}.
      </Note>
    );
  }
  return (
    <Note tone="warn">
      <strong>Payment under review</strong>, usually within a few hours. We received your proof for Turbo{" "}
      {request.plan_label} ({inr(request.amount_inr)}), UTR {request.utr}. We'll email {request.email} once it's approved.
    </Note>
  );
}

/** Pay the UPI QR, then submit the 12-digit UTR (and a screenshot, unless the bank SMS verifies it).
 *  With auto-verify on, polls until the payment is approved and calls onApproved. */
export default function UpiPayment({ period, periodLabel, onSubmitted, onApproved }) {
  const [details, setDetails] = useState(null);
  const [qrSrc, setQrSrc] = useState("");
  const [last, setLast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [utr, setUtr] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [justPaid, setJustPaid] = useState(false);   // only celebrate a payment made on this visit

  useEffect(() => {
    career.me()
      .then((me) => {
        setEmail((e) => e || me.email || "");
        const payment = me.plan?.payment ?? null;
        setLast(payment);
        setJustPaid(payment?.status === "pending");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    let revoke = null;
    let cancelled = false;
    career.upiDetails(period)
      .then(async (d) => {
        if (cancelled) return;
        setDetails(d);
        if (d.qr_data_uri) setQrSrc(d.qr_data_uri);
        else if (d.qr_image_url) {
          revoke = await career.upiQrImage();
          if (!cancelled) setQrSrc(revoke);
        }
      })
      .catch((e) => !cancelled && setError(apiError(e)));
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [period]);

  const pickFile = (f) => {
    setError(null);
    if (f && !IMAGE_TYPES.includes(f.type)) { setFile(null); setError("Screenshot must be a PNG, JPG or WebP image."); return; }
    if (f && f.size > MAX_BYTES) { setFile(null); setError("Screenshot is too large (5 MB max)."); return; }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{12}$/.test(utr)) { setError("UTR / UPI transaction ID must be exactly 12 digits."); return; }
    if (!file && !auto) { setError("Attach a screenshot of the payment."); return; }
    setBusy(true);
    try {
      const { request } = await career.submitPayment({ period, utr, email: email.trim(), screenshot: file });
      setLast(request);
      setJustPaid(true);
      onSubmitted?.(request);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const auto = Boolean(details?.auto_verify);
  const pending = last?.status === "pending";

  useEffect(() => {
    if (!auto || !pending) return;
    const timer = setInterval(() => {
      career.myPayment().then(({ request }) => request && setLast(request)).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [auto, pending]);

  const approved = last?.status === "approved" && justPaid;
  useEffect(() => {
    if (!approved) return;
    const timer = setTimeout(() => onApproved?.(last), 1500);
    return () => clearTimeout(timer);
  }, [approved]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <Loading />;
  if (approved) {
    return <Note tone="success"><strong>Payment confirmed!</strong> Turbo {last.plan_label} is active. Taking you back…</Note>;
  }
  if (pending) return <UnderReview request={last} auto={auto} />;

  return (
    <div className="cp-stack">
      {last?.status === "rejected" && (
        <Note tone="warn">Your last payment ({last.utr}) was rejected: {last.reject_reason}. You can submit again below.</Note>
      )}
      <div className="cp-card cp-card-tight cp-stack">
        <div className="cp-eyebrow">Step 1 · Pay by UPI</div>
        {!details ? <Loading /> : (
          <div className="cp-row" style={{ alignItems: "flex-start", gap: 16 }}>
            {qrSrc ? (
              <img src={qrSrc} alt={`UPI QR code for ${details.payee_name}`}
                style={{ width: 180, height: 180, borderRadius: 12, border: "1px solid var(--border)", background: "#fff", padding: 4, objectFit: "contain" }} />
            ) : <Spinner />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <Row name="Amount" value={inr(details.amount_inr)} copy={String(details.amount_inr)} />
              <Row name="UPI ID" value={details.upi_id} copy={details.upi_id} />
              <Row name="Add this to the UPI note" value={details.reference_code} copy={details.reference_code} />
              <p className="cp-muted" style={{ margin: "8px 0 0" }}>
                Paying {details.payee_name}.{details.qr_image_url && " Enter the amount exactly as shown."}
              </p>
            </div>
          </div>
        )}
        {details && <a href={details.upi_link} className="btn-secondary" style={{ textAlign: "center" }}>Open in a UPI app (on your phone)</a>}
      </div>

      <form onSubmit={submit} className="cp-card cp-card-tight cp-stack">
        <div className="cp-eyebrow">Step 2 · I've paid, submit proof</div>
        <Field label="UTR / UPI transaction ID (12 digits)">
          <input required inputMode="numeric" autoComplete="off" maxLength={12} placeholder="e.g. 412345678901" value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))} style={{ letterSpacing: "0.08em" }} />
        </Field>
        <Field label={`Payment screenshot (PNG, JPG or WebP, max 5 MB)${auto ? ", optional" : ""}`}>
          <input type="file" required={!auto} accept="image/png,image/jpeg,image/webp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </Field>
        <div className="cp-grid-2">
          <Field label="Registered email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Plan">
            <input readOnly value={`Turbo ${periodLabel}${details ? ` · ${inr(details.amount_inr)}` : ""}`} style={{ background: "var(--bg-soft)" }} />
          </Field>
        </div>
        <ErrorNote message={error} />
        <button type="submit" className="btn-primary" disabled={busy || !details}>
          {busy ? <Spinner /> : auto ? "Confirm payment" : "Submit for review"}
        </button>
        <p className="cp-muted" style={{ margin: 0 }}>
          {auto ? "We match your UTR with the bank credit automatically. Turbo switches on within a minute or so."
            : "We check every payment by hand. Turbo switches on once it's verified."}
        </p>
      </form>
    </div>
  );
}
