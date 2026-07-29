"""
Browser Automation Service — Playwright-based job portal automation.

Features:
- Headless/headed browser sessions
- CAPTCHA detection (with manual solve pause)
- Proxy rotation support
- Browser fingerprint randomization
- Anti-detection measures (random delays, realistic headers)
- Form filling via LLM-mapped fields
- Session persistence (cookies, localStorage)
- Screenshot capture for debugging
"""

import os
import json
import time
import random
import logging
import hashlib
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

SCREEN_SIZES = [
    (1920, 1080),
    (1440, 900),
    (1366, 768),
    (1536, 864),
    (1280, 720),
]

CAPTCHA_SELECTORS = [
    "[data-sitekey]",
    ".g-recaptcha",
    "#captcha",
    "[id*='captcha']",
    "[class*='captcha']",
    "iframe[src*='recaptcha']",
    "iframe[src*='hcaptcha']",
    ".h-captcha",
]

SIMPLE_FORM_FIELDS = {
    "email": "input[type='email'], input[name*='email'], input[placeholder*='email' i]",
    "password": "input[type='password']",
    "first_name": "input[name*='first' i], input[name*='fname' i]",
    "last_name": "input[name*='last' i], input[name*='lname' i]",
    "phone": "input[type='tel'], input[name*='phone' i]",
    "name": "input[name='name'], input[name='fullName'], input[name='full_name']",
    "resume": "input[type='file']",
}


