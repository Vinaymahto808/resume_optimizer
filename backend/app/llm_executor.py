"""
Centralized LLM Executor — single abstraction for all LLM providers.

Replaces duplicated _call_llm() functions across resume_tailor, cover_letter_generator,
form_mapper, groq_helper, rewrite_service, job_keyword_extractor.

Features:
- Provider switching (Groq, OpenAI, Anthropic)
- Exponential backoff retry with jitter
- Per-provider rate limiting (token bucket)
- Response caching (TTL-based)
- Cost tracking per request
- JSON response validation + cleaning
- Structured logging
"""

import json
import re
import time
import hashlib
import logging
import threading
from enum import Enum
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    GROQ = "groq"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


@dataclass
class LLMResponse:
    content: str
    parsed_json: Optional[dict] = None
    provider: str = ""
    model: str = ""
    tokens_used: int = 0
    latency_ms: float = 0
    cached: bool = False
    cost_usd: float = 0
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and self.content != ""


@dataclass
class RateLimiter:
    max_requests: int
    window_seconds: float
    _timestamps: list = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def acquire(self) -> bool:
        now = time.monotonic()
        with self._lock:
            self._timestamps = [t for t in self._timestamps if now - t < self.window_seconds]
            if len(self._timestamps) < self.max_requests:
                self._timestamps.append(now)
                return True
            return False

    def wait_time(self) -> float:
        now = time.monotonic()
        with self._lock:
            if not self._timestamps:
                return 0
            oldest = min(self._timestamps)
            return max(0, self.window_seconds - (now - oldest))


class ResponseCache:
    def __init__(self, max_size: int = 256, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[float, LLMResponse]] = {}
        self._lock = threading.Lock()

    def _key(self, prompt: str, model: str) -> str:
        return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()

    def get(self, prompt: str, model: str) -> Optional[LLMResponse]:
        key = self._key(prompt, model)
        with self._lock:
            entry = self._cache.get(key)
            if entry and time.time() - entry[0] < self.ttl_seconds:
                resp = entry[1]
                resp.cached = True
                return resp
            if entry:
                del self._cache[key]
        return None

    def set(self, prompt: str, model: str, response: LLMResponse):
        key = self._key(prompt, model)
        with self._lock:
            if len(self._cache) >= self.max_size:
                oldest_key = min(self._cache, key=lambda k: self._cache[k][0])
                del self._cache[oldest_key]
            self._cache[key] = (time.time(), response)


PRICING = {
    LLMProvider.GROQ: {"input": 0.0, "output": 0.0},
    LLMProvider.OPENAI: {"input": 0.0025 / 1000, "output": 0.01 / 1000},
    LLMProvider.ANTHROPIC: {"input": 0.003 / 1000, "output": 0.015 / 1000},
}

DEFAULT_MODELS = {
    LLMProvider.GROQ: "llama-3.3-70b-versatile",
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.ANTHROPIC: "claude-sonnet-4-20250514",
}

RATE_LIMITS = {
    LLMProvider.GROQ: RateLimiter(max_requests=30, window_seconds=60),
    LLMProvider.OPENAI: RateLimiter(max_requests=60, window_seconds=60),
    LLMProvider.ANTHROPIC: RateLimiter(max_requests=40, window_seconds=60),
}

usage_log: list[dict] = []
_usage_lock = threading.Lock()


