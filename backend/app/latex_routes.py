import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

LATEX_DIR = Path(__file__).resolve().parent / "latex_templates"

TEMPLATE_META = {
    "classic": {
        "name": "Classic (ATS-Friendly)",
        "description": "ATS-optimized single-column layout with standard fonts, no graphics, and simple section headings. Maximizes machine readability while maintaining clean professional look.",
        "tags": ["ats-friendly", "single-column", "minimal", "professional", "parseable"],
    },
    "modern": {
        "name": "Modern",
        "description": "A sleek modern layout with a dark header bar, optional photo, and color accents. Great for creative roles.",
        "tags": ["modern", "photo", "colorful"],
    },
    "minimalistic": {
        "name": "Minimalistic",
        "description": "Ultra-clean minimal design with FontAwesome icons and a lime-green accent.",
        "tags": ["minimal", "clean", "icons"],
    },
    "rows": {
        "name": "Rows",
        "description": "Full-width row-based layout with dark header, summary bar, photo, and colored section backgrounds.",
        "tags": ["rows", "colorful", "photo"],
    },
    "sidebar": {
        "name": "Sidebar",
        "description": "Two-column layout with a colored sidebar on the right containing contact info, skills, and star ratings.",
        "tags": ["two-column", "sidebar", "ratings"],
    },
    "sidebarleft": {
        "name": "Sidebar Left",
        "description": "Two-column layout with the sidebar on the left, featuring progress bars for skills and a red accent color.",
        "tags": ["two-column", "sidebar", "skills", "progress-bars"],
    },
    "two_column": {
        "name": "Two Column",
        "description": "Balanced two-column layout with minipages, photo, QR code, and side-by-side sections.",
        "tags": ["two-column", "balanced", "photo"],
    },
    "infographics": {
        "name": "Infographics",
        "description": "A highly visual single-page layout with pie charts, bar charts, bubble charts, squares, and a timeline.",
        "tags": ["infographic", "charts", "visual", "timeline"],
    },
    "infographics2": {
        "name": "Infographics 2",
        "description": "Enhanced infographics layout with Python-themed colors, FontAwesome 5, and vertical/horizontal timeline variants.",
        "tags": ["infographic", "charts", "timeline", "python-theme"],
    },
}

router = APIRouter(prefix="/api/latex-templates", tags=["latex-templates"])


def _find_tex(tdir: Path) -> Path | None:
    for p in [tdir / "main.tex", tdir / "en" / "main.tex"]:
        if p.exists():
            return p
    return None


def _find_pdf(tdir: Path) -> Path | None:
    for p in [tdir / "main.pdf", tdir / "en" / "main.pdf"]:
        if p.exists():
            return p
    return None


def _scan_templates():
    if not LATEX_DIR.exists():
        return []
    templates = []
    for entry in sorted(LATEX_DIR.iterdir()):
        if entry.is_dir() and _find_tex(entry):
            meta = TEMPLATE_META.get(entry.name, {})
            templates.append({
                "id": entry.name,
                "name": meta.get("name", entry.name.title()),
                "description": meta.get("description", "A LaTeX CV template."),
                "tags": meta.get("tags", []),
                "has_preview": _find_pdf(entry) is not None,
                "files": sorted(
                    str(f.relative_to(entry))
                    for f in entry.rglob("*")
                    if f.is_file()
                ),
            })
    return templates


def _assert_template(template_id: str) -> Path:
    tdir = LATEX_DIR / template_id
    if not tdir.exists():
        raise HTTPException(404, f"Template {template_id} not found")
    return tdir


@router.get("/")
def list_templates():
    return {"success": True, "data": _scan_templates()}


@router.get("/{template_id}")
def get_template(template_id: str):
    tdir = _assert_template(template_id)
    tex = _find_tex(tdir)
    if not tex:
        raise HTTPException(404, "main.tex not found")
    return {"success": True, "data": {"tex_content": tex.read_text("utf-8")}}


@router.get("/{template_id}/download")
def download_template(template_id: str):
    tdir = _assert_template(template_id)
    tex = _find_tex(tdir)
    if not tex:
        raise HTTPException(404, "main.tex not found")

    subdir = tex.parent.relative_to(tdir)
    tmp = tempfile.mkdtemp(prefix="latexcv_")
    try:
        dst = Path(tmp) / subdir
        dst.mkdir(parents=True, exist_ok=True)
        for f in tdir.rglob("*"):
            if f.is_file():
                rel = f.relative_to(tdir)
                (Path(tmp) / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(f), str(Path(tmp) / rel))

        zip_path = shutil.make_archive(
            str(Path(tmp) / template_id), "zip", tmp
        )
        zip_bytes = Path(zip_path).read_bytes()
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{template_id}-template.zip"',
            },
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@router.get("/{template_id}/preview")
def preview_pdf(template_id: str):
    tdir = _assert_template(template_id)
    pdf = _find_pdf(tdir)
    if not pdf:
        raise HTTPException(404, "No preview PDF available for this template")
    return FileResponse(str(pdf), media_type="application/pdf")


class CompileRequest(BaseModel):
    substitutions: dict = {}


@router.post("/{template_id}/compile")
def compile_template(template_id: str, req: CompileRequest):
    tdir = _assert_template(template_id)
    tex_src = _find_tex(tdir)
    if not tex_src:
        raise HTTPException(404, "main.tex not found")

    tmp = tempfile.mkdtemp(prefix="latexcv_")
    try:
        for f in tdir.rglob("*"):
            if f.is_file():
                rel = f.relative_to(tdir)
                dest = Path(tmp) / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(f), str(dest))

        subdir = tex_src.parent.relative_to(tdir)
        tex_dest = Path(tmp) / subdir / "main.tex"

        tex = tex_dest.read_text(encoding="utf-8")
        for key, val in req.substitutions.items():
            tex = tex.replace(key, val)
        tex_dest.write_text(tex, encoding="utf-8")

        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"],
            cwd=str(Path(tmp) / subdir),
            capture_output=True,
            text=True,
            timeout=60,
        )
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"],
            cwd=str(Path(tmp) / subdir),
            capture_output=True,
            text=True,
            timeout=60,
        )

        pdf_path = Path(tmp) / subdir / "main.pdf"
        if not pdf_path.exists():
            log = Path(tmp) / subdir / "main.log"
            log_text = log.read_text() if log.exists() else "No log generated"
            raise HTTPException(
                500,
                f"LaTeX compilation failed.\n\nLOG:\n{log_text[-3000:]}",
            )

        return Response(
            content=pdf_path.read_bytes(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{template_id}-resume.pdf"',
            },
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "LaTeX compilation timed out after 60 seconds")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Compilation error: {str(e)}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
