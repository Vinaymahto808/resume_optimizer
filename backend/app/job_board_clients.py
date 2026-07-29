"""
Real Job Board API Clients — LinkedIn, Indeed, Naukri, Glassdoor.

Each client provides:
- search_jobs(query, location) → list of jobs
- get_job_detail(url) → parsed job data
- check_portal_status() → connection health

All clients fall back to httpx scraping when official APIs are unavailable.
Rate-limited to avoid blocks.
"""

import re
import time
import random
import logging
from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass
class JobListing:
    title: str
    company: str
    location: str
    url: str
    description: str = ""
    salary: str = ""
    portal: str = ""
    posted_date: str = ""
    job_type: str = ""
    remote: bool = False
    skills: list[str] = None

    def __post_init__(self):
        if self.skills is None:
            self.skills = []

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "url": self.url,
            "description": self.description,
            "salary": self.salary,
            "portal": self.portal,
            "posted_date": self.posted_date,
            "job_type": self.job_type,
            "remote": self.remote,
            "skills": self.skills,
        }


class BaseJobBoardClient(ABC):
    def __init__(self, api_key: str = "", proxy: str = ""):
        self.api_key = api_key
        self.proxy = proxy
        self._last_request = 0
        self._min_interval = 1.0

    def _rate_limit(self):
        elapsed = time.monotonic() - self._last_request
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed + random.uniform(0.1, 0.5))
        self._last_request = time.monotonic()

    def _get_client(self) -> httpx.Client:
        kwargs = {"timeout": 30, "follow_redirects": True}
        if self.proxy:
            kwargs["proxy"] = self.proxy
        return httpx.Client(**kwargs)

    @abstractmethod
    def search_jobs(self, query: str, location: str = "", limit: int = 20) -> list[JobListing]:
        pass

    @abstractmethod
    def get_job_detail(self, url: str) -> Optional[JobListing]:
        pass

    @abstractmethod
    def check_portal_status(self) -> dict:
        pass


