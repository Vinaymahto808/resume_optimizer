"""Posting enrichment: skills, seniority, salary, ATS platform, H-1B sponsorship,
and listing verification (scam / low-quality signals)."""
import csv
import json
import logging
import os
import re
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Optional
from urllib.parse import urlparse

from app.career.skills import extract_skills

logger = logging.getLogger(__name__)

# Frequent H-1B filers in public DOL LCA disclosure data. Extend with the full
# dataset by pointing H1B_SPONSORS_CSV at a CSV with an employer-name column.
_KNOWN_SPONSORS = (
    "accenture", "adobe", "airbnb", "amazon", "amd", "apple", "applied materials", "atlassian",
    "bank of america", "barclays", "bloomberg", "booking", "broadcom", "capgemini", "capital one",
    "cisco", "citadel", "citi", "citigroup", "cognizant", "coinbase", "databricks", "dell", "deloitte",
    "doordash", "dropbox", "ebay", "ernst & young", "ey", "expedia", "meta", "facebook", "fidelity",
    "figma", "github", "goldman sachs", "google", "alphabet", "hcl", "hp", "hewlett packard enterprise",
    "ibm", "infosys", "instacart", "intel", "intuit", "jpmorgan", "jpmorgan chase", "kpmg",
    "lam research", "linkedin", "lyft", "mastercard", "mckinsey", "micron", "microsoft", "mindtree",
    "morgan stanley", "netflix", "nvidia", "oracle", "palantir", "paypal", "pinterest", "pwc",
    "qualcomm", "reddit", "robinhood", "salesforce", "samsung", "sap", "servicenow", "shopify", "slack",
    "snap", "snowflake", "spotify", "square", "block", "stripe", "tata consultancy services", "tcs",
    "tech mahindra", "tesla", "twilio", "uber", "visa", "vmware", "walmart", "wayfair", "wells fargo",
    "wipro", "workday", "zoom",
)

_SPONSOR_POSITIVE = re.compile(
    r"(visa sponsorship (is )?(available|provided|offered)|will sponsor|sponsorship available|h-?1b (sponsorship|transfer)"
    r"|we sponsor|open to sponsor)", re.I)
_SPONSOR_NEGATIVE = re.compile(
    r"(unable to sponsor|not able to sponsor|cannot sponsor|can't sponsor|no (visa )?sponsorship|"
    r"without (the need for )?(visa )?sponsorship|must be (a )?(us|u\.s\.) citizen|security clearance required|"
    r"not (offer|provide) (visa )?sponsorship)", re.I)

_SENIORITY = [
    ("intern", r"\b(intern|internship|co-op)\b"),
    ("entry", r"\b(junior|jr\.?|entry[- ]level|graduate|new grad|associate)\b"),
    ("lead", r"\b(lead|principal|staff|architect|head of|director|vp)\b"),
    ("senior", r"\b(senior|sr\.?|iii|level 3)\b"),
]

_ATS_HOSTS = {
    "greenhouse.io": "Greenhouse", "lever.co": "Lever", "ashbyhq.com": "Ashby",
    "myworkdayjobs.com": "Workday", "workday.com": "Workday", "taleo.net": "Taleo",
    "smartrecruiters.com": "SmartRecruiters", "icims.com": "iCIMS", "jobvite.com": "Jobvite",
    "bamboohr.com": "BambooHR", "workable.com": "Workable", "recruitee.com": "Recruitee",
}

_SCAM_PATTERNS = [
    (r"(wire|western union|money ?gram|gift card|bitcoin|crypto) (transfer|payment)", "Asks for money transfers"),
    (r"(pay|purchase).{0,30}(training|equipment|starter kit|background check fee)", "Asks applicant to pay"),
    (r"(whatsapp|telegram|signal)\s*(me|us|only|interview)", "Interview via messaging app only"),
    (r"(earn|make) \$?\d{3,}[, ]?\d*\s*(per|a|/)\s*(day|week)", "Unrealistic pay claims"),
    (r"no (experience|interview) (needed|required).{0,40}(\$|earn)", "No-interview high-pay offer"),
    (r"(ssn|social security number|bank account (number|details))", "Requests sensitive personal data"),
    (r"(reshipping|package forwarding|mystery shopper)", "Known scam job type"),
]


@lru_cache(maxsize=1)
def _sponsor_set() -> frozenset:
    names = set(_KNOWN_SPONSORS)
    path = os.getenv("H1B_SPONSORS_CSV", "")
    if path and os.path.exists(path):
        try:
            with open(path, newline="", encoding="utf-8", errors="ignore") as fh:
                reader = csv.DictReader(fh)
                column = next((c for c in (reader.fieldnames or []) if "employer" in c.lower()), None)
                if column:
                    for row in reader:
                        name = normalize_company(row.get(column, ""))
                        if name:
                            names.add(name)
        except OSError as exc:
            logger.warning("Could not read H1B_SPONSORS_CSV: %s", exc)
    return frozenset(names)


_COMPANY_SUFFIX = re.compile(r"[,.]?\s+(inc|llc|ltd|limited|corp|corporation|co|plc|gmbh|pvt|private|technologies|labs)\.?$", re.I)


