"""Job ingestion pipeline: connectors -> normalize -> de-duplicate -> enrich -> embed -> store.

Connectors use public, key-less job-board feeds (Greenhouse, Lever, Ashby,
SmartRecruiters posting APIs, Workday career-site JSON, plus the Remotive and
Arbeitnow aggregators). Which company boards are crawled lives in the
platform_company_boards table (seeded from the env lists, managed through the
admin API); a bundled seed set keeps the platform usable offline.
"""
import hashlib
import html
import logging
import os
import re
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, Optional

import httpx

from app.career import vectors
from app.career.enrichment import enrich, normalize_company
from app.career.models import PlatformJob

logger = logging.getLogger(__name__)

DEFAULT_GREENHOUSE = "airbnb,stripe,databricks,figma,discord,robinhood,coinbase,dropbox,instacart,reddit"
DEFAULT_LEVER = "palantir,spotify,zoox,ro"
DEFAULT_ASHBY = "openai,notion,ramp,linear,vercel"

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def clean_html(raw: str) -> str:
    text = html.unescape(raw or "")
    text = re.sub(r"<\s*(br|/p|/li|/h\d)\s*/?>", "\n", text, flags=re.I)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    lines = [_WS_RE.sub(" ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _parse_dt(value) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 1e11 else value
        return datetime.utcfromtimestamp(seconds)
    try:
        text = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
    except ValueError:
        return None


@dataclass
class RawPosting:
    source: str
    source_id: str
    title: str
    company: str
    location: str = ""
    url: str = ""
    description: str = ""
    posted_at: Optional[datetime] = None
    remote: bool = False
    employment_type: str = "full-time"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    ats_platform: str = ""
    skills: list = field(default_factory=list)


def fingerprint(title: str, company: str, location: str) -> str:
    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()
    key = f"{norm(title)}|{normalize_company(company)}|{norm(location).split(' ')[0] if location else ''}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


class Connector:
    name = "base"

    def __init__(self, client: Optional[httpx.Client] = None):
        self.client = client or httpx.Client(timeout=20, headers={"User-Agent": "ProfileOptimizer-JobIngest/1.0"})
        self.board_stats: dict[str, dict] = {}   # board slug -> {"count": n, "error": str}

    def _board_ok(self, board: str, n: int = 1) -> None:
        self.board_stats.setdefault(board, {"count": 0, "error": ""})["count"] += n

    def _board_error(self, board: str, exc: Exception) -> None:
        self.board_stats.setdefault(board, {"count": 0, "error": ""})["error"] = str(exc)[:200]

    def fetch(self) -> Iterable[RawPosting]:
        raise NotImplementedError

    def _get_json(self, url: str, **params):
        resp = self.client.get(url, params=params or None)
        resp.raise_for_status()
        return resp.json()


class GreenhouseConnector(Connector):
    name = "greenhouse"

    def __init__(self, boards: list[str], **kw):
        super().__init__(**kw)
        self.boards = boards

    def fetch(self):
        for board in self.boards:
            try:
                data = self._get_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs", content="true")
            except Exception as exc:
                logger.warning("greenhouse board %s failed: %s", board, exc)
                self._board_error(board, exc)
                continue
            self._board_ok(board, 0)
            company = board.replace("-", " ").title()
            for job in data.get("jobs", []):
                self._board_ok(board)
                yield RawPosting(
                    source=self.name, source_id=str(job.get("id", "")), title=job.get("title", ""),
                    company=job.get("company_name") or company,
                    location=(job.get("location") or {}).get("name", ""),
                    url=job.get("absolute_url", ""), description=clean_html(job.get("content", "")),
                    posted_at=_parse_dt(job.get("updated_at")), ats_platform="Greenhouse",
                )


class LeverConnector(Connector):
    name = "lever"

    def __init__(self, companies: list[str], **kw):
        super().__init__(**kw)
        self.companies = companies

    def fetch(self):
        for company in self.companies:
            try:
                data = self._get_json(f"https://api.lever.co/v0/postings/{company}", mode="json")
            except Exception as exc:
                logger.warning("lever company %s failed: %s", company, exc)
                self._board_error(company, exc)
                continue
            self._board_ok(company, 0)
            for job in data if isinstance(data, list) else []:
                self._board_ok(company)
                cats = job.get("categories") or {}
                parts = [job.get("descriptionPlain", "")]
                for block in job.get("lists", []) or []:
                    parts.append(block.get("text", ""))
                    parts.append(clean_html(block.get("content", "")))
                parts.append(job.get("additionalPlain", ""))
                salary = job.get("salaryRange") or {}
                yield RawPosting(
                    source=self.name, source_id=job.get("id", ""), title=job.get("text", ""),
                    company=company.replace("-", " ").title(), location=cats.get("location", ""),
                    url=job.get("hostedUrl", ""), description="\n".join(p for p in parts if p),
                    posted_at=_parse_dt(job.get("createdAt")),
                    remote=(job.get("workplaceType") == "remote"),
                    employment_type=(cats.get("commitment") or "full-time").lower(),
                    salary_min=salary.get("min"), salary_max=salary.get("max"), ats_platform="Lever",
                )


class AshbyConnector(Connector):
    name = "ashby"

    def __init__(self, orgs: list[str], **kw):
        super().__init__(**kw)
        self.orgs = orgs

    def fetch(self):
        for org in self.orgs:
            try:
                data = self._get_json(f"https://api.ashbyhq.com/posting-api/job-board/{org}",
                                      includeCompensation="true")
            except Exception as exc:
                logger.warning("ashby org %s failed: %s", org, exc)
                self._board_error(org, exc)
                continue
            self._board_ok(org, 0)
            for job in data.get("jobs", []):
                if job.get("isListed") is False:
                    continue
                self._board_ok(org)
                yield RawPosting(
                    source=self.name, source_id=job.get("id", ""), title=job.get("title", ""),
                    company=org.replace("-", " ").title(), location=job.get("location", ""),
                    url=job.get("jobUrl", ""),
                    description=job.get("descriptionPlain") or clean_html(job.get("descriptionHtml", "")),
                    posted_at=_parse_dt(job.get("publishedAt")), remote=bool(job.get("isRemote")),
                    employment_type=(job.get("employmentType") or "FullTime").lower(), ats_platform="Ashby",
                )


class RemotiveConnector(Connector):
    name = "remotive"

    def __init__(self, limit: int = 300, **kw):
        super().__init__(**kw)
        self.limit = limit

    def fetch(self):
        try:
            data = self._get_json("https://remotive.com/api/remote-jobs", limit=self.limit)
        except Exception as exc:
            logger.warning("remotive failed: %s", exc)
            return
        for job in data.get("jobs", []):
            yield RawPosting(
                source=self.name, source_id=str(job.get("id", "")), title=job.get("title", ""),
                company=job.get("company_name", ""),
                location=job.get("candidate_required_location") or "Remote", url=job.get("url", ""),
                description=clean_html(job.get("description", "")),
                posted_at=_parse_dt(job.get("publication_date")), remote=True,
                employment_type=(job.get("job_type") or "full_time").replace("_", "-"),
                skills=[t.lower() for t in job.get("tags", []) if isinstance(t, str)],
            )


class ArbeitnowConnector(Connector):
    name = "arbeitnow"

    def __init__(self, pages: int = 2, **kw):
        super().__init__(**kw)
        self.pages = pages

    def fetch(self):
        for page in range(1, self.pages + 1):
            try:
                data = self._get_json("https://www.arbeitnow.com/api/job-board-api", page=page)
            except Exception as exc:
                logger.warning("arbeitnow page %s failed: %s", page, exc)
                return
            for job in data.get("data", []):
                yield RawPosting(
                    source=self.name, source_id=job.get("slug", ""), title=job.get("title", ""),
                    company=job.get("company_name", ""), location=job.get("location", ""),
                    url=job.get("url", ""), description=clean_html(job.get("description", "")),
                    posted_at=_parse_dt(job.get("created_at")), remote=bool(job.get("remote")),
                    skills=[t.lower() for t in job.get("tags", []) if isinstance(t, str)],
                )


class SeedConnector(Connector):
    """Bundled sample postings so matching works with no network access."""
    name = "seed"

    def __init__(self, **kw):
        self.client = None

    def fetch(self):
        from app.job_recommender import SAMPLE_JOBS
        now = datetime.utcnow()
        for idx, job in enumerate(SAMPLE_JOBS):
            yield RawPosting(
                source=self.name, source_id=f"seed-{idx}", title=job["title"], company=job["company"],
                location=job.get("location", ""), url=job.get("url", ""),
                description=job.get("description", "").strip(), posted_at=now,
                skills=list(job.get("required_skills", [])),
            )


class WorkdayConnector(Connector):
    """Workday career sites expose a public JSON feed (the one their own careers pages call):
    POST https://<host>/wday/cxs/<tenant>/<site>/jobs, then GET <site><externalPath> per posting.
    Boards are "<host>/<tenant>/<site>", e.g. "nvidia.wd5.myworkdayjobs.com/nvidia/NVIDIAExternalCareerSite"."""
    name = "workday"
    PAGE = 20

    def __init__(self, boards: list[str], max_jobs: int = 100, **kw):
        super().__init__(**kw)
        self.boards = boards
        self.max_jobs = max_jobs

    @staticmethod
    def parse_board(board: str) -> Optional[tuple[str, str, str]]:
        parts = [p for p in board.replace("https://", "").replace("http://", "").split("/") if p]
        if len(parts) != 3 or not parts[0].endswith((".myworkdayjobs.com", ".myworkdaysite.com")):
            return None
        return parts[0], parts[1], parts[2]

    def fetch(self):
        for board in self.boards:
            parsed = self.parse_board(board)
            if not parsed:
                logger.warning("workday board %r is not <host>/<tenant>/<site>", board)
                self._board_error(board, ValueError("Expected <host>/<tenant>/<site>"))
                continue
            host, tenant, site = parsed
            base = f"https://{host}/wday/cxs/{tenant}/{site}"
            company = tenant.replace("-", " ").title()
            offset = 0
            while offset < self.max_jobs:
                try:
                    resp = self.client.post(f"{base}/jobs", json={"appliedFacets": {}, "limit": self.PAGE,
                                                                   "offset": offset, "searchText": ""})
                    resp.raise_for_status()
                    page = resp.json()
                except Exception as exc:
                    logger.warning("workday board %s failed: %s", board, exc)
                    self._board_error(board, exc)
                    break
                postings = page.get("jobPostings") or []
                self._board_ok(board, 0)
                for item in postings:
                    path = item.get("externalPath") or ""
                    try:
                        info = self._get_json(f"{base}{path}").get("jobPostingInfo") or {}
                    except Exception as exc:
                        logger.warning("workday posting %s failed: %s", path, exc)
                        continue
                    location = info.get("location") or item.get("locationsText", "")
                    self._board_ok(board)
                    yield RawPosting(
                        source=self.name, source_id=info.get("jobReqId") or info.get("id") or path,
                        title=info.get("title") or item.get("title", ""), company=company, location=location,
                        url=info.get("externalUrl") or f"https://{host}/{site}{path}",
                        description=clean_html(info.get("jobDescription", "")),
                        posted_at=_parse_dt(info.get("startDate")),
                        remote="remote" in f"{info.get('remoteType', '')} {location}".lower(),
                        employment_type=(info.get("timeType") or "full-time").lower().replace(" ", "-"),
                        ats_platform="Workday",
                    )
                offset += self.PAGE
                if len(postings) < self.PAGE or offset >= int(page.get("total") or 0):
                    break


class SmartRecruitersConnector(Connector):
    """SmartRecruiters public Posting API (documented, no key): /v1/companies/<id>/postings."""
    name = "smartrecruiters"
    API = "https://api.smartrecruiters.com/v1/companies"

    def __init__(self, companies: list[str], max_jobs: int = 200, **kw):
        super().__init__(**kw)
        self.companies = companies
        self.max_jobs = max_jobs

    def fetch(self):
        for company in self.companies:
            offset = 0
            while offset < self.max_jobs:
                try:
                    page = self._get_json(f"{self.API}/{company}/postings", limit=100, offset=offset)
                except Exception as exc:
                    logger.warning("smartrecruiters company %s failed: %s", company, exc)
                    self._board_error(company, exc)
                    break
                content = page.get("content") or []
                self._board_ok(company, 0)
                for item in content:
                    try:
                        detail = self._get_json(f"{self.API}/{company}/postings/{item.get('id')}")
                    except Exception as exc:
                        logger.warning("smartrecruiters posting %s failed: %s", item.get("id"), exc)
                        continue
                    sections = (detail.get("jobAd") or {}).get("sections") or {}
                    text = "\n".join(clean_html((sections.get(k) or {}).get("text", ""))
                                     for k in ("jobDescription", "qualifications", "additionalInformation"))
                    loc = item.get("location") or {}
                    self._board_ok(company)
                    location = ", ".join(p for p in (loc.get("city"), loc.get("region"), loc.get("country", "").upper()) if p)
                    yield RawPosting(
                        source=self.name, source_id=str(item.get("id", "")), title=item.get("name", ""),
                        company=(item.get("company") or {}).get("name") or company,
                        location=location or ("Remote" if loc.get("remote") else ""),
                        url=detail.get("postingUrl") or detail.get("applyUrl") or "",
                        description=text.strip(), posted_at=_parse_dt(item.get("releasedDate")),
                        remote=bool(loc.get("remote")),
                        employment_type=((item.get("typeOfEmployment") or {}).get("label") or "full-time").lower(),
                        ats_platform="SmartRecruiters",
                    )
                offset += len(content)
                if len(content) < 100 or offset >= int(page.get("totalFound") or 0):
                    break


class AdzunaConnector(Connector):
    """Adzuna job search API (free key: developer.adzuna.com). Covers India and ~20 other countries,
    including listings that also appear on portals like Naukri. Results carry a description snippet
    and a redirect link to the original posting."""
    name = "adzuna"
    API = "https://api.adzuna.com/v1/api/jobs"

    def __init__(self, app_id: str, app_key: str, countries: list[str], queries: list[str],
                 max_days_old: int = 7, pages: int = 1, **kw):
        super().__init__(**kw)
        self.app_id, self.app_key = app_id, app_key
        self.countries, self.queries = countries, queries or [""]
        self.max_days_old, self.pages = max_days_old, pages

    def fetch(self):
        for country in self.countries:
            for query in self.queries:
                for page in range(1, self.pages + 1):
                    try:
                        data = self._get_json(f"{self.API}/{country}/search/{page}", app_id=self.app_id,
                                              app_key=self.app_key, results_per_page=50, what=query,
                                              max_days_old=self.max_days_old, sort_by="date")
                    except Exception as exc:
                        logger.warning("adzuna %s/%r failed: %s", country, query, exc)
                        break
                    results = data.get("results") or []
                    for job in results:
                        yield RawPosting(
                            source=self.name, source_id=str(job.get("id", "")), title=job.get("title", ""),
                            company=(job.get("company") or {}).get("display_name", ""),
                            location=(job.get("location") or {}).get("display_name", ""),
                            url=job.get("redirect_url", ""), description=clean_html(job.get("description", "")),
                            posted_at=_parse_dt(job.get("created")),
                            salary_min=int(job["salary_min"]) if job.get("salary_min") else None,
                            salary_max=int(job["salary_max"]) if job.get("salary_max") else None,
                            employment_type=(job.get("contract_time") or "full_time").replace("_", "-"),
                        )
                    if len(results) < 50:
                        break


class JoobleConnector(Connector):
    """Jooble REST API (free key: jooble.org/api/about). Aggregates many boards, including Indian ones."""
    name = "jooble"

    def __init__(self, api_key: str, queries: list[str], locations: list[str], **kw):
        super().__init__(**kw)
        self.api_key = api_key
        self.queries, self.locations = queries or [""], locations or [""]

    def fetch(self):
        for location in self.locations:
            for query in self.queries:
                try:
                    resp = self.client.post(f"https://jooble.org/api/{self.api_key}",
                                            json={"keywords": query, "location": location, "page": "1"})
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as exc:
                    logger.warning("jooble %r/%r failed: %s", location, query, exc)
                    continue
                for job in data.get("jobs") or []:
                    yield RawPosting(
                        source=self.name, source_id=str(job.get("id", "")), title=clean_html(job.get("title", "")),
                        company=job.get("company", ""), location=job.get("location", ""), url=job.get("link", ""),
                        description=clean_html(job.get("snippet", "")), posted_at=_parse_dt(job.get("updated")),
                        employment_type=(job.get("type") or "full-time").lower(),
                    )


class HimalayasConnector(Connector):
    """Himalayas public remote-jobs API (no key; 20 jobs per request)."""
    name = "himalayas"

    def __init__(self, max_jobs: int = 100, **kw):
        super().__init__(**kw)
        self.max_jobs = max_jobs

    def fetch(self):
        for offset in range(0, self.max_jobs, 20):
            try:
                data = self._get_json("https://himalayas.app/jobs/api", limit=20, offset=offset)
            except Exception as exc:
                logger.warning("himalayas offset %s failed: %s", offset, exc)
                return
            jobs = data.get("jobs") or []
            for job in jobs:
                regions = job.get("locationRestrictions") or []
                yield RawPosting(
                    source=self.name, source_id=str(job.get("guid") or job.get("applicationLink", "")),
                    title=job.get("title", ""), company=job.get("companyName", ""),
                    location="Remote" + (f" ({', '.join(regions[:3])})" if regions else ""),
                    url=job.get("applicationLink", ""), description=clean_html(job.get("description", "")),
                    posted_at=_parse_dt(job.get("pubDate")), remote=True,
                    salary_min=job.get("minSalary") or None, salary_max=job.get("maxSalary") or None,
                    employment_type=(job.get("employmentType") or "full-time").lower().replace(" ", "-"),
                )
            if len(jobs) < 20:
                return


def _csv_env(name: str, default: str) -> list[str]:
    return [s.strip() for s in os.getenv(name, default).split(",") if s.strip()]


BOARD_ATS = ("greenhouse", "lever", "ashby", "workday", "smartrecruiters")
_BOARD_ENV = {
    "greenhouse": ("GREENHOUSE_BOARDS", DEFAULT_GREENHOUSE), "lever": ("LEVER_COMPANIES", DEFAULT_LEVER),
    "ashby": ("ASHBY_ORGS", DEFAULT_ASHBY), "workday": ("WORKDAY_BOARDS", ""),
    "smartrecruiters": ("SMARTRECRUITERS_COMPANIES", ""),
}


def seed_boards(db) -> int:
    """Copy the env/default board lists into the DB the first time. After that the DB is the source of truth
    (env additions are still picked up, but removing a board is done through the admin API)."""
    from app.career.models import CompanyBoard
    existing = {(b.ats, b.slug.lower()) for b in db.query(CompanyBoard.ats, CompanyBoard.slug).all()}
    added = 0
    for ats, (env, default) in _BOARD_ENV.items():
        source = "env" if os.getenv(env) else "default"
        for slug in _csv_env(env, default):
            if (ats, slug.lower()) not in existing:
                db.add(CompanyBoard(ats=ats, slug=slug, source=source))
                existing.add((ats, slug.lower()))
                added += 1
    if added:
        db.commit()
    return added


def board_lists(db) -> dict[str, list[str]]:
    from app.career.models import CompanyBoard
    seed_boards(db)
    out: dict[str, list[str]] = {ats: [] for ats in BOARD_ATS}
    for board in db.query(CompanyBoard).filter(CompanyBoard.active.is_(True)).order_by(CompanyBoard.created_at).all():
        out.setdefault(board.ats, []).append(board.slug)
    return out


def default_connectors(include_network: bool = True, db=None) -> list[Connector]:
    connectors: list[Connector] = [SeedConnector()]
    if include_network and os.getenv("JOB_INGEST_NETWORK", "1") != "0":
        if db is not None:
            boards = board_lists(db)
        else:
            boards = {ats: _csv_env(env, default) for ats, (env, default) in _BOARD_ENV.items()}
        connectors += [
            GreenhouseConnector(boards["greenhouse"]),
            LeverConnector(boards["lever"]),
            AshbyConnector(boards["ashby"]),
            WorkdayConnector(boards["workday"], max_jobs=int(os.getenv("WORKDAY_MAX_JOBS_PER_BOARD", "100"))),
            SmartRecruitersConnector(boards["smartrecruiters"]),
            RemotiveConnector(),
            ArbeitnowConnector(),
        ]
        connectors += api_connectors()
    return connectors


def api_connectors() -> list[Connector]:
    """Key-based job APIs (enabled only when their keys are set) plus keyless Himalayas."""
    out: list[Connector] = []
    if os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_APP_KEY"):
        out.append(AdzunaConnector(
            os.getenv("ADZUNA_APP_ID", ""), os.getenv("ADZUNA_APP_KEY", ""),
            countries=_csv_env("ADZUNA_COUNTRIES", "in"),
            queries=_csv_env("JOB_API_QUERIES", "software engineer,data analyst,data scientist,product manager"),
            max_days_old=int(os.getenv("ADZUNA_MAX_DAYS_OLD", "7"))))
    if os.getenv("JOOBLE_API_KEY"):
        out.append(JoobleConnector(
            os.getenv("JOOBLE_API_KEY", ""),
            queries=_csv_env("JOB_API_QUERIES", "software engineer,data analyst,data scientist,product manager"),
            locations=_csv_env("JOOBLE_LOCATIONS", "India")))
    if os.getenv("HIMALAYAS_ENABLED", "1") != "0":
        out.append(HimalayasConnector(max_jobs=int(os.getenv("HIMALAYAS_MAX_JOBS", "100"))))
    return out


def upsert_posting(db, raw: RawPosting) -> str:
    """Insert or refresh one posting. Returns 'new', 'updated' or 'skipped'."""
    if not raw.title or not raw.company:
        return "skipped"
    fp = fingerprint(raw.title, raw.company, raw.location)
    existing = db.query(PlatformJob).filter(PlatformJob.fingerprint == fp).first()
    payload = {
        "title": raw.title.strip()[:300], "company": raw.company.strip()[:200],
        "location": (raw.location or "").strip()[:200], "url": raw.url, "description": raw.description[:20000],
        "posted_at": raw.posted_at, "remote": raw.remote, "salary_min": raw.salary_min,
        "salary_max": raw.salary_max, "ats_platform": raw.ats_platform, "skills": raw.skills,
    }
    enriched = enrich(payload)
    if existing:
        # Same posting seen again (possibly from another source): refresh liveness only.
        existing.active = True
        if len(raw.description) > len(existing.description or ""):
            existing.description = payload["description"]
            for key, value in enriched.items():
                setattr(existing, key, value)
            existing.embedding = vectors.dumps(vectors.embed(f"{raw.title}\n{raw.description}"))
        return "updated"
    job = PlatformJob(
        fingerprint=fp, source=raw.source, source_id=raw.source_id, title=payload["title"],
        company=payload["company"], location=payload["location"], url=raw.url,
        description=payload["description"], employment_type=raw.employment_type or "full-time",
        posted_at=raw.posted_at or datetime.utcnow(), ingested_at=datetime.utcnow(),
        embedding=vectors.dumps(vectors.embed(f"{raw.title}\n{raw.description}")), **enriched,
    )
    db.add(job)
    db.flush()  # make the fingerprint visible to later postings in this batch
    return "new"


def run_ingestion(db, connectors: Optional[list[Connector]] = None) -> dict:
    connectors = connectors if connectors is not None else default_connectors()
    stats = {"new": 0, "updated": 0, "skipped": 0, "errors": 0, "by_source": {}}
    for connector in connectors:
        source_new = 0
        try:
            for raw in connector.fetch():
                # Commit per posting: connectors fetch from the network between postings, and an open write
                # transaction would hold SQLite's write lock (blocking signups etc.) for that whole time. It also
                # means a bad posting only rolls back itself.
                try:
                    result = upsert_posting(db, raw)
                    db.commit()
                except Exception as exc:
                    logger.warning("posting from %s failed: %s", connector.name, exc)
                    stats["errors"] += 1
                    db.rollback()
                    continue
                stats[result] += 1
                source_new += result == "new"
            db.commit()
        except Exception as exc:
            logger.warning("connector %s failed: %s", connector.name, exc)
            stats["errors"] += 1
            db.rollback()
        stats["by_source"][connector.name] = source_new
        if getattr(connector, "board_stats", None):
            _record_board_stats(db, connector.name, connector.board_stats)
    vectors.job_index.invalidate()
    logger.info("Job ingestion finished: %s", stats)
    return stats


def _record_board_stats(db, ats: str, board_stats: dict) -> None:
    from app.career.models import CompanyBoard
    try:
        rows = {b.slug.lower(): b for b in db.query(CompanyBoard).filter(CompanyBoard.ats == ats).all()}
        for slug, st in board_stats.items():
            row = rows.get(slug.lower())
            if row is None:
                continue
            row.last_crawled_at = datetime.utcnow()
            row.last_count = st["count"]
            row.last_status = f"error: {st['error']}" if st["error"] else "ok"
        db.commit()
    except Exception as exc:  # board bookkeeping must never break ingestion
        logger.warning("Could not record board stats for %s: %s", ats, exc)
        db.rollback()


_seed_lock = threading.Lock()


def ensure_seeded(db) -> None:
    # Count only active jobs: private postings imported from a user's browser don't make the feed non-empty.
    active = db.query(PlatformJob.id).filter(PlatformJob.active.is_(True))
    if active.first() is not None:
        return
    with _seed_lock:  # concurrent first requests must not seed twice
        if active.first() is None:
            run_ingestion(db, [SeedConnector()])