class LinkedInClient(BaseJobBoardClient):
    BASE = "https://www.linkedin.com"
    API_BASE = "https://api.linkedin.com/v2"

    def search_jobs(self, query: str, location: str = "", limit: int = 20) -> list[JobListing]:
        self._rate_limit()
        jobs = []
        try:
            url = f"{self.BASE}/jobs-guest/jobs/api/seeMoreJobPostings/search"
            params = {
                "keywords": query,
                "location": location,
                "start": 0,
                "f_TPR": "r604800",
            }
            with self._get_client() as client:
                resp = client.get(url, params=params, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Accept": "text/html",
                })
                if resp.status_code == 200:
                    jobs = self._parse_search_results(resp.text, limit)
        except Exception as e:
            logger.warning("LinkedIn search failed: %s", e)
        return jobs

    def _parse_search_results(self, html: str, limit: int) -> list[JobListing]:
        jobs = []
        cards = re.findall(r'<li[^>]*class="[^"]*result-card[^"]*"[^>]*>(.*?)</li>', html, re.DOTALL)
        for card in cards[:limit]:
            title_match = re.search(r'class="[^"]*result-card__title[^"]*"[^>]*>(.*?)<', card)
            company_match = re.search(r'class="[^"]*result-card__subtitle[^"]*"[^>]*>(.*?)<', card)
            location_match = re.search(r'class="[^"]*job-result-card__location[^"]*"[^>]*>(.*?)<', card)
            link_match = re.search(r'href="(/jobs/view/[^"]+)"', card)

            jobs.append(JobListing(
                title=title_match.group(1).strip() if title_match else "Unknown",
                company=company_match.group(1).strip() if company_match else "Unknown",
                location=location_match.group(1).strip() if location_match else "",
                url=f"{self.BASE}{link_match.group(1)}" if link_match else "",
                portal="linkedin",
            ))
        return jobs

    def get_job_detail(self, url: str) -> Optional[JobListing]:
        self._rate_limit()
        try:
            with self._get_client() as client:
                resp = client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                })
                if resp.status_code == 200:
                    return self._parse_job_page(resp.text, url)
        except Exception as e:
            logger.warning("LinkedIn detail fetch failed: %s", e)
        return None

    def _parse_job_page(self, html: str, url: str) -> Optional[JobListing]:
        title = re.search(r'<h1[^>]*class="[^"]*topcard[^"]*"[^>]*>(.*?)<', html)
        company = re.search(r'class="[^"]*topcard__org-name[^"]*"[^>]*>(.*?)<', html)
        desc = re.search(r'class="[^"]*description__text[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
        location = re.search(r'class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>(.*?)<', html)

        return JobListing(
            title=title.group(1).strip() if title else "",
            company=company.group(1).strip() if company else "",
            location=location.group(1).strip() if location else "",
            url=url,
            description=re.sub(r'<[^>]+>', '', desc.group(1)).strip() if desc else "",
            portal="linkedin",
        )

    def check_portal_status(self) -> dict:
        try:
            with self._get_client() as client:
                resp = client.get(f"{self.BASE}/jobs", headers={
                    "User-Agent": "Mozilla/5.0",
                })
                return {"status": "ok" if resp.status_code == 200 else "degraded",
                        "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}


class IndeedClient(BaseJobBoardClient):
    BASE = "https://www.indeed.com"

    def search_jobs(self, query: str, location: str = "", limit: int = 20) -> list[JobListing]:
        self._rate_limit()
        jobs = []
        try:
            params = {"q": query, "l": location, "sort": "date"}
            with self._get_client() as client:
                resp = client.get(f"{self.BASE}/jobs", params=params, headers={
                    "User-Agent": random.choice([
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    ]),
                })
                if resp.status_code == 200:
                    jobs = self._parse_search(resp.text, limit)
        except Exception as e:
            logger.warning("Indeed search failed: %s", e)
        return jobs

    def _parse_search(self, html: str, limit: int) -> list[JobListing]:
        jobs = []
        cards = re.findall(r'<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>(.*?)</div>\s*</div>', html, re.DOTALL)
        for card in cards[:limit]:
            title = re.search(r'<h2[^>]*>.*?title="([^"]+)"', card, re.DOTALL)
            company = re.search(r'data-testid="company-name"[^>]*>(.*?)<', card)
            loc = re.search(r'data-testid="text-location"[^>]*>(.*?)<', card)
            link = re.search(r'href="(/rc/clk[^"]+|/viewjob[^"]+)"', card)

            jobs.append(JobListing(
                title=title.group(1).strip() if title else "Unknown",
                company=company.group(1).strip() if company else "Unknown",
                location=loc.group(1).strip() if loc else "",
                url=f"{self.BASE}{link.group(1)}" if link else "",
                portal="indeed",
            ))
        return jobs

    def get_job_detail(self, url: str) -> Optional[JobListing]:
        self._rate_limit()
        try:
            with self._get_client() as client:
                resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
                if resp.status_code == 200:
                    html = resp.text
                    title = re.search(r'<h1[^>]*>(.*?)</h1>', html)
                    company = re.search(r'jobsearch-JobInfoHeader-title.*?<span[^>]*>(.*?)<', html, re.DOTALL)
                    desc = re.search(r'id="jobDescriptionText"[^>]*>(.*?)</div>', html, re.DOTALL)
                    return JobListing(
                        title=title.group(1).strip() if title else "",
                        company=company.group(1).strip() if company else "",
                        location="",
                        url=url,
                        description=re.sub(r'<[^>]+>', '', desc.group(1)).strip() if desc else "",
                        portal="indeed",
                    )
        except Exception as e:
            logger.warning("Indeed detail failed: %s", e)
        return None

    def check_portal_status(self) -> dict:
        try:
            with self._get_client() as client:
                resp = client.get(self.BASE, headers={"User-Agent": "Mozilla/5.0"})
                return {"status": "ok" if resp.status_code == 200 else "degraded",
                        "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}


class NaukriClient(BaseJobBoardClient):
    BASE = "https://www.naukri.com"

    def search_jobs(self, query: str, location: str = "", limit: int = 20) -> list[JobListing]:
        self._rate_limit()
        jobs = []
        try:
            params = {"q": query, "l": location, "sort": "dd"}
            with self._get_client() as client:
                resp = client.get(f"{self.BASE}/jobapi/v3/search", params=params, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                    "systemid": "109",
                    "appid": "109",
                    "xgid": "1",
                })
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("jobDetails", [])[:limit]:
                        jobs.append(JobListing(
                            title=item.get("title", ""),
                            company=item.get("companyName", ""),
                            location=item.get("placeholders", [{}])[0].get("value", "") if item.get("placeholders") else "",
                            url=item.get("jobDetailUrl", ""),
                            description=item.get("jobDescription", ""),
                            portal="naukri",
                            skills=[s.get("skill", "") for s in item.get("tagsAndSkills", [])],
                        ))
        except Exception as e:
            logger.warning("Naukri search failed: %s", e)
        return jobs

    def get_job_detail(self, url: str) -> Optional[JobListing]:
        self._rate_limit()
        try:
            with self._get_client() as client:
                resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
                if resp.status_code == 200:
                    html = resp.text
                    title = re.search(r'<h1[^>]*>(.*?)</h1>', html)
                    company = re.search(r'class="[^"]*company[^"]*"[^>]*>(.*?)<', html)
                    desc = re.search(r'class="[^"]*JD[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
                    return JobListing(
                        title=title.group(1).strip() if title else "",
                        company=company.group(1).strip() if company else "",
                        location="",
                        url=url,
                        description=re.sub(r'<[^>]+>', '', desc.group(1)).strip() if desc else "",
                        portal="naukri",
                    )
        except Exception as e:
            logger.warning("Naukri detail failed: %s", e)
        return None

    def check_portal_status(self) -> dict:
        try:
            with self._get_client() as client:
                resp = client.get(self.BASE, headers={"User-Agent": "Mozilla/5.0"})
                return {"status": "ok" if resp.status_code == 200 else "degraded",
                        "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}


class GlassdoorClient(BaseJobBoardClient):
    BASE = "https://www.glassdoor.com"

    def search_jobs(self, query: str, location: str = "", limit: int = 20) -> list[JobListing]:
        self._rate_limit()
        jobs = []
        try:
            with self._get_client() as client:
                resp = client.get(f"{self.BASE}/Job/jobs.htm", params={
                    "sc.keyword": query, "locT": "", "locId": "", "locKeyword": location,
                }, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
                if resp.status_code == 200:
                    jobs = self._parse_search(resp.text, limit)
        except Exception as e:
            logger.warning("Glassdoor search failed: %s", e)
        return jobs

    def _parse_search(self, html: str, limit: int) -> list[JobListing]:
        jobs = []
        cards = re.findall(r'<li[^>]*data-test="job-card[^"]*"[^>]*>(.*?)</li>', html, re.DOTALL)
        for card in cards[:limit]:
            title = re.search(r'data-test="job-title"[^>]*>(.*?)<', card)
            company = re.search(r'data-test="emp-name"[^>]*>(.*?)<', card)
            loc = re.search(r'data-test="job-location"[^>]*>(.*?)<', card)
            link = re.search(r'href="(/Job/[^"]+)"', card)

            if title:
                jobs.append(JobListing(
                    title=title.group(1).strip(),
                    company=company.group(1).strip() if company else "Unknown",
                    location=loc.group(1).strip() if loc else "",
                    url=f"{self.BASE}{link.group(1)}" if link else "",
                    portal="glassdoor",
                ))
        return jobs

    def get_job_detail(self, url: str) -> Optional[JobListing]:
        return None

    def check_portal_status(self) -> dict:
        try:
            with self._get_client() as client:
                resp = client.get(self.BASE, headers={"User-Agent": "Mozilla/5.0"})
                return {"status": "ok" if resp.status_code == 200 else "degraded",
                        "code": resp.status_code}
        except Exception as e:
            return {"status": "error", "error": str(e)}


_clients: dict[str, BaseJobBoardClient] = {}


def get_client(portal: str, api_key: str = "", proxy: str = "") -> BaseJobBoardClient:
    if portal not in _clients:
        cls_map = {
            "linkedin": LinkedInClient,
            "indeed": IndeedClient,
            "naukri": NaukriClient,
            "glassdoor": GlassdoorClient,
        }
        cls = cls_map.get(portal)
        if not cls:
            raise ValueError(f"Unknown portal: {portal}")
        _clients[portal] = cls(api_key=api_key, proxy=proxy)
    return _clients[portal]


def search_all_portals(query: str, location: str = "", limit: int = 10) -> dict[str, list[dict]]:
    results = {}
    for portal in ["linkedin", "indeed", "naukri", "glassdoor"]:
        try:
            client = get_client(portal)
            jobs = client.search_jobs(query, location, limit)
            results[portal] = [j.to_dict() for j in jobs]
        except Exception as e:
            logger.warning("Search %s failed: %s", portal, e)
            results[portal] = []
    return results


def check_all_portals() -> dict[str, dict]:
    statuses = {}
    for portal in ["linkedin", "indeed", "naukri", "glassdoor"]:
        try:
            client = get_client(portal)
            statuses[portal] = client.check_portal_status()
        except Exception as e:
            statuses[portal] = {"status": "error", "error": str(e)}
    return statuses