def normalize_company(name: str) -> str:
    name = (name or "").strip().lower()
    prev = None
    while prev != name:
        prev = name
        name = _COMPANY_SUFFIX.sub("", name).strip()
    return re.sub(r"\s+", " ", name)


def h1b_status(company: str, description: str) -> tuple[bool, str]:
    """Return (likely_sponsor, signal) where signal is history|stated|denied|unknown."""
    text = description or ""
    if _SPONSOR_NEGATIVE.search(text):
        return False, "denied"
    if _SPONSOR_POSITIVE.search(text):
        return True, "stated"
    norm = normalize_company(company)
    sponsors = _sponsor_set()
    if norm in sponsors or norm.split(" ")[0] in sponsors:
        return True, "history"
    return False, "unknown"


def detect_seniority(title: str, description: str = "") -> str:
    hay = title.lower()
    for level, pattern in _SENIORITY:
        if re.search(pattern, hay):
            return level
    years = re.search(r"(\d{1,2})\+?\s*(?:years|yrs)", description or "", re.I)
    if years:
        n = int(years.group(1))
        if n >= 8:
            return "lead"
        if n >= 5:
            return "senior"
        if n <= 1:
            return "entry"
    return "mid"


_SALARY_RE = re.compile(
    r"\$\s?(\d{2,3}(?:[,.]\d{3})?|\d{2,3})\s?(k|K)?\s*(?:-|–|to)\s*\$?\s?(\d{2,3}(?:[,.]\d{3})?|\d{2,3})\s?(k|K)?")


def parse_salary(text: str) -> tuple[Optional[int], Optional[int]]:
    match = _SALARY_RE.search(text or "")
    if not match:
        return None, None

    def _val(num: str, k: Optional[str]) -> int:
        n = int(num.replace(",", "").replace(".", ""))
        if k or n < 1000:
            n *= 1000
        return n

    lo, hi = _val(match.group(1), match.group(2) or match.group(4)), _val(match.group(3), match.group(4))
    if lo > hi:
        lo, hi = hi, lo
    if lo < 15000 or hi > 2_000_000:
        return None, None
    return lo, hi


def detect_ats(url: str) -> str:
    host = urlparse(url or "").netloc.lower()
    for suffix, name in _ATS_HOSTS.items():
        if host.endswith(suffix):
            return name
    return ""


def is_remote(location: str, description: str = "") -> bool:
    hay = f"{location} {description[:400]}".lower()
    return bool(re.search(r"\b(remote|work from home|wfh|distributed|anywhere)\b", hay))


def verify_listing(title: str, company: str, description: str, url: str,
                   posted_at: Optional[datetime]) -> tuple[bool, list[str]]:
    """Heuristic verification. A listing is verified unless it trips a hard flag
    or accumulates multiple soft flags."""
    flags: list[str] = []
    hard = False
    text = f"{title}\n{description}"
    for pattern, label in _SCAM_PATTERNS:
        if re.search(pattern, text, re.I):
            flags.append(label)
            hard = True
    if not company or company.strip().lower() in {"confidential", "unknown", "n/a", "company"}:
        flags.append("Company not disclosed")
    if len((description or "").split()) < 40:
        flags.append("Very short description")
    host = urlparse(url or "").netloc.lower()
    if not host:
        flags.append("No application link")
    elif any(host.endswith(s) for s in ("bit.ly", "tinyurl.com", "forms.gle", "docs.google.com")):
        flags.append("Applies through a shortened link or generic form")
    if re.search(r"@(gmail|yahoo|hotmail|outlook)\.com", description or "", re.I):
        flags.append("Recruiter uses a personal email domain")
    if posted_at and posted_at < datetime.utcnow() - timedelta(days=60):
        flags.append("Posted more than 60 days ago")
    verified = not hard and len(flags) < 2
    return verified, flags


def enrich(raw: dict) -> dict:
    """Return enrichment fields for a normalized posting dict."""
    title, company = raw.get("title", ""), raw.get("company", "")
    description, url = raw.get("description", ""), raw.get("url", "")
    sponsor, signal = h1b_status(company, description)
    salary_min, salary_max = raw.get("salary_min"), raw.get("salary_max")
    if salary_min is None and salary_max is None:
        salary_min, salary_max = parse_salary(description)
    verified, flags = verify_listing(title, company, description, url, raw.get("posted_at"))
    # Board-provided tags are only kept when they are real taxonomy skills ("remote", "it" are not).
    tagged = set(extract_skills(", ".join(raw.get("skills") or [])))
    skills = sorted(set(extract_skills(f"{title}\n{description}")) | tagged)
    return {
        "skills": json.dumps(skills),
        "seniority": detect_seniority(title, description),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "ats_platform": raw.get("ats_platform") or detect_ats(url),
        "remote": bool(raw.get("remote")) or is_remote(raw.get("location", ""), description),
        "h1b_sponsor": sponsor,
        "h1b_signal": signal,
        "verified": verified,
        "verification_flags": json.dumps(flags),
    }
