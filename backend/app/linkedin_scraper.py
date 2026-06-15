import re
import requests
from typing import Optional

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
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


def html_unescape(text: str) -> str:
    replacements = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#39;": "'", "&#x27;": "'",
        "&#x2F;": "/", "&#xa0;": " ", "&nbsp;": " ",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text
