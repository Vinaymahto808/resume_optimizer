"""
Analytics & Structured Logging — audit trail, metrics, Elasticsearch-ready.

Provides:
- Structured event logging (JSON-formatted)
- Audit trail for all user actions
- Performance metrics (LLM latency, API response times)
- Elasticsearch bulk-ready log format
- Real-time in-memory aggregation
"""

import json
import time
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Any
from dataclasses import dataclass, field, asdict
from collections import defaultdict

logger = logging.getLogger(__name__)


class EventType(str):
    USER_REGISTER = "user.register"
    USER_LOGIN = "user.login"
    RESUME_UPLOAD = "resume.upload"
    RESUME_SCAN = "resume.scan"
    RESUME_TAILOR = "resume.tailor"
    COVER_LETTER_GEN = "cover_letter.generate"
    JOB_SEARCH = "job.search"
    APPLICATION_CREATE = "application.create"
    APPLICATION_SUBMIT = "application.submit"
    APPLICATION_STATUS = "application.status_change"
    CREDENTIAL_STORE = "credential.store"
    CREDENTIAL_USE = "credential.use"
    BROWSER_OPEN = "browser.session_open"
    BROWSER_FORM_FILL = "browser.form_fill"
    LLM_CALL = "llm.call"
    API_REQUEST = "api.request"
    API_ERROR = "api.error"
    PAYMENT_CREATE = "payment.create"
    PAYMENT_WEBHOOK = "payment.webhook"


@dataclass
class AuditEvent:
    event_type: str
    user_id: str = ""
    resource_id: str = ""
    resource_type: str = ""
    action: str = ""
    details: dict = field(default_factory=dict)
    ip_address: str = ""
    user_agent: str = ""
    success: bool = True
    error_message: str = ""
    latency_ms: float = 0
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat() + "Z"

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v}

    def to_elasticsearch(self, index: str = "audit-logs") -> dict:
        return {
            "_index": index,
            "_source": self.to_dict(),
        }


class MetricsCollector:
    def __init__(self):
        self._counters: dict[str, int] = defaultdict(int)
        self._histograms: dict[str, list[float]] = defaultdict(list)
        self._gauges: dict[str, float] = {}
        self._lock = threading.Lock()

    def increment(self, name: str, value: int = 1):
        with self._lock:
            self._counters[name] += value

    def observe(self, name: str, value: float):
        with self._lock:
            self._histograms[name].append(value)
            if len(self._histograms[name]) > 10000:
                self._histograms[name] = self._histograms[name][-5000:]

    def set_gauge(self, name: str, value: float):
        with self._lock:
            self._gauges[name] = value

    def get_counter(self, name: str) -> int:
        with self._lock:
            return self._counters.get(name, 0)

    def get_histogram_stats(self, name: str) -> dict:
        with self._lock:
            values = self._histograms.get(name, [])
        if not values:
            return {"count": 0, "min": 0, "max": 0, "avg": 0, "p50": 0, "p95": 0, "p99": 0}
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        return {
            "count": n,
            "min": round(sorted_vals[0], 2),
            "max": round(sorted_vals[-1], 2),
            "avg": round(sum(sorted_vals) / n, 2),
            "p50": round(sorted_vals[n // 2], 2),
            "p95": round(sorted_vals[int(n * 0.95)], 2) if n >= 20 else round(sorted_vals[-1], 2),
            "p99": round(sorted_vals[int(n * 0.99)], 2) if n >= 100 else round(sorted_vals[-1], 2),
        }

    def get_all(self) -> dict:
        with self._lock:
            counters = dict(self._counters)
            gauges = dict(self._gauges)
        histograms = {}
        for name in self._histograms:
            histograms[name] = self.get_histogram_stats(name)
        return {"counters": counters, "gauges": gauges, "histograms": histograms}


class StructuredLogger:
    def __init__(self, log_file: str = "logs/audit.jsonl", max_buffer: int = 100):
        self.log_file = log_file
        self.max_buffer = max_buffer
        self._buffer: list[dict] = []
        self._lock = threading.Lock()
        self._metrics = MetricsCollector()

    def log_event(self, event: AuditEvent):
        entry = event.to_dict()
        with self._lock:
            self._buffer.append(entry)
            if len(self._buffer) >= self.max_buffer:
                self._flush()

        self._metrics.increment(f"events.{event.event_type}")
        if not event.success:
            self._metrics.increment(f"errors.{event.event_type}")
        if event.latency_ms > 0:
            self._metrics.observe(f"latency.{event.event_type}", event.latency_ms)

    def log_api_request(self, method: str, path: str, status_code: int,
                        latency_ms: float, user_id: str = ""):
        self.log_event(AuditEvent(
            event_type=EventType.API_REQUEST,
            user_id=user_id,
            action=f"{method} {path}",
            details={"status_code": status_code, "path": path},
            success=200 <= status_code < 400,
            latency_ms=latency_ms,
        ))
        self._metrics.observe("api.latency_ms", latency_ms)
        self._metrics.increment(f"api.status.{status_code}")

    def log_llm_call(self, provider: str, model: str, tokens: int,
                     latency_ms: float, cost_usd: float, success: bool):
        self.log_event(AuditEvent(
            event_type=EventType.LLM_CALL,
            action=f"{provider}/{model}",
            details={"tokens": tokens, "cost_usd": cost_usd},
            success=success,
            latency_ms=latency_ms,
        ))
        self._metrics.observe("llm.latency_ms", latency_ms)
        self._metrics.observe("llm.tokens", tokens)
        self._metrics.observe("llm.cost_usd", cost_usd)

    def get_metrics(self) -> dict:
        return self._metrics.get_all()

    def get_recent_events(self, event_type: str = "", limit: int = 50) -> list[dict]:
        with self._lock:
            events = list(self._buffer)
        if event_type:
            events = [e for e in events if e.get("event_type") == event_type]
        return events[-limit:]

    def _flush(self):
        if not self._buffer:
            return
        try:
            import os
            os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
            with open(self.log_file, "a") as f:
                for entry in self._buffer:
                    f.write(json.dumps(entry, default=str) + "\n")
            self._buffer.clear()
        except Exception as e:
            logger.error("Failed to flush audit log: %s", e)

    def flush(self):
        with self._lock:
            self._flush()


_analytics: Optional[StructuredLogger] = None


def get_analytics() -> StructuredLogger:
    global _analytics
    if _analytics is None:
        _analytics = StructuredLogger()
    return _analytics


def get_metrics() -> dict:
    return get_analytics().get_metrics()
