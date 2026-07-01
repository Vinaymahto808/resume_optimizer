import os, tempfile, shutil, json, re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse, Response, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.config import settings, TEMPLATES_DIR
from app.models import User
from app.latex_engine.sanitizer import escape_latex
from app.latex_engine.models import (
    CustomCompileRequest, JDAnalyzeRequest, ResumeFromJDRequest,
    AIOptimizeRequest, CompileRequest,
)
from app.latex_engine.template_engine import (
    LATEX_DIR, TEMPLATE_META, generate_latex, scan_templates,
    find_tex, find_pdf, assert_template, analyze_jd, optimize_resume_data,
)
from app.latex_engine.compiler import compile_latex, CompilationResult
from app.groq_helper import optimize_resume_with_groq

router = APIRouter(prefix="/api/latex-engine", tags=["latex-engine"])


# ── Template endpoints ──

@router.get("/templates")
def list_templates():
    return {"success": True, "data": scan_templates()}


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    tex = find_tex(tdir)
    if not tex:
        raise HTTPException(404, "main.tex not found for this template")
    return {"success": True, "data": {"tex_content": tex.read_text("utf-8")}}


@router.get("/templates/{template_id}/download")
def download_template(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    tex = find_tex(tdir)
    if not tex:
        raise HTTPException(404, "main.tex not found")
    tmp = tempfile.mkdtemp(prefix="latexcv_")
    try:
        subdir = tex.parent.relative_to(tdir)
        dst = Path(tmp) / subdir
        dst.mkdir(parents=True, exist_ok=True)
        for f in tdir.rglob("*"):
            if f.is_file():
                rel = f.relative_to(tdir)
                (Path(tmp) / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(f), str(Path(tmp) / rel))
        zip_path = shutil.make_archive(str(Path(tmp) / template_id), "zip", tmp)
        zip_bytes = Path(zip_path).read_bytes()
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{template_id}-template.zip"'},
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@router.get("/templates/{template_id}/preview")
def preview_pdf(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    pdf = find_pdf(tdir)
    if not pdf:
        raise HTTPException(404, "No preview PDF available")
    return FileResponse(str(pdf), media_type="application/pdf")


@router.post("/templates/{template_id}/compile")
def compile_template(template_id: str, req: CompileRequest):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    tex_src = find_tex(tdir)
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

        timeout = getattr(settings, "LATEX_TIMEOUT", 60)
        latex_available = shutil.which("pdflatex") is not None
        if latex_available:
            import subprocess as sp
            for _ in range(2):
                sp.run(
                    ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"],
                    cwd=str(Path(tmp) / subdir),
                    capture_output=True, text=True, timeout=timeout,
                )
            pdf_path = Path(tmp) / subdir / "main.pdf"
            if pdf_path.exists():
                return Response(
                    content=pdf_path.read_bytes(),
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{template_id}-resume.pdf"'},
                )
            log_path = Path(tmp) / subdir / "main.log"
            log_text = log_path.read_text() if log_path.exists() else "No log"
            raise HTTPException(500, f"LaTeX compilation failed.\n\nLOG:\n{log_text[-3000:]}")
        else:
            tex_bytes = tex.encode("utf-8")
            return Response(
                content=tex_bytes,
                media_type="application/x-latex",
                headers={"Content-Disposition": f'attachment; filename="{template_id}-resume.tex"'},
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Compilation error: {str(e)}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ── Custom compile ──

@router.post("/custom-compile")
def custom_compile(req: CustomCompileRequest):
    meta = TEMPLATE_META.get(req.template_id)
    if not meta:
        raise HTTPException(404, f"Template {req.template_id} not found")
    config = {**meta["config"], **req.config}
    data = req.resume_data.model_dump()
    tex = generate_latex(data, req.template_id, config)
    result = compile_latex(tex, template_id=req.template_id)
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f'attachment; filename="{req.template_id}-resume.{result.extension}"'},
    )


# ── JD analysis ──

@router.post("/analyze-jd")
def analyze_jd_endpoint(req: JDAnalyzeRequest):
    result = analyze_jd(req.job_description, req.company_name, req.job_title)
    return {"success": True, "data": result}


@router.post("/generate-from-jd")
async def generate_from_jd(req: ResumeFromJDRequest):
    meta = TEMPLATE_META.get(req.template_id)
    if not meta:
        raise HTTPException(404, f"Template {req.template_id} not found")
    analysis = analyze_jd(req.job_description, req.company_name, req.job_title)
    base_data = req.resume_data.model_dump() if req.resume_data else {}
    optimized = optimize_resume_data(base_data, {**analysis, "job_description": req.job_description})
    config = {**meta["config"], **req.config}
    tex = generate_latex(optimized, req.template_id, config)
    result = compile_latex(tex, template_id=f"{req.template_id}-tailored")
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f'attachment; filename="{req.template_id}-tailored-resume.{result.extension}"'},
    )


