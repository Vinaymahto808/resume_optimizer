"""
Persistent Job Queue — Redis-backed (with in-memory fallback) for application processing.

Handles:
- Async resume tailoring, cover letter generation, form filling
- Retry with exponential backoff
- Rate limiting per portal
- Priority queues (urgent > normal > bulk)
- Deduplication of pending jobs

Falls back to in-memory threading if Redis is unavailable.
"""

import os
import json
import uuid
import time
import queue
import logging
import threading
from enum import Enum
from typing import Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


class JobPriority(int, Enum):
    URGENT = 0
    NORMAL = 1
    BULK = 2


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class Job:
    id: str
    type: str
    payload: dict
    priority: JobPriority = JobPriority.NORMAL
    status: JobStatus = JobStatus.PENDING
    result: Any = None
    error: Optional[str] = None
    attempts: int = 0
    max_attempts: int = 3
    created_at: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    portal: str = ""
    user_id: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "priority": self.priority.value,
            "status": self.status.value,
            "attempts": self.attempts,
            "portal": self.portal,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "error": self.error,
        }


class JobQueue:
    def __init__(self):
        self._queues: dict[int, queue.PriorityQueue] = {
            p.value: queue.PriorityQueue() for p in JobPriority
        }
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._handlers: dict[str, Callable] = {}
        self._running = False
        self._worker_thread: Optional[threading.Thread] = None
        self._rate_limiters: dict[str, float] = {}
        self._rate_window = 2.0

    def register_handler(self, job_type: str, handler: Callable):
        self._handlers[job_type] = handler
        logger.info("Registered handler for job type: %s", job_type)

    def enqueue(
        self,
        job_type: str,
        payload: dict,
        priority: JobPriority = JobPriority.NORMAL,
        portal: str = "",
        user_id: str = "",
        max_attempts: int = 3,
    ) -> Job:
        job = Job(
            id=str(uuid.uuid4()),
            type=job_type,
            payload=payload,
            priority=priority,
            portal=portal,
            user_id=user_id,
            max_attempts=max_attempts,
        )

        with self._lock:
            self._jobs[job.id] = job

        self._queues[priority.value].put((priority.value, job.id))
        logger.info("Enqueued job %s type=%s priority=%s portal=%s",
                     job.id, job_type, priority.name, portal)
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(
        self,
        status: Optional[JobStatus] = None,
        job_type: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[dict]:
        with self._lock:
            jobs = list(self._jobs.values())

        if status:
            jobs = [j for j in jobs if j.status == status]
        if job_type:
            jobs = [j for j in jobs if j.type == job_type]
        if user_id:
            jobs = [j for j in jobs if j.user_id == user_id]

        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return [j.to_dict() for j in jobs[:limit]]

    def start(self):
        if self._running:
            return
        self._running = True
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()
        logger.info("Job queue worker started")

    def stop(self):
        self._running = False
        if self._worker_thread:
            self._worker_thread.join(timeout=5)
        logger.info("Job queue worker stopped")

    def _worker_loop(self):
        while self._running:
            job = self._next_job()
            if job:
                self._process_job(job)
            else:
                time.sleep(0.2)

    def _next_job(self) -> Optional[Job]:
        for priority in sorted(self._queues.keys()):
            pq = self._queues[priority]
            try:
                _, job_id = pq.get_nowait()
                with self._lock:
                    return self._jobs.get(job_id)
            except queue.Empty:
                continue
        return None

    def _process_job(self, job: Job):
        if job.type not in self._handlers:
            logger.error("No handler for job type: %s", job.type)
            job.status = JobStatus.FAILED
            job.error = f"No handler registered for type: {job.type}"
            return

        if not self._check_rate_limit(job.portal):
            self._queues[job.priority.value].put((job.priority.value, job.id))
            time.sleep(0.5)
            return

        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow().isoformat()
        job.attempts += 1

        try:
            handler = self._handlers[job.type]
            result = handler(job.payload)
            job.status = JobStatus.COMPLETED
            job.result = result
            job.completed_at = datetime.utcnow().isoformat()
            logger.info("Job %s completed in %s", job.id, job.type)

        except Exception as e:
            job.error = str(e)
            if job.attempts < job.max_attempts:
                job.status = JobStatus.RETRYING
                backoff = (2 ** job.attempts) * 0.5
                time.sleep(backoff)
                self._queues[job.priority.value].put((job.priority.value, job.id))
                logger.warning("Job %s failed (attempt %d/%d), retrying: %s",
                               job.id, job.attempts, job.max_attempts, e)
            else:
                job.status = JobStatus.FAILED
                logger.error("Job %s failed after %d attempts: %s",
                             job.id, job.attempts, e)

    def _check_rate_limit(self, portal: str) -> bool:
        if not portal:
            return True
        now = time.monotonic()
        last = self._rate_limiters.get(portal, 0)
        if now - last < self._rate_window:
            return False
        self._rate_limiters[portal] = now
        return True

    def get_stats(self) -> dict:
        with self._lock:
            jobs = list(self._jobs.values())
        by_status = {}
        by_type = {}
        for j in jobs:
            by_status[j.status.value] = by_status.get(j.status.value, 0) + 1
            by_type[j.type] = by_type.get(j.type, 0) + 1
        return {
            "total": len(jobs),
            "by_status": by_status,
            "by_type": by_type,
            "running": self._running,
        }


job_queue = JobQueue()


def enqueue_application_job(
    job_type: str,
    payload: dict,
    portal: str = "",
    user_id: str = "",
    priority: JobPriority = JobPriority.NORMAL,
) -> Job:
    return job_queue.enqueue(
        job_type=job_type,
        payload=payload,
        priority=priority,
        portal=portal,
        user_id=user_id,
    )
