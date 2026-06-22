import uuid
import threading
import time
from datetime import datetime
from typing import Optional, Callable


class TaskStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ScanTask:
    def __init__(self, task_id: str, task_type: str, params: dict):
        self.task_id = task_id
        self.task_type = task_type
        self.params = params
        self.status = TaskStatus.PENDING
        self.result = None
        self.error = None
        self.created_at = datetime.utcnow()
        self.started_at = None
        self.completed_at = None
        self.progress = 0


class TaskManager:
    def __init__(self):
        self._tasks: dict[str, ScanTask] = {}
        self._lock = threading.Lock()

    def create_task(self, task_type: str, params: dict) -> ScanTask:
        task_id = str(uuid.uuid4())
        task = ScanTask(task_id, task_type, params)
        with self._lock:
            self._tasks[task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[ScanTask]:
        with self._lock:
            return self._tasks.get(task_id)

    def update_task(self, task_id: str, status: str = None, progress: int = None, result: dict = None, error: str = None):
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            if status is not None:
                task.status = status
                if status == TaskStatus.PROCESSING:
                    task.started_at = datetime.utcnow()
                elif status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
                    task.completed_at = datetime.utcnow()
            if progress is not None:
                task.progress = progress
            if result is not None:
                task.result = result
            if error is not None:
                task.error = error

    def start_processing(self, task_id: str, processor: Callable):
        def _run():
            try:
                task = self.get_task(task_id)
                if not task:
                    return
                self.update_task(task_id, status=TaskStatus.PROCESSING)
                processor(task)
            except Exception as e:
                self.update_task(task_id, status=TaskStatus.FAILED, error=str(e))

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

    def list_tasks(self, status: str = None) -> list[ScanTask]:
        with self._lock:
            tasks = list(self._tasks.values())
        if status:
            tasks = [t for t in tasks if t.status == status]
        return tasks


task_manager = TaskManager()


def run_ats_scan_task(task: ScanTask):
    from app.ats_scorer import generate_dual_score_report

    file_path = task.params.get("file_path")
    if not file_path:
        task_manager.update_task(task.task_id, status=TaskStatus.FAILED, error="Missing file_path in params")
        return

    task_manager.update_task(task.task_id, progress=25)
    report = generate_dual_score_report(file_path)

    task_manager.update_task(task.task_id, progress=50)
    ats_score = min(max(round(report["unified_score"]), 0), 100)

    task_manager.update_task(task.task_id, progress=75)
    result = {
        "ats_score": ats_score,
        "breakdown": report.get("breakdown"),
        "keywords_found": report.get("keywords_found"),
        "keywords_missing": report.get("keywords_missing"),
        "suggestions": report.get("all_suggestions", [])[:8],
        "word_count": report.get("word_count"),
        "raw_text": report.get("raw_text"),
        "tier1_checks": report.get("tier1_checks"),
        "tier2_checks": report.get("tier2_checks"),
        "atsparse_score": report.get("atsparse_score"),
        "human_quality_score": report.get("human_quality_score"),
    }

    resume_id = task.params.get("resume_id")
    if resume_id:
        try:
            from app.database import SessionLocal
            from app.models import Resume
            db = SessionLocal()
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if resume:
                resume.ats_score = ats_score
                resume.raw_text = result.get("raw_text") or ""
                resume.keywords_found = ",".join(result.get("keywords_found", []) or [])
                resume.keywords_missing = ",".join(result.get("keywords_missing", []) or [])
                resume.suggestions = "\n".join(result.get("suggestions", []) or [])
                db.commit()
            db.close()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to update resume {resume_id}: {e}")

    result["resume_id"] = resume_id
    task_manager.update_task(task.task_id, progress=100, status=TaskStatus.COMPLETED, result=result)


def run_full_audit_task(task: ScanTask):
    from app.ats_scorer import generate_dual_score_report
    from app.profile_analyzer import analyze_profile
    from app.checklist import generate_optimization_checklist
    from app.job_recommender import recommend_jobs

    file_path = task.params.get("file_path")
    if not file_path:
        task_manager.update_task(task.task_id, status=TaskStatus.FAILED, error="Missing file_path in params")
        return

    task_manager.update_task(task.task_id, progress=10)
    report = generate_dual_score_report(file_path)

    task_manager.update_task(task.task_id, progress=30)
    raw_text = report.get("raw_text", "")

    profile_analysis = analyze_profile(raw_text)

    task_manager.update_task(task.task_id, progress=50)
    checklist_items = generate_optimization_checklist(report, profile_analysis)

    task_manager.update_task(task.task_id, progress=70)
    job_matches = recommend_jobs(raw_text, min_match=20, top_n=10)

    task_manager.update_task(task.task_id, progress=90)
    ats_score = min(max(round(report["unified_score"]), 0), 100)

    result = {
        "ats_score": ats_score,
        "breakdown": report.get("breakdown"),
        "keywords_found": report.get("keywords_found"),
        "keywords_missing": report.get("keywords_missing"),
        "suggestions": report.get("all_suggestions", [])[:8],
        "word_count": report.get("word_count"),
        "raw_text": raw_text,
        "tier1_checks": report.get("tier1_checks"),
        "tier2_checks": report.get("tier2_checks"),
        "profile_analysis": profile_analysis,
        "checklist": checklist_items,
        "job_matches": [
            {
                "job": m["job"],
                "match_pct": m["match_pct"],
                "matched_skills": m["matched_skills"],
                "missing_skills": m["missing_skills"],
            }
            for m in job_matches
        ],
    }

    task_manager.update_task(task.task_id, progress=100, status=TaskStatus.COMPLETED, result=result)