class LLMExecutor:
    def __init__(
        self,
        provider: LLMProvider = LLMProvider.GROQ,
        api_key: str = "",
        model: str = "",
        max_retries: int = 3,
        enable_cache: bool = True,
        cache_ttl: int = 3600,
    ):
        self.provider = provider
        self.api_key = api_key
        self.model = model or DEFAULT_MODELS.get(provider, "")
        self.max_retries = max_retries
        self.cache = ResponseCache(ttl_seconds=cache_ttl) if enable_cache else None

    def execute(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format_json: bool = False,
    ) -> LLMResponse:
        if self.cache:
            cached = self.cache.get(prompt, self.model)
            if cached:
                logger.debug("LLM cache hit for model=%s", self.model)
                return cached

        rate_limiter = RATE_LIMITS.get(self.provider)
        if rate_limiter and not rate_limiter.acquire():
            wait = rate_limiter.wait_time()
            logger.info("Rate limited, waiting %.1fs", wait)
            time.sleep(wait + 0.1)
            rate_limiter.acquire()

        last_error = None
        for attempt in range(self.max_retries):
            start = time.monotonic()
            try:
                raw = self._call_provider(prompt, temperature, max_tokens, response_format_json)
                latency = (time.monotonic() - start) * 1000

                parsed = None
                if response_format_json:
                    cleaned = self._clean_json(raw)
                    try:
                        parsed = json.loads(cleaned)
                    except json.JSONDecodeError:
                        pass

                cost = self._estimate_cost(raw)
                response = LLMResponse(
                    content=raw,
                    parsed_json=parsed,
                    provider=self.provider.value,
                    model=self.model,
                    tokens_used=len(raw.split()),
                    latency_ms=latency,
                    cost_usd=cost,
                )

                self._log_usage(response)
                if self.cache:
                    self.cache.set(prompt, self.model, response)
                return response

            except Exception as e:
                last_error = str(e)
                backoff = (2 ** attempt) * 0.5
                logger.warning("LLM attempt %d/%d failed: %s, retrying in %.1fs",
                               attempt + 1, self.max_retries, e, backoff)
                time.sleep(backoff)

        return LLMResponse(
            content="",
            provider=self.provider.value,
            model=self.model,
            error=last_error or "All retries exhausted",
        )

    def execute_json(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        resp = self.execute(prompt, temperature, max_tokens, response_format_json=True)
        if resp.success and resp.parsed_json is None:
            resp.error = "Failed to parse JSON from LLM response"
        return resp

    def _call_provider(self, prompt: str, temperature: float, max_tokens: int,
                       json_mode: bool = False) -> str:
        if self.provider == LLMProvider.GROQ:
            return self._call_openai_compat(prompt, "https://api.groq.com/openai/v1",
                                            temperature, max_tokens, json_mode)
        elif self.provider == LLMProvider.OPENAI:
            return self._call_openai_native(prompt, temperature, max_tokens, json_mode)
        elif self.provider == LLMProvider.ANTHROPIC:
            return self._call_anthropic(prompt, temperature, max_tokens)
        raise ValueError(f"Unknown provider: {self.provider}")

    def _call_openai_compat(self, prompt: str, base_url: str, temperature: float,
                            max_tokens: int, json_mode: bool) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key, base_url=base_url)
        kwargs = dict(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip() if response.choices else ""

    def _call_openai_native(self, prompt: str, temperature: float,
                            max_tokens: int, json_mode: bool) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        kwargs = dict(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip() if response.choices else ""

    def _call_anthropic(self, prompt: str, temperature: float, max_tokens: int) -> str:
        import httpx
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"] if data.get("content") else ""

    def _clean_json(self, text: str) -> str:
        text = text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        return text.strip()

    def _estimate_cost(self, text: str) -> float:
        pricing = PRICING.get(self.provider, {"input": 0, "output": 0})
        tokens = len(text.split())
        return tokens * (pricing["input"] + pricing["output"])

    def _log_usage(self, response: LLMResponse):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "provider": response.provider,
            "model": response.model,
            "tokens_used": response.tokens_used,
            "latency_ms": round(response.latency_ms, 2),
            "cost_usd": round(response.cost_usd, 6),
            "cached": response.cached,
        }
        with _usage_lock:
            usage_log.append(entry)
            if len(usage_log) > 10000:
                usage_log.pop(0)


def get_llm(
    provider: LLMProvider = LLMProvider.GROQ,
    api_key: str = "",
    model: str = "",
    **kwargs,
) -> LLMExecutor:
    from app.config import settings
    if not api_key:
        if provider == LLMProvider.GROQ:
            api_key = settings.GROQ_API_KEY
        elif provider == LLMProvider.OPENAI:
            api_key = settings.OPENAI_API_KEY
    return LLMExecutor(provider=provider, api_key=api_key, model=model, **kwargs)


def call_llm(prompt: str, api_key: str = "", model: str = "", **kwargs) -> dict:
    executor = get_llm(api_key=api_key, model=model)
    response = executor.execute_json(prompt, **kwargs)
    if response.success and response.parsed_json:
        return response.parsed_json
    return {"error": response.error or "LLM call failed"}


def call_llm_text(prompt: str, api_key: str = "", model: str = "", **kwargs) -> str:
    executor = get_llm(api_key=api_key, model=model)
    response = executor.execute(prompt, **kwargs)
    return response.content


def get_usage_stats() -> dict:
    with _usage_lock:
        entries = list(usage_log)
    if not entries:
        return {"total_calls": 0, "total_cost_usd": 0, "avg_latency_ms": 0}
    total_cost = sum(e["cost_usd"] for e in entries)
    avg_latency = sum(e["latency_ms"] for e in entries) / len(entries)
    by_provider = {}
    for e in entries:
        p = e["provider"]
        if p not in by_provider:
            by_provider[p] = {"calls": 0, "cost_usd": 0, "tokens": 0}
        by_provider[p]["calls"] += 1
        by_provider[p]["cost_usd"] += e["cost_usd"]
        by_provider[p]["tokens"] += e["tokens_used"]
    return {
        "total_calls": len(entries),
        "total_cost_usd": round(total_cost, 4),
        "avg_latency_ms": round(avg_latency, 2),
        "by_provider": by_provider,
    }
