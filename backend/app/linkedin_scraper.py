import re
import requests
from typing import Optional

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0",
]

JINA_READER_URL = "https://r.jina.ai/http://"

HEADERS = {
    "User-Agent": USER_AGENTS[0],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def extract_username(url: str) -> Optional[str]:
    match = re.search(r"linkedin\.com/in/([^/?#]+)", url.lower())
    return match.group(1) if match else None


def fetch_profile_text(url: str) -> dict:
    username = extract_username(url)
    if not username:
        return {
            "success": False,
            "error": "Invalid LinkedIn URL. Use format: https://linkedin.com/in/username",
            "username": None,
        }

    result = {
        "success": False,
        "error": None,
        "username": username,
        "profile_url": f"https://www.linkedin.com/in/{username}/",
        "text": None,
        "source": None,
    }

    strategies = [
        ("Direct fetch", lambda u: _try_direct_fetch(u)),
        ("Google cache", lambda u: _try_google_cache(u)),
        ("Proxy fetch", lambda u: _try_proxy_fetch(u)),
        ("Textise dot iitty", lambda u: _try_textise_fetch(u)),
    ]

    for strategy_name, strategy_fn in strategies:
        try:
            data = strategy_fn(username)
            if data and data.get("text"):
                result["success"] = True
                result["text"] = data["text"]
                result["source"] = strategy_name
                result["headline"] = data.get("headline", "")
                result["name"] = data.get("name", "")
                return result
        except Exception as e:
            result["error"] = str(e)

    result["error"] = (
        "LinkedIn blocks automated profile fetching. "
        "Please copy your About section manually:\n"
        "1. Open your LinkedIn profile\n"
        "2. Click the 'More' button on your profile card\n"
        "3. Select 'Save to PDF' to get all your content\n"
        "4. Or simply copy the text from your About section and paste it below"
    )
    return result


def _try_direct_fetch(username: str) -> Optional[dict]:
    url = f"https://www.linkedin.com/in/{username}/overlay/about/"
    resp = requests.get(url, headers=HEADERS, timeout=15)

    if resp.status_code != 200:
        return None

    text = resp.text

    about_match = re.search(
        r'<section[^>]*class="[^"]*core-section-container[^"]*"[^>]*>.*?'
        r'<p[^>]*class="[^"]*break-words[^"]*"[^>]*>(.*?)</p>',
        text, re.DOTALL,
    )
    extracted_text = None
    if about_match:
        extracted_text = re.sub(r"<[^>]+>", "", about_match.group(1)).strip()
        extracted_text = html_unescape(extracted_text)

    if extracted_text and len(extracted_text) > 50:
        return {
            "text": extracted_text,
            "headline": "",
            "name": "",
        }

    return None


def _try_google_cache(username: str) -> Optional[dict]:
    url = f"https://webcache.googleusercontent.com/search?q=cache:https://www.linkedin.com/in/{username}/"
    resp = requests.get(url, headers=HEADERS, timeout=15)

    if resp.status_code != 200:
        return None

    text = resp.text

    about_match = re.search(
        r'class="[^"]*core-section-container__content[^"]*"[^>]*>(.*?)</section>',
        text, re.DOTALL,
    )

    if not about_match:
        return None

    extracted_text = re.sub(r"<[^>]+>", "", about_match.group(1)).strip()
    extracted_text = html_unescape(extracted_text)

    if extracted_text and len(extracted_text) > 50:
        return {"text": extracted_text, "headline": "", "name": ""}

    return None


def _try_proxy_fetch(username: str) -> Optional[dict]:
    import random
    url = f"https://www.linkedin.com/in/{username}/overlay/about/"
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",
        "DNT": "1",
    }
    resp = requests.get(url, headers=headers, timeout=15)
    if resp.status_code != 200:
        return None
    text = resp.text

    about_match = re.search(
        r'<section[^>]*class="[^"]*core-section-container[^"]*"[^>]*>.*?'
        r'<p[^>]*class="[^"]*break-words[^"]*"[^>]*>(.*?)</p>',
        text, re.DOTALL,
    )
    extracted_text = None
    if about_match:
        extracted_text = re.sub(r"<[^>]+>", "", about_match.group(1)).strip()
        extracted_text = html_unescape(extracted_text)

    if extracted_text and len(extracted_text) > 50:
        return {"text": extracted_text, "headline": "", "name": ""}

    return None