# ── AI optimize ──

@router.post("/ai-optimize")
def ai_optimize(req: AIOptimizeRequest):
    data = req.resume_data.model_dump()
    api_key = getattr(settings, "GROQ_API_KEY", "") or ""
    optimized = data
    suggestions = []
    if api_key:
        try:
            result = optimize_resume_with_groq(data, req.job_description, api_key)
            if result and "error" not in result:
                optimized = result.get("optimized_resume", data)
                suggestions = result.get("suggestions", [])
        except Exception:
            pass
    if not suggestions:
        skills = data.get("skills", [])
        exp_count = len(data.get("experience", []))
        suggestions = []
        if exp_count == 0:
            suggestions.append("Add relevant work experience")
        if not data.get("summary"):
            suggestions.append("Add a professional summary")
        if len(skills) < 5:
            suggestions.append(f"Add more skills (currently {len(skills)}, recommend 5+)")
        if not data.get("personal", {}).get("linkedin"):
            suggestions.append("Add LinkedIn profile URL")
        suggestions.append("Quantify achievements with metrics where possible")
        suggestions.append("Use strong action verbs to start bullet points")
    return {"success": True, "data": {"optimized_resume": optimized, "suggestions": suggestions}}


# ── Search / filter endpoints ──

@router.get("/search")
def search_templates(
    q: str = "",
    industry: str = "",
    role: str = "",
    style: str = "",
    experience: str = "",
    min_ats: int = 0,
    sort: str = "popular",
):
    results = []
    for tid, meta in TEMPLATE_META.items():
        if q and not (q.lower() in meta["name"].lower() or q.lower() in meta["description"].lower()):
            continue
        if industry and industry not in meta.get("industry", []):
            continue
        if role and role not in meta.get("role", []):
            continue
        if style and style != meta.get("style", ""):
            continue
        if experience and experience not in meta.get("experience_level", []):
            continue
        if min_ats and meta.get("ats_score", 0) < min_ats:
            continue
        results.append(meta)
    if sort == "ats_score":
        results.sort(key=lambda x: x.get("ats_score", 0), reverse=True)
    elif sort == "name":
        results.sort(key=lambda x: x.get("name", ""))
    else:
        results.sort(key=lambda x: (not x.get("popular", False), x.get("name", "")))
    return {"success": True, "data": results}


@router.get("/industries")
def get_industries():
    all_industries = set()
    for meta in TEMPLATE_META.values():
        for ind in meta.get("industry", []):
            all_industries.add(ind)
    return {"success": True, "data": sorted(all_industries)}


@router.get("/roles")
def get_roles():
    all_roles = set()
    for meta in TEMPLATE_META.values():
        for r in meta.get("role", []):
            all_roles.add(r)
    return {"success": True, "data": sorted(all_roles)}


@router.get("/styles")
def get_styles():
    all_styles = set()
    for meta in TEMPLATE_META.values():
        if meta.get("style"):
            all_styles.add(meta["style"])
    return {"success": True, "data": sorted(all_styles)}


@router.get("/experience-levels")
def get_experience_levels():
    all_levels = set()
    for meta in TEMPLATE_META.values():
        for lvl in meta.get("experience_level", []):
            all_levels.add(lvl)
    return {"success": True, "data": sorted(all_levels)}


# ── Health ──

@router.get("/health")
def engine_health():
    import shutil, subprocess
    pdflatex = shutil.which("pdflatex") is not None
    docker = False
    try:
        subprocess.run(["docker", "info"], capture_output=True, timeout=5)
        docker = True
    except Exception:
        pass
    return {
        "status": "ok",
        "pdflatex_available": pdflatex,
        "docker_available": docker,
        "templates_count": len(TEMPLATE_META),
        "templates_dir_exists": LATEX_DIR.exists(),
    }