class BrowserSession:
    def __init__(
        self,
        proxy: str = "",
        headless: bool = True,
        screenshot_dir: str = "uploads/screenshots",
    ):
        self.proxy = proxy
        self.headless = headless
        self.screenshot_dir = screenshot_dir
        self._browser = None
        self._context = None
        self._page = None
        self._fingerprint = self._generate_fingerprint()
        os.makedirs(screenshot_dir, exist_ok=True)

    def _generate_fingerprint(self) -> str:
        data = f"{time.time()}{random.random()}"
        return hashlib.md5(data.encode()).hexdigest()[:16]

    def _random_delay(self, min_s: float = 0.5, max_s: float = 2.0):
        time.sleep(random.uniform(min_s, max_s))

    async def start(self):
        try:
            from playwright.async_api import async_playwright
            self._pw = await async_playwright().start()

            launch_args = {
                "headless": self.headless,
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--no-first-run",
                    "--no-default-browser-check",
                    f"--window-size={random.choice(SCREEN_SIZES)[0]},{random.choice(SCREEN_SIZES)[1]}",
                ],
            }

            if self.proxy:
                launch_args["proxy"] = {"server": self.proxy}

            self._browser = await self._pw.chromium.launch(**launch_args)

            ua = random.choice(USER_AGENTS)
            self._context = await self._browser.new_context(
                user_agent=ua,
                viewport={"width": random.choice(SCREEN_SIZES)[0],
                           "height": random.choice(SCREEN_SIZES)[1]},
                locale="en-US",
                timezone_id="America/New_York",
            )

            await self._context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                window.chrome = {runtime: {}};
            """)

            self._page = await self._context.new_page()
            logger.info("Browser session started fingerprint=%s", self._fingerprint)

        except ImportError:
            logger.error("Playwright not installed. Run: pip install playwright && playwright install")
            raise RuntimeError("Playwright not available")

    async def stop(self):
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if hasattr(self, '_pw') and self._pw:
            await self._pw.stop()
        logger.info("Browser session stopped fingerprint=%s", self._fingerprint)

    async def navigate(self, url: str) -> dict:
        try:
            self._random_delay()
            response = await self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self._page.wait_for_load_state("networkidle", timeout=10000)
            title = await self._page.title()
            return {
                "success": True,
                "url": self._page.url,
                "title": title,
                "status": response.status if response else None,
            }
        except Exception as e:
            logger.error("Navigation failed: %s", e)
            return {"success": False, "error": str(e)}

    async def detect_captcha(self) -> bool:
        for selector in CAPTCHA_SELECTORS:
            try:
                el = await self._page.query_selector(selector)
                if el:
                    logger.warning("CAPTCHA detected: %s", selector)
                    return True
            except Exception:
                continue
        return False

    async def wait_for_captcha_solve(self, timeout: int = 300):
        logger.info("Waiting for manual CAPTCHA solve (timeout=%ds)...", timeout)
        start = time.time()
        while time.time() - start < timeout:
            if not await self.detect_captcha():
                logger.info("CAPTCHA solved")
                return True
            await asyncio.sleep(2)
        logger.warning("CAPTCHA solve timeout")
        return False

    async def fill_simple_form(self, field_data: dict[str, str]) -> dict:
        filled = {}
        for field_name, value in field_data.items():
            selector = SIMPLE_FORM_FIELDS.get(field_name)
            if not selector or not value:
                continue
            try:
                elements = await self._page.query_selector_all(selector)
                for el in elements:
                    is_visible = await el.is_visible()
                    is_enabled = await el.is_enabled()
                    if is_visible and is_enabled:
                        tag = await el.evaluate("e => e.tagName.toLowerCase()")
                        if tag == "select":
                            await el.select_option(label=value)
                        elif tag == "input":
                            input_type = await el.get_attribute("type") or "text"
                            if input_type == "file":
                                if os.path.exists(value):
                                    await el.set_input_files(value)
                            else:
                                await el.click()
                                await el.fill("")
                                await self._random_delay(0.1, 0.3)
                                await el.type(value, delay=random.randint(30, 80))
                        elif tag == "textarea":
                            await el.click()
                            await el.fill(value)
                        filled[field_name] = value
                        self._random_delay(0.2, 0.5)
                        break
            except Exception as e:
                logger.warning("Failed to fill %s: %s", field_name, e)
        return filled

    async def fill_mapped_form(self, mapped_fields: dict[str, str]) -> dict:
        filled = {}
        for selector, value in mapped_fields.items():
            try:
                el = await self._page.query_selector(selector)
                if el and await el.is_visible() and await el.is_enabled():
                    tag = await el.evaluate("e => e.tagName.toLowerCase()")
                    if tag == "select":
                        await el.select_option(label=value)
                    elif tag == "input":
                        input_type = await el.get_attribute("type") or "text"
                        if input_type == "file" and os.path.exists(value):
                            await el.set_input_files(value)
                        else:
                            await el.click()
                            await el.fill("")
                            await el.type(value, delay=random.randint(30, 80))
                    elif tag == "textarea":
                        await el.click()
                        await el.fill(value)
                    filled[selector] = value
                    self._random_delay(0.3, 0.8)
            except Exception as e:
                logger.warning("Failed to fill %s: %s", selector, e)
        return filled

    async def click_button(self, selectors: list[str]) -> bool:
        for selector in selectors:
            try:
                el = await self._page.query_selector(selector)
                if el and await el.is_visible() and await el.is_enabled():
                    self._random_delay(0.3, 1.0)
                    await el.click()
                    await self._random_delay(1.0, 2.0)
                    return True
            except Exception:
                continue
        return False

    async def submit_application(self, submit_selectors: list[str] = None) -> dict:
        if not submit_selectors:
            submit_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Submit')",
                "button:has-text('Apply')",
                "button:has-text('Send')",
                "a:has-text('Apply')",
            ]
        clicked = await self.click_button(submit_selectors)
        if clicked:
            await self._random_delay(2.0, 5.0)
            return {"success": True, "message": "Submit button clicked"}
        return {"success": False, "error": "No submit button found"}

    async def screenshot(self, name: str = "") -> str:
        if not name:
            name = f"screenshot_{int(time.time())}"
        path = os.path.join(self.screenshot_dir, f"{name}.png")
        await self._page.screenshot(path=path)
        return path

    async def get_page_html(self) -> str:
        return await self._page.content()

    async def extract_form_fields(self) -> list[dict]:
        return await self._page.evaluate("""
            () => {
                const fields = [];
                document.querySelectorAll('input, select, textarea').forEach(el => {
                    fields.push({
                        tag: el.tagName.toLowerCase(),
                        type: el.type || '',
                        name: el.name || '',
                        id: el.id || '',
                        placeholder: el.placeholder || '',
                        aria_label: el.getAttribute('aria-label') || '',
                        label: el.labels?.[0]?.textContent?.trim() || '',
                        required: el.required,
                        visible: el.offsetParent !== null,
                    });
                });
                return fields;
            }
        """)

    async def login(self, url: str, credentials: dict) -> dict:
        nav = await self.navigate(url)
        if not nav.get("success"):
            return nav

        field_data = {}
        if credentials.get("email"):
            field_data["email"] = credentials["email"]
        if credentials.get("username"):
            field_data["email"] = credentials["username"]
        if credentials.get("password"):
            field_data["password"] = credentials["password"]

        filled = await self.fill_simple_form(field_data)
        if not filled:
            return {"success": False, "error": "Could not fill login fields"}

        submit = await self.submit_application()
        await self._random_delay(2.0, 3.0)

        return {
            "success": submit.get("success", False),
            "filled_fields": list(filled.keys()),
            "current_url": self._page.url,
        }


import asyncio

_browser_sessions: dict[str, BrowserSession] = {}


async def create_browser_session(
    session_id: str = "",
    proxy: str = "",
    headless: bool = True,
) -> BrowserSession:
    if not session_id:
        session_id = hashlib.md5(f"{time.time()}{random.random()}".encode()).hexdigest()[:12]

    session = BrowserSession(proxy=proxy, headless=headless)
    await session.start()
    _browser_sessions[session_id] = session
    return session


async def get_browser_session(session_id: str) -> Optional[BrowserSession]:
    return _browser_sessions.get(session_id)


async def close_browser_session(session_id: str):
    session = _browser_sessions.pop(session_id, None)
    if session:
        await session.stop()