def _try_textise_fetch(username: str) -> Optional[dict]:
    profile_url = f"https://www.linkedin.com/in/{username}/"
    jina_url = f"{JINA_READER_URL}{profile_url}"
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; JinaReader/1.0)",
        "Accept": "text/plain,text/html",
    }
    try:
        resp = requests.get(jina_url, headers=headers, timeout=30)
        if resp.status_code != 200:
            return None
        content = resp.text
        if not content or len(content) < 100:
            return None
        return {"text": content, "headline": "", "name": ""}
    except requests.RequestException:
        return None


def fetch_profile_full(url: str) -> dict:
    username = extract_username(url)
    if not username:
        return {
            "success": False,
            "error": "Invalid LinkedIn URL",
            "username": None,
            "name": "",
            "headline": "",
            "text": "",
            "about": "",
            "skills": [],
            "experience": [],
            "education": [],
            "source": None,
        }

    strategies = [
        ("Direct fetch", lambda u: _try_direct_fetch(u)),
        ("Google cache", lambda u: _try_google_cache(u)),
        ("Proxy fetch", lambda u: _try_proxy_fetch(u)),
        ("Textise dot iitty", lambda u: _try_textise_fetch(u)),
    ]

    best = {
        "success": False,
        "error": None,
        "username": username,
        "name": "",
        "headline": "",
        "text": "",
        "about": "",
        "skills": [],
        "experience": [],
        "education": [],
        "source": None,
    }

    for strategy_name, strategy_fn in strategies:
        try:
            data = strategy_fn(username)
            if data and data.get("text"):
                best["success"] = True
                best["text"] = data["text"]
                best["source"] = strategy_name
                best["name"] = data.get("name", "")
                best["headline"] = data.get("headline", "")
                break
        except Exception as e:
            best["error"] = str(e)

    if best["success"] and best["text"]:
        parsed = parse_linkedin_html(best["text"])
        best["name"] = parsed.get("name") or best["name"]
        best["headline"] = parsed.get("headline") or best["headline"]
        best["about"] = parsed.get("about", "")
        best["skills"] = parsed.get("skills", [])
        best["experience"] = parsed.get("experience", [])
        best["education"] = parsed.get("education", [])

    if not best["success"]:
        best["error"] = (
            "LinkedIn blocks automated profile fetching. "
            "Please copy your About section manually."
        )

    return best


