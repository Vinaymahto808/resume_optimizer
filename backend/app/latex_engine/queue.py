import os, logging
from pathlib import Path
from typing import Optional
from app.latex_engine.compiler import compile_latex, generate_file_hash
from app.latex_engine.template_engine import generate_latex, TEMPLATE_META

logger = logging.getLogger(__name__)

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
OUTPUT_DIR = Path(os.getenv("LATEX_OUTPUT_DIR", "/tmp/latex-outputs"))

try:
    from celery import Celery

    celery_app = Celery(
        "latex_tasks",
        broker=CELERY_BROKER_URL,
        backend=CELERY_RESULT_BACKEND,
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_soft_time_limit=180,
        task_time_limit=240,
    )

    @celery_app.task(bind=True, max_retries=2)
    def compile_latex_task(self, tex_content: str, template_id: str = "resume") -> dict:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        try:
            result = compile_latex(tex_content, OUTPUT_DIR, template_id)
            content_hash = generate_file_hash(result.content)
            return {
                "status": "success",
                "path": str(result.path),
                "is_pdf": result.is_pdf,
                "extension": result.extension,
                "media_type": result.media_type,
                "size": len(result.content),
                "hash": content_hash,
                "log": result.log[-2000:] if result.log else "",
            }
        except Exception as e:
            logger.error(f"Compilation task failed: {e}")
            raise self.retry(exc=e, countdown=10)

    @celery_app.task(bind=True, max_retries=1)
    def generate_and_compile_task(self, data: dict, template_id: str, config: dict) -> dict:
        meta = TEMPLATE_META.get(template_id)
        if not meta:
            return {"status": "error", "error": f"Template {template_id} not found"}
        merged_config = {**meta["config"], **config}
        try:
            tex = generate_latex(data, template_id, merged_config)
            result = compile_latex(tex, OUTPUT_DIR, template_id)
            return {
                "status": "success",
                "path": str(result.path),
                "is_pdf": result.is_pdf,
                "extension": result.extension,
                "media_type": result.media_type,
                "size": len(result.content),
                "hash": generate_file_hash(result.content),
                "log": result.log[-2000:] if result.log else "",
            }
        except Exception as e:
            logger.error(f"Generate and compile task failed: {e}")
            return {"status": "error", "error": str(e)}

except ImportError:
    logger.warning("Celery not installed — task queue unavailable")
    celery_app = None
    compile_latex_task = None
    generate_and_compile_task = None
