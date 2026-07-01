import os, subprocess, tempfile, shutil, re, logging, hashlib, json
from pathlib import Path
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class CompilationResult:
    def __init__(self, path: Path, is_pdf: bool, log: str = ""):
        self.path = path
        self.is_pdf = is_pdf
        self.log = log

    @property
    def content(self) -> bytes:
        return self.path.read_bytes()

    @property
    def media_type(self) -> str:
        return "application/pdf" if self.is_pdf else "application/x-latex"

    @property
    def extension(self) -> str:
        return "pdf" if self.is_pdf else "tex"


DOCKER_IMAGE = os.getenv("LATEX_DOCKER_IMAGE", "texlive/texlive:latest")
DOCKER_TIMEOUT = int(os.getenv("LATEX_DOCKER_TIMEOUT", "120"))


def _docker_available() -> bool:
    try:
        subprocess.run(
            ["docker", "info"],
            capture_output=True, text=True, timeout=10,
        )
        return True
    except Exception:
        return False


def _compile_with_docker(tex_path: Path, workdir: Path, timeout: int = DOCKER_TIMEOUT) -> tuple[bool, str]:
    mount = f"{workdir}:/data"
    result = subprocess.run(
        [
            "docker", "run", "--rm",
            "-v", mount,
            "-w", "/data",
            DOCKER_IMAGE,
            "pdflatex", "-interaction=nonstopmode", "-halt-on-error",
            tex_path.name,
        ],
        capture_output=True, text=True, timeout=timeout,
    )
    pdf = workdir / tex_path.with_suffix(".pdf").name
    success = pdf.exists()
    return success, result.stdout + result.stderr


def _compile_with_pdflatex(tex_path: Path, workdir: Path, timeout: int) -> tuple[bool, str]:
    logs = []
    for _ in range(2):
        result = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex_path.name],
            cwd=workdir,
            capture_output=True, text=True, timeout=timeout,
        )
        logs.append(result.stdout + result.stderr)
    pdf = workdir / tex_path.with_suffix(".pdf").name
    success = pdf.exists()
    return success, "\n".join(logs)


def compile_latex(
    tex_content: str,
    output_dir: Optional[str | Path] = None,
    template_id: str = "resume",
) -> CompilationResult:
    timeout = getattr(settings, "LATEX_TIMEOUT", 60)
    use_docker = os.getenv("LATEX_USE_DOCKER", "").lower() in ("1", "true", "yes") and _docker_available()
    tmp = tempfile.mkdtemp(prefix="latexcv_")
    out_dir = Path(output_dir) if output_dir else Path(tmp)
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        tex_path = Path(tmp) / "main.tex"
        tex_path.write_text(tex_content, encoding="utf-8")
        out_pdf = out_dir / f"{template_id}.pdf"
        out_tex = out_dir / f"{template_id}.tex"

        if not use_docker and not shutil.which("pdflatex"):
            shutil.copy2(str(tex_path), str(out_tex))
            return CompilationResult(out_tex, is_pdf=False, log="pdflatex not available")

        if use_docker:
            success, log_text = _compile_with_docker(tex_path, Path(tmp), timeout)
        else:
            success, log_text = _compile_with_pdflatex(tex_path, Path(tmp), timeout)

        if not success:
            shutil.copy2(str(tex_path), str(out_tex))
            return CompilationResult(out_tex, is_pdf=False, log=log_text)

        src_pdf = Path(tmp) / "main.pdf"
        if src_pdf.exists():
            shutil.copy2(str(src_pdf), str(out_pdf))
            return CompilationResult(out_pdf, is_pdf=True, log=log_text)

        shutil.copy2(str(tex_path), str(out_tex))
        return CompilationResult(out_tex, is_pdf=False, log=log_text)

    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def generate_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()