def parse_linkedin_html(html: str) -> dict:
    result = {
        "name": "",
        "headline": "",
        "about": "",
        "skills": [],
        "experience": [],
        "education": [],
    }

    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL)
    if title_match:
        title_text = title_match.group(1).strip()
        title_text = html_unescape(title_text)
        parts = title_text.split(" | ")
        if parts and parts[0]:
            result["name"] = parts[0].strip()
        if len(parts) > 1 and "LinkedIn" not in parts[1]:
            result["headline"] = parts[1].strip()

    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    if h1_match and not result["name"]:
        h1_text = re.sub(r"<[^>]+>", "", h1_match.group(1)).strip()
        h1_text = html_unescape(h1_text)
        if h1_text:
            result["name"] = h1_text

    headline_match = re.search(
        r'<div[^>]*class="[^"]*text-body-medium[^"]*"[^>]*>(.*?)</div>',
        html, re.DOTALL,
    )
    if headline_match:
        hl = re.sub(r"<[^>]+>", "", headline_match.group(1)).strip()
        hl = html_unescape(hl)
        if hl:
            result["headline"] = hl

    about_section = re.search(
        r'<section[^>]*class="[^"]*core-section-container[^"]*"[^>]*>.*?'
        r'<p[^>]*class="[^"]*break-words[^"]*"[^>]*>(.*?)</p>',
        html, re.DOTALL,
    )
    if about_section:
        about_text = re.sub(r"<[^>]+>", "", about_section.group(1)).strip()
        about_text = html_unescape(about_text)
        result["about"] = about_text

    skill_matches = re.findall(
        r'<span[^>]*class="[^"]*visually-hidden[^"]*"[^>]*>(.*?)</span>',
        html, re.DOTALL,
    )
    for sm in skill_matches:
        skill_text = html_unescape(sm.strip())
        if skill_text and skill_text not in result["skills"]:
            result["skills"].append(skill_text)

    exp_sections = re.findall(
        r'<section[^>]*class="[^"]*experience-section[^"]*"[^>]*>(.*?)</section>',
        html, re.DOTALL,
    )
    if not exp_sections:
        exp_sections = re.findall(
            r'<li[^>]*class="[^"]*experience-item[^"]*"[^>]*>(.*?)</li>',
            html, re.DOTALL,
        )
    for exp_html in exp_sections:
        title_m = re.search(r'<h3[^>]*>(.*?)</h3>', exp_html, re.DOTALL)
        company_m = re.search(r'<p[^>]*class="[^"]*"[^>]*>(.*?)</p>', exp_html, re.DOTALL)
        title = ""
        company = ""
        if title_m:
            title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip()
            title = html_unescape(title)
        if company_m:
            company = re.sub(r"<[^>]+>", "", company_m.group(1)).strip()
            company = html_unescape(company)
        if title:
            result["experience"].append({"title": title, "company": company})

    edu_sections = re.findall(
        r'<section[^>]*class="[^"]*education-section[^"]*"[^>]*>(.*?)</section>',
        html, re.DOTALL,
    )
    if not edu_sections:
        edu_sections = re.findall(
            r'<li[^>]*class="[^"]*education-item[^"]*"[^>]*>(.*?)</li>',
            html, re.DOTALL,
        )
    for edu_html in edu_sections:
        school_m = re.search(r'<h3[^>]*>(.*?)</h3>', edu_html, re.DOTALL)
        degree_m = re.search(r'<p[^>]*class="[^"]*"[^>]*>(.*?)</p>', edu_html, re.DOTALL)
        school = ""
        degree = ""
        if school_m:
            school = re.sub(r"<[^>]+>", "", school_m.group(1)).strip()
            school = html_unescape(school)
        if degree_m:
            degree = re.sub(r"<[^>]+>", "", degree_m.group(1)).strip()
            degree = html_unescape(degree)
        if school:
            result["education"].append({"school": school, "degree": degree})

    return result


def scrape_public_profile(url: str) -> dict:
    username = extract_username(url)
    if not username:
        return {
            "success": False,
            "error": "Invalid LinkedIn URL",
            "username": None,
            "name": "",
            "headline": "",
            "about": "",
            "skills": [],
            "experience": [],
            "education": [],
            "raw_text": None,
            "source": None,
        }

    result = {
        "success": False,
        "error": None,
        "username": username,
        "name": "",
        "headline": "",
        "about": "",
        "skills": [],
        "experience": [],
        "education": [],
        "raw_text": None,
        "source": None,
    }

    strategies = [
        ("Direct fetch", lambda u: _try_direct_fetch(u)),
        ("Google cache", lambda u: _try_google_cache(u)),
        ("Proxy fetch", lambda u: _try_proxy_fetch(u)),
        ("Textise dot iitty", lambda u: _try_textise_fetch(u)),
    ]

    raw_text = None
    source = None

    for strategy_name, strategy_fn in strategies:
        try:
            data = strategy_fn(username)
            if data and data.get("text"):
                raw_text = data["text"]
                source = strategy_name
                break
        except Exception:
            continue

    if raw_text:
        result["success"] = True
        result["raw_text"] = raw_text
        result["source"] = source
        parsed = parse_linkedin_html(raw_text)
        result["name"] = parsed.get("name", "")
        result["headline"] = parsed.get("headline", "")
        result["about"] = parsed.get("about", "")
        result["skills"] = parsed.get("skills", [])
        result["experience"] = parsed.get("experience", [])
        result["education"] = parsed.get("education", [])

    if not result["success"]:
        result["error"] = (
            "LinkedIn blocks automated profile fetching. "
            "Please copy your About section manually."
        )

    return result


def html_unescape(text: str) -> str:
    replacements = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#39;": "'", "&#x27;": "'",
        "&#x2F;": "/", "&#xa0;": " ", "&nbsp;": " ",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text
