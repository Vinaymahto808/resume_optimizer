import os, re, json, subprocess, tempfile, shutil, hashlib, uuid
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, Response, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.config import settings, TEMPLATES_DIR
from app.models import User
from app.gemini_helper import analyze_jd_with_gemini, optimize_resume_with_gemini

LATEX_DIR = Path(TEMPLATES_DIR)

COLOR_RGB = {
    "navy": ("10,45,85", "30,64,110", "59,130,246"),
    "emerald": ("4,120,87", "16,185,129", "52,211,153"),
    "crimson": ("185,28,28", "220,38,38", "239,68,68"),
    "slate": ("71,85,105", "100,116,139", "148,163,184"),
    "purple": ("126,34,206", "139,92,246", "167,139,250"),
    "teal": ("13,148,136", "20,184,166", "45,212,191"),
    "amber": ("180,83,9", "217,119,6", "245,158,11"),
    "rose": ("159,18,57", "225,29,72", "244,63,94"),
    "indigo": ("55,48,163", "99,102,241", "129,140,248"),
    "zinc": ("63,63,70", "113,113,122", "161,161,170"),
}

FONT_STYLES = {
    "modern": ("Latin Modern Roman", "Latin Modern Sans", "Latin Modern Mono"),
    "sans": ("Helvetica", "Helvetica", "Courier"),
    "serif": ("Times New Roman", "Helvetica", "Courier"),
    "elegant": ("Palatino", "Helvetica", "Courier"),
}

SPACING_MAP = {
    "compact": ("0.5in", "2pt", "0pt", "8pt"),
    "normal": ("0.75in", "4pt", "1pt", "12pt"),
    "spacious": ("1in", "6pt", "2pt", "16pt"),
}

INDUSTRY_KEYWORDS = {
    "tech": ["python","javascript","react","node.js","aws","docker","kubernetes","sql","rest api","microservices","agile","ci/cd","git","typescript","java","cloud","devops","machine learning","data science","api","frontend","backend","full stack","system design","scalability","testing","deployment","linux","serverless","redis","mongodb","postgresql","graphql","docker","jenkins","terraform","ansible"],
    "finance": ["financial analysis","risk management","compliance","regulatory","financial modeling","investment","portfolio management","accounting","audit","tax","budgeting","forecasting","quantitative analysis","blockchain","fintech","trading","equity","fixed income","derivatives","asset management","wealth management","underwriting","actuarial","m&a","due diligence"],
    "healthcare": ["hipaa","clinical","patient care","medical records","healthcare compliance","pharmaceutical","biotech","medical devices","telehealth","health informatics","regulatory affairs","clinical trials","epic","cerner","ehr","emr","hl7","fhir","population health","care management","utilization management","icd-10","cpt coding"],
    "creative": ["ui/ux","design thinking","photoshop","illustrator","figma","sketch","invision","prototyping","user research","wireframing","branding","visual design","motion graphics","typography","after effects","indesign","creative direction","art direction","responsive design","accessibility","design systems","a/b testing"],
    "consulting": ["strategy","management consulting","client management","stakeholder analysis","business development","data analysis","presentation","project management","process improvement","m&a","due diligence","operations","supply chain","digital transformation","change management","kpi","balanced scorecard","benchmarking","cost reduction","revenue growth"],
    "academic": ["research","teaching","publication","grant writing","curriculum development","phd","peer review","conference","thesis","laboratory","experimental design","data collection","irb","institutional review","tenure","accreditation","student advising","pedagogy","assessment","scholarship"],
    "government": ["policy","public administration","compliance","security clearance","regulatory","budget management","program management","stakeholder engagement","legislative","public policy","government contracting","federal","state government","municipal","foia","public records","ethics","procurement","grant management"],
    "research": ["research methodology","data analysis","statistical analysis","scientific writing","experimental design","literature review","qualitative research","quantitative research","r","python","spss","laboratory techniques","hypothesis testing","regression analysis","machine learning","deep learning","nlp","computer vision","a/b testing","survey design","clinical research"],
}

TEMPLATE_META = {
    "classic-navy": {
        "id": "classic-navy", "name": "Classic Navy", "description": "Traditional single-column resume in navy blue. Serif fonts, professional layout, maximum ATS compatibility.",
        "tags": ["tech","finance","consulting","single-column","professional"], "industry": ["tech","finance","consulting"], "role": ["software-engineer","data-scientist","product-manager","finance"], "experience_level": ["entry","mid","senior","executive"], "style": "single-column", "ats_score": 95, "base_template": "classic",
        "config": {"color":"navy","font":"serif","spacing":"normal"},"has_preview":True,"popular":True,"premium":False,
    },
    "classic-emerald": {
        "id": "classic-emerald", "name": "Classic Emerald", "description": "Trusted classic layout with emerald green accents. Perfect for finance and consulting professionals.",
        "tags": ["finance","consulting","single-column","professional"], "industry": ["finance","consulting","tech"], "role": ["finance","consulting","product-manager"], "experience_level": ["mid","senior","executive"], "style": "single-column", "ats_score": 96, "base_template": "classic",
        "config": {"color":"emerald","font":"serif","spacing":"normal"},"has_preview":False,"popular":True,"premium":False,
    },
    "classic-slate": {
        "id": "classic-slate", "name": "Classic Slate", "description": "Understated slate gray traditional resume. Professional and subtle, ideal for government and academic roles.",
        "tags": ["government","academic","single-column","professional"], "industry": ["government","academic","research"], "role": ["government","academic","research"], "experience_level": ["mid","senior"], "style": "single-column", "ats_score": 97, "base_template": "classic",
        "config": {"color":"slate","font":"serif","spacing":"compact"},"has_preview":False,"popular":False,"premium":False,
    },
    "modern-navy": {
        "id": "modern-navy", "name": "Modern Navy", "description": "Sleek modern design with dark navy header bar and clean sans-serif typography. Photo-ready layout.",
        "tags": ["modern","photo","tech","colorful"], "industry": ["tech","creative","consulting"], "role": ["software-engineer","data-scientist","product-manager"], "experience_level": ["entry","mid","senior"], "style": "modern", "ats_score": 88, "base_template": "modern",
        "config": {"color":"navy","font":"sans","spacing":"normal"},"has_preview":True,"popular":True,"premium":False,
    },
    "modern-indigo": {
        "id": "modern-indigo", "name": "Modern Indigo", "description": "Deep indigo modern design that balances professionalism with contemporary flair.",
        "tags": ["modern","tech","finance","colorful"], "industry": ["tech","finance","consulting"], "role": ["software-engineer","data-scientist","product-manager","finance"], "experience_level": ["mid","senior","executive"], "style": "modern", "ats_score": 89, "base_template": "modern",
        "config": {"color":"indigo","font":"sans","spacing":"normal"},"has_preview":False,"popular":True,"premium":False,
    },
    "minimalistic-slate": {
        "id": "minimalistic-slate", "name": "Minimal Slate", "description": "Ultra-clean minimal design with slate accents and FontAwesome icons. Perfect for design-conscious professionals.",
        "tags": ["minimal","clean","icons","creative"], "industry": ["tech","creative","academic"], "role": ["software-engineer","data-scientist","creative","academic"], "experience_level": ["entry","mid","senior"], "style": "minimal", "ats_score": 91, "base_template": "minimalistic",
        "config": {"color":"slate","font":"modern","spacing":"normal"},"has_preview":True,"popular":True,"premium":False,
    },
    "minimalistic-emerald": {
        "id": "minimalistic-emerald", "name": "Minimal Emerald", "description": "Clean minimal design with fresh emerald green icons and accents. Modern yet professional.",
        "tags": ["minimal","tech","clean","icons"], "industry": ["tech","consulting","research"], "role": ["software-engineer","data-scientist","research"], "experience_level": ["entry","mid","senior"], "style": "minimal", "ats_score": 90, "base_template": "minimalistic",
        "config": {"color":"emerald","font":"sans","spacing":"compact"},"has_preview":False,"popular":True,"premium":False,
    },
    "sidebar-emerald": {
        "id": "sidebar-emerald", "name": "Sidebar Emerald", "description": "Two-column layout with emerald sidebar containing contact info, skills, and proficiency ratings.",
        "tags": ["two-column","sidebar","ratings","colorful"], "industry": ["tech","creative","consulting"], "role": ["software-engineer","data-scientist","creative"], "experience_level": ["mid","senior"], "style": "sidebar", "ats_score": 82, "base_template": "sidebar",
        "config": {"color":"emerald","font":"modern","spacing":"compact"},"has_preview":True,"popular":True,"premium":False,
    },
    "sidebar-navy": {
        "id": "sidebar-navy", "name": "Sidebar Navy", "description": "Professional navy sidebar layout. Combines contact/skills sidebar with detailed main content column.",
        "tags": ["two-column","sidebar","professional","corporate"], "industry": ["finance","consulting","government"], "role": ["finance","consulting","government"], "experience_level": ["senior","executive"], "style": "sidebar", "ats_score": 84, "base_template": "sidebar",
        "config": {"color":"navy","font":"serif","spacing":"normal"},"has_preview":False,"popular":True,"premium":False,
    },
    "sidebarleft-navy": {
        "id": "sidebarleft-navy", "name": "Sidebar Left Navy", "description": "Left-aligned navy sidebar with progress bars for skills. Modern take on two-column resumes.",
        "tags": ["two-column","sidebar","skills","progress-bars"], "industry": ["tech","creative","consulting"], "role": ["software-engineer","data-scientist","product-manager"], "experience_level": ["mid","senior"], "style": "sidebar", "ats_score": 81, "base_template": "sidebarleft",
        "config": {"color":"navy","font":"sans","spacing":"compact"},"has_preview":True,"popular":True,"premium":False,
    },
    "two-column-purple": {
        "id": "two-column-purple", "name": "Two-Column Purple", "description": "Balanced two-column layout with elegant purple accents. Side-by-side sections for dense information.",
        "tags": ["two-column","balanced","creative","colorful"], "industry": ["creative","tech","consulting"], "role": ["creative","marketing","product-manager"], "experience_level": ["mid","senior"], "style": "two-column", "ats_score": 79, "base_template": "two_column",
        "config": {"color":"purple","font":"elegant","spacing":"spacious"},"has_preview":True,"popular":True,"premium":False,
    },
    "two-column-navy": {
        "id": "two-column-navy", "name": "Two-Column Navy", "description": "Balanced navy two-column layout with minipage sections. Great for experienced professionals with diverse skills.",
        "tags": ["two-column","balanced","professional","corporate"], "industry": ["finance","consulting","tech"], "role": ["finance","consulting","product-manager"], "experience_level": ["senior","executive"], "style": "two-column", "ats_score": 80, "base_template": "two_column",
        "config": {"color":"navy","font":"serif","spacing":"normal"},"has_preview":False,"popular":True,"premium":False,
    },
    "rows-navy": {
        "id": "rows-navy", "name": "Rows Navy", "description": "Full-width row-based layout with dark navy header, photo, and colored section backgrounds.",
        "tags": ["rows","colorful","photo","visual"], "industry": ["tech","creative","marketing"], "role": ["software-engineer","product-manager","creative"], "experience_level": ["mid","senior"], "style": "modern", "ats_score": 85, "base_template": "rows",
        "config": {"color":"navy","font":"sans","spacing":"normal"},"has_preview":True,"popular":True,"premium":False,
    },
    "infographics-navy": {
        "id": "infographics-navy", "name": "Infographics Navy", "description": "Highly visual single-page layout with navy charts, graphs, and timeline. Perfect for data-driven roles.",
        "tags": ["infographic","charts","visual","timeline"], "industry": ["tech","research","creative"], "role": ["data-scientist","research","creative"], "experience_level": ["mid","senior"], "style": "infographic", "ats_score": 74, "base_template": "infographics",
        "config": {"color":"navy","font":"modern","spacing":"compact"},"has_preview":True,"popular":True,"premium":True,
    },
    "infographics2-navy": {
        "id": "infographics2-navy", "name": "Infographics 2 Navy", "description": "Enhanced infographics layout with navy theme, FontAwesome icons, and timeline variants.",
        "tags": ["infographic","charts","timeline","modern"], "industry": ["tech","research","creative"], "role": ["data-scientist","research","software-engineer"], "experience_level": ["mid","senior"], "style": "infographic", "ats_score": 75, "base_template": "infographics2",
        "config": {"color":"navy","font":"modern","spacing":"compact"},"has_preview":True,"popular":False,"premium":True,
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
        return list(TEMPLATE_META.values())
    results = []
    for tid, meta in TEMPLATE_META.items():
        tdir = LATEX_DIR / meta["base_template"]
        entry = dict(meta)
        entry["files"] = []
        if tdir.exists():
            tex = _find_tex(tdir)
            entry["has_preview"] = _find_pdf(tdir) is not None
            if tex:
                sub = tex.parent.relative_to(tdir)
                entry["files"] = sorted(
                    str(f.relative_to(tdir))
                    for f in tdir.rglob("*")
                    if f.is_file()
                )
        results.append(entry)
    return results


def _assert_template(template_id: str) -> tuple[Path, str]:
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    base = meta["base_template"]
    tdir = LATEX_DIR / base
    return tdir, base


def _escape_latex(text: str) -> str:
    if not text:
        return ""
    chars = {
        "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#",
        "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}",
        "^": "\\textasciicircum{}",
    }
    result = ""
    for ch in text:
        result += chars.get(ch, ch)
    return result


def _generate_latex_classic(data: dict, config: dict) -> str:
    color_key = config.get("color", "navy")
    font_key = config.get("font", "serif")
    spacing_key = config.get("spacing", "normal")
    prim_r, prim_g, prim_b = COLOR_RGB.get(color_key, COLOR_RGB["navy"])[0].split(",")
    margin, par_skip, item_sep, sec_before = SPACING_MAP.get(spacing_key, SPACING_MAP["normal"])
    font_main, font_sans, font_mono = FONT_STYLES.get(font_key, FONT_STYLES["serif"])

    p = data.get("personal", {})
    name = _escape_latex(p.get("name", "Your Name"))
    email = _escape_latex(p.get("email", ""))
    phone = _escape_latex(p.get("phone", ""))
    linkedin = _escape_latex(p.get("linkedin", ""))
    website = _escape_latex(p.get("website", ""))
    address = _escape_latex(p.get("address", ""))
    title = _escape_latex(p.get("title", ""))
    summary = _escape_latex(data.get("summary", ""))

    tex = f"""\\documentclass[10pt,a4paper]{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage[margin={margin}]{{geometry}}
\\usepackage{{hyperref}}
\\usepackage{{xcolor}}
\\usepackage{{titlesec}}
\\usepackage{{enumitem}}
\\hypersetup{{hidelinks=true}}
\\pagestyle{{empty}}
\\setlength{{\\parindent}}{{0pt}}
\\setlength{{\\parskip}}{{{par_skip}}}
\\setlength{{\\itemsep}}{{{item_sep}}}

\\definecolor{{primary}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}
\\definecolor{{heading}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}

\\titleformat{{\\section}}{{\\normalfont\\Large\\bfseries\\color{{heading}}}}{{}}{{0em}}{{}}[\\vspace{{-0.5em}}\\color{{heading}}\\rule{{\\textwidth}}{{0.5pt}}]
\\titlespacing*{{\\section}}{{0pt}}{{8pt}}{{4pt}}

\\renewcommand{{\\labelitemi}}{{--}}

\\begin{{document}}

\\begin{{center}}
{{\\LARGE \\textbf{{{name}}}}}"""
    if title:
        tex += f" \\\\[4pt]\n{{\\large \\color{{primary}} \\texttt{{{title}}}}}"
    tex += "\n\n"
    contact_parts = []
    if address:
        contact_parts.append(address)
    if phone:
        contact_parts.append(phone)
    if email:
        contact_parts.append(f"\\href{{mailto:{email}}}{{{email}}}")
    if linkedin:
        contact_parts.append(f"\\href{{https://linkedin.com/in/{linkedin}}}{{linkedin.com/in/{linkedin}}}")
    if website:
        w = website.replace("https://", "").replace("http://", "")
        contact_parts.append(f"\\href{{{website}}}{{{w}}}")
    if contact_parts:
        mid_sep = " $\\mid$ "
        tex += f"\\vspace{{2pt}}\n{mid_sep.join(contact_parts)}\n"
    tex += "\\end{center}\n\n"

    if summary:
        tex += f"\\section*{{Professional Summary}}\n{summary}\n\n"

    skills = data.get("skills", [])
    if skills:
        escaped_skills = [_escape_latex(s) for s in skills]
        tex += f"\\section*{{Technical Skills}}\n{', '.join(escaped_skills)}\n\n"

    for exp in data.get("experience", []):
        company = _escape_latex(exp.get("company", ""))
        role = _escape_latex(exp.get("role", ""))
        location = _escape_latex(exp.get("location", ""))
        sd = _escape_latex(exp.get("start_date", ""))
        ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
        date_str = f"{sd} -- {ed}" if sd else ""
        tex += f"\\section*{{Experience}}\n"
        tex += f"\\textbf{{{role}}} \\hfill {date_str}\\\\\n"
        if company or location:
            tex += f"\\textit{{{company}}}{location and (' — '+location) or ''}\n"
        tex += "\\begin{itemize}\n"
        for b in exp.get("bullets", []):
            tex += f"\\item {_escape_latex(b)}\n"
        tex += "\\end{itemize}\n\n"
        break

    remaining_exp = data.get("experience", [])
    if len(remaining_exp) > 1:
        for exp in remaining_exp[1:]:
            company = _escape_latex(exp.get("company", ""))
            role = _escape_latex(exp.get("role", ""))
            location = _escape_latex(exp.get("location", ""))
            sd = _escape_latex(exp.get("start_date", ""))
            ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            tex += f"\\textbf{{{role}}} \\hfill {date_str}\\\\\n"
            if company:
                tex += f"\\textit{{{company}}}"
                if location:
                    tex += f" — {location}"
                tex += "\n"
            tex += "\\begin{itemize}\n"
            for b in exp.get("bullets", []):
                tex += f"\\item {_escape_latex(b)}\n"
            tex += "\\end{itemize}\n\n"

    edu_data = data.get("education", [])
    if edu_data:
        tex += "\\section*{Education}\n"
        for edu in edu_data:
            inst = _escape_latex(edu.get("institution", ""))
            degree = _escape_latex(edu.get("degree", ""))
            field = _escape_latex(edu.get("field", ""))
            sd = _escape_latex(edu.get("start_date", ""))
            ed = _escape_latex(edu.get("end_date", ""))
            gpa = _escape_latex(edu.get("gpa", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            deg_str = f"{degree}{' in '+field if field else ''}"
            tex += f"\\textbf{{{deg_str}}} \\hfill {date_str}\\\\\n"
            tex += f"\\textit{{{inst}}}\n"
            if gpa:
                tex += f"GPA: {gpa}\n"
            tex += "\\vspace{4pt}\n\n"

    proj_data = data.get("projects", [])
    if proj_data:
        tex += "\\section*{Projects}\n"
        for proj in proj_data:
            pname = _escape_latex(proj.get("name", ""))
            pdesc = _escape_latex(proj.get("description", ""))
            ptech = proj.get("technologies", [])
            tex += f"\\textbf{{{pname}}}\\\\\n"
            if pdesc:
                tex += f"{pdesc}\n"
            if ptech:
                tex += f"\\textit{{Technologies: {', '.join(_escape_latex(t) for t in ptech)}}}\n"
            tex += "\\vspace{4pt}\n\n"

    cert_data = data.get("certifications", [])
    if cert_data:
        tex += "\\section*{Certifications}\n\\begin{itemize}\n"
        for c in cert_data:
            cname = _escape_latex(c.get("name", ""))
            issuer = _escape_latex(c.get("issuer", ""))
            date = _escape_latex(c.get("date", ""))
            parts = [cname]
            if issuer:
                parts.append(issuer)
            if date:
                parts.append(date)
            tex += f"\\item {', '.join(parts)}\n"
        tex += "\\end{itemize}\n\n"

    lang_data = data.get("languages", [])
    if lang_data:
        tex += "\\section*{Languages}\n\\begin{itemize}\n"
        for l in lang_data:
            lang = _escape_latex(l.get("language", ""))
            prof = _escape_latex(l.get("proficiency", ""))
            tex += f"\\item {lang}{' — '+prof if prof else ''}\n"
        tex += "\\end{itemize}\n\n"

    pub_data = data.get("publications", [])
    if pub_data:
        tex += "\\section*{Publications}\n\\begin{itemize}\n"
        for p in pub_data:
            ptitle = _escape_latex(p.get("title", ""))
            venue = _escape_latex(p.get("venue", ""))
            year = _escape_latex(p.get("year", ""))
            parts = [f"\\textit{{{ptitle}}}"]
            if venue:
                parts.append(venue)
            if year:
                parts.append(year)
            tex += f"\\item {', '.join(parts)}\n"
        tex += "\\end{itemize}\n\n"

    award_data = data.get("awards", [])
    if award_data:
        tex += "\\section*{Awards}\n\\begin{itemize}\n"
        for a in award_data:
            aname = _escape_latex(a.get("name", ""))
            issuer = _escape_latex(a.get("issuer", ""))
            year = _escape_latex(a.get("year", ""))
            parts = [aname]
            if issuer:
                parts.append(issuer)
            if year:
                parts.append(year)
            tex += f"\\item {', '.join(parts)}\n"
        tex += "\\end{itemize}\n\n"

    tex += "\\end{document}"
    return tex


def _generate_latex_modern(data: dict, config: dict) -> str:
    color_key = config.get("color", "navy")
    font_key = config.get("font", "sans")
    spacing_key = config.get("spacing", "normal")
    prim_r, prim_g, prim_b = COLOR_RGB.get(color_key, COLOR_RGB["navy"])[0].split(",")
    sec_r, sec_g, sec_b = COLOR_RGB.get(color_key, COLOR_RGB["navy"])[1].split(",")
    margin, par_skip, item_sep, sec_before = SPACING_MAP.get(spacing_key, SPACING_MAP["normal"])

    p = data.get("personal", {})
    name = _escape_latex(p.get("name", "Your Name"))
    email = _escape_latex(p.get("email", ""))
    phone = _escape_latex(p.get("phone", ""))
    linkedin = _escape_latex(p.get("linkedin", ""))
    website = _escape_latex(p.get("website", ""))
    address = _escape_latex(p.get("address", ""))
    title_str = _escape_latex(p.get("title", ""))
    summary = _escape_latex(data.get("summary", ""))

    skills = data.get("skills", [])
    experience = data.get("experience", [])

    meta_lines = []
    if title_str:
        meta_lines.append(f"Status: {title_str}")
    if skills:
        meta_lines.append(f"Skills: {', '.join(skills[:6])}")

    tex_lines = []
    tex_lines.append("\\documentclass[10pt,a4paper]{article}")
    tex_lines.append("\\usepackage[utf8]{inputenc}")
    tex_lines.append("\\usepackage[T1]{fontenc}")
    tex_lines.append(f"\\usepackage[margin={margin},top=1.75cm,bottom=0.6cm]{{geometry}}")
    tex_lines.append("\\usepackage{fancyhdr}")
    tex_lines.append("\\usepackage{xcolor}")
    tex_lines.append("\\usepackage{titlesec}")
    tex_lines.append("\\usepackage{enumitem}")
    tex_lines.append("\\usepackage{hyperref}")
    tex_lines.append("\\usepackage{graphicx}")
    tex_lines.append("\\hypersetup{hidelinks=true}")
    tex_lines.append("\\pagestyle{empty}")
    tex_lines.append("\\setlength{\\parindent}{0pt}")
    tex_lines.append(f"\\setlength{{\\parskip}}{{{par_skip}}}")
    tex_lines.append(f"\\definecolor{{sectcol}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}")
    tex_lines.append(f"\\definecolor{{bgcol}}{{RGB}}{{{sec_r},{sec_g},{sec_b}}}")
    tex_lines.append("\\definecolor{softcol}{RGB}{225,225,225}")
    tex_lines.append("\\renewcommand{\\familydefault}{\\sfdefault}")
    tex_lines.append("\\newcommand{\\cvsection}[1]{")
    tex_lines.append("  \\vspace{12pt}")
    tex_lines.append("  \\noindent\\colorbox{sectcol}{\\makebox[\\textwidth][l]{\\textbf{\\textcolor{white}{\\uppercase{##1}}}}}")
    tex_lines.append("  \\vspace{4pt}")
    tex_lines.append("}")
    tex_lines.append("\\newcommand{\\cvevent}[4]{")
    tex_lines.append("  \\vspace{4pt}")
    tex_lines.append("  \\noindent\\textbf{##2} \\hfill \\textcolor{bgcol}{##1}\\\\")
    tex_lines.append("  \\textit{##3} \\hfill \\textcolor{sectcol}{##4}\\\\[4pt]")
    tex_lines.append("}")
    tex_lines.append("\\begin{document}")
    tex_lines.append("\\pagestyle{fancy}")
    tex_lines.append("\\lhead{}")
    cdot_parts = []
    cdot_parts.append("\\small{" + name + "}")
    if title_str:
        cdot_parts.append(title_str)
    cdot_parts.append("\\textcolor{sectcol}{\\textbf{" + email + "}}")
    if phone:
        cdot_parts.append(phone)
    cdot_sep = " $\\cdot$ "
    tex_lines.append("\\chead{" + cdot_sep.join(cdot_parts) + "}")
    tex_lines.append("\\rhead{}")
    tex_lines.append("\\renewcommand{\\headrulewidth}{0pt}")
    tex_lines.append("")
    tex_lines.append("\\vspace{-20pt}")
    tex_lines.append("\\noindent\\colorbox{bgcol}{\\makebox[\\textwidth][c]{\\HUGE{\\textcolor{white}{\\textsc{" + name + "}}} \\textcolor{sectcol}{\\rule[-1mm]{1mm}{0.9cm}} \\HUGE{\\textcolor{white}{\\textsc{Resume}}}}}")
    if meta_lines:
        for ml in meta_lines[:3]:
            tex_lines.append("")
            tex_lines.append("\\vspace{6pt}")
            tex_lines.append("\\noindent\\textcolor{bgcol}{\\textbf{" + ml + "}}")
    if summary:
        tex_lines.append("")
        tex_lines.append("\\cvsection{Summary}")
        tex_lines.append(summary)
    if skills:
        tex_lines.append("")
        tex_lines.append("\\cvsection{Technical Skills}")
        tex_lines.append(", ".join(_escape_latex(s) for s in skills))
    if experience:
        tex_lines.append("")
        tex_lines.append("\\cvsection{Experience}")
        for exp in experience:
            company = _escape_latex(exp.get("company", ""))
            role = _escape_latex(exp.get("role", ""))
            loc = _escape_latex(exp.get("location", ""))
            sd = _escape_latex(exp.get("start_date", ""))
            ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            bullets = exp.get("bullets", [])
            bullet_str = " \\\\ ".join(_escape_latex(b) for b in bullets[:2])
            tex_lines.append("")
            tex_lines.append(f"\\cvevent{{{date_str}}}{{{role}}}{{{company}}}{{{bullet_str}}}")
    edu_data = data.get("education", [])
    if edu_data:
        tex_lines.append("")
        tex_lines.append("\\cvsection{Education}")
        for edu in edu_data:
            inst = _escape_latex(edu.get("institution", ""))
            degree = _escape_latex(edu.get("degree", ""))
            field = _escape_latex(edu.get("field", ""))
            sd = _escape_latex(edu.get("start_date", ""))
            ed = _escape_latex(edu.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            deg_str = f"{degree}{' in '+field if field else ''}"
            tex_lines.append(f"\\cvevent{{{date_str}}}{{{deg_str}}}{{{inst}}}{{}}")
    tex_lines.append("")
    tex_lines.append("\\null\\vspace{\\fill}")
    tex_lines.append("\\noindent\\colorbox{bgcol}{\\makebox[\\textwidth][c]{\\small \\textcolor{white}{" + (website or "yourwebsite.com") + "} $\\cdot$ \\textcolor{white}{github.com/" + (linkedin or "username") + "}}}")
    tex_lines.append("\\end{document}")
    return "\n".join(tex_lines)


def _generate_latex_minimalistic(data: dict, config: dict) -> str:
    color_key = config.get("color", "slate")
    font_key = config.get("font", "modern")
    spacing_key = config.get("spacing", "normal")
    prim_r, prim_g, prim_b = COLOR_RGB.get(color_key, COLOR_RGB["slate"])[0].split(",")
    margin, par_skip, item_sep, sec_before = SPACING_MAP.get(spacing_key, SPACING_MAP["normal"])

    p = data.get("personal", {})
    name = _escape_latex(p.get("name", "Your Name"))
    email = _escape_latex(p.get("email", ""))
    phone = _escape_latex(p.get("phone", ""))
    linkedin = _escape_latex(p.get("linkedin", ""))
    website = _escape_latex(p.get("website", ""))
    address = _escape_latex(p.get("address", ""))
    title_str = _escape_latex(p.get("title", ""))
    summary = _escape_latex(data.get("summary", ""))

    tex = f"""\\documentclass[10pt,a4paper]{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage[margin={margin}]{{geometry}}
\\usepackage{{xcolor}}
\\usepackage{{titlesec}}
\\usepackage{{enumitem}}
\\usepackage{{hyperref}}
\\usepackage{{fontawesome5}}
\\hypersetup{{hidelinks=true}}
\\pagestyle{{empty}}
\\setlength{{\\parindent}}{{0pt}}
\\setlength{{\\parskip}}{{{par_skip}}}

\\definecolor{{sectcol}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}
\\definecolor{{bgcol}}{{RGB}}{{110,110,110}}
\\definecolor{{softcol}}{{RGB}}{{225,225,225}}

\\newcommand{{\\icon}}[1]{{\\makebox[10pt][c]{{\\textcolor{{sectcol}}{{\\csname fa##1\\endcsname}}}}}}
\\newcommand{{\\icontext}}[2]{{\\icon{{##1}} \\small{{##2}}}}

\\newcommand{{\\cvsection}}[1]{{\\vspace{{8pt}}\\LARGE\\textcolor{{black}}{{\\uppercase{{##1}}}}\\\\[4pt]}}

\\begin{{document}}

\\vspace{{-8pt}}
\\textcolor{{softcol}}{{\\hrule}}
\\noindent\\makebox[\\textwidth][c]{{\\HUGE \\textsc{{{name}}}}}

\\begin{{center}}
\\small \\textsc{{{title_str or 'Professional'}}}
\\end{{center}}

\\begin{{center}}"""
    contact_items = []
    if address:
        contact_items.append(f"\\icontext{{MapMarker}}{{{address}}}")
    if email:
        contact_items.append(f"\\href{{mailto:{email}}}{{\\icontext{{Envelope}}{{{email}}}}}")
    if phone:
        contact_items.append(f"\\icontext{{Mobile}}{{{phone}}}")
    tex += " \\\\[4pt]\n".join(contact_items)

    web_items = []
    if website:
        w = website.replace("https://", "").replace("http://", "")
        web_items.append(f"\\href{{{website}}}{{\\icontext{{MousePointer}}{{{w}}}}}")
    if linkedin:
        web_items.append(f"\\href{{https://linkedin.com/in/{linkedin}}}{{\\icontext{{Linkedin}}{{linkedin.com/in/{linkedin}}}}}")
    if web_items:
        tex += " \\\\[4pt]\n" + " \\\\[2pt]\n".join(web_items)

    tex += "\n\\end{center}\n\\normalsize\n\\textcolor{softcol}{\\hrule}\n\\bigskip\n"
    if summary:
        tex += f"{summary}\n\n"

    skills = data.get("skills", [])
    if skills:
        tex += "\\cvsection{Skills}\n"
        escaped = [_escape_latex(s) for s in skills]
        tex += ", ".join(escaped) + "\n\n"

    for exp in data.get("experience", []):
        company = _escape_latex(exp.get("company", ""))
        role = _escape_latex(exp.get("role", ""))
        loc = _escape_latex(exp.get("location", ""))
        sd = _escape_latex(exp.get("start_date", ""))
        ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
        date_str = f"{sd} -- {ed}" if sd else ""
        tex += f"\\cvsection{{Experience}}\n"
        tex += f"\\textbf{{{role}}} \\hfill {date_str}\\\\\n"
        tex += f"\\textcolor{{bgcol}}{{{company}}}{' | '+loc if loc else ''}\\\\[4pt]\n"
        for b in exp.get("bullets", []):
            tex += f"\\textbullet\\ {_escape_latex(b)}\\\\\n"
        tex += "\\vspace{4pt}\n\n"
        break

    remaining_exp = data.get("experience", [])
    if len(remaining_exp) > 1:
        for exp in remaining_exp[1:]:
            company = _escape_latex(exp.get("company", ""))
            role = _escape_latex(exp.get("role", ""))
            sd = _escape_latex(exp.get("start_date", ""))
            ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            tex += f"\\textbf{{{role}}} \\hfill {date_str}\\\\\n"
            tex += f"\\textcolor{{bgcol}}{{{company}}}\\\\[4pt]\n"
            for b in exp.get("bullets", []):
                tex += f"\\textbullet\\ {_escape_latex(b)}\\\\\n"
            tex += "\\vspace{4pt}\n\n"

    edu_data = data.get("education", [])
    if edu_data:
        tex += "\\cvsection{Education}\n"
        for edu in edu_data:
            inst = _escape_latex(edu.get("institution", ""))
            degree = _escape_latex(edu.get("degree", ""))
            field = _escape_latex(edu.get("field", ""))
            sd = _escape_latex(edu.get("start_date", ""))
            ed = _escape_latex(edu.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            deg_str = f"{degree}{' in '+field if field else ''}"
            tex += f"\\textbf{{{deg_str}}} \\hfill {date_str}\\\\\n"
            tex += f"\\textcolor{{bgcol}}{{{inst}}}\\\\[4pt]\n\n"

    tex += "\\null\\vspace{\\fill}"
    web_display = website or "yourwebsite.com"
    li_display = "linkedin.com/in/" + linkedin if linkedin else "linkedin"
    tex += "\\noindent\\colorbox{white}{\\makebox[\\textwidth][c]{\\textcolor{sectcol}{" + web_display + "} $\\cdot$ \\textcolor{sectcol}{" + li_display + "}}}"
    tex += "\\end{document}"
    return tex


def _generate_latex_sidebar(data: dict, config: dict) -> str:
    color_key = config.get("color", "emerald")
    font_key = config.get("font", "modern")
    spacing_key = config.get("spacing", "compact")
    prim_r, prim_g, prim_b = COLOR_RGB.get(color_key, COLOR_RGB["emerald"])[0].split(",")
    sec_r, sec_g, sec_b = COLOR_RGB.get(color_key, COLOR_RGB["emerald"])[1].split(",")
    margin, par_skip, item_sep, sec_before = SPACING_MAP.get(spacing_key, SPACING_MAP["compact"])

    p = data.get("personal", {})
    name = _escape_latex(p.get("name", "Your Name"))
    email = _escape_latex(p.get("email", ""))
    phone = _escape_latex(p.get("phone", ""))
    linkedin = _escape_latex(p.get("linkedin", ""))
    website = _escape_latex(p.get("website", ""))
    address = _escape_latex(p.get("address", ""))
    title_str = _escape_latex(p.get("title", ""))
    summary = _escape_latex(data.get("summary", ""))

    skills = data.get("skills", [])
    experience = data.get("experience", [])

    tex_lines = []
    tex_lines.append("\\documentclass[10pt,a4paper]{article}")
    tex_lines.append("\\usepackage[utf8]{inputenc}")
    tex_lines.append("\\usepackage[T1]{fontenc}")
    tex_lines.append("\\usepackage[margin=0.4cm,top=1cm,bottom=-0.6cm]{geometry}")
    tex_lines.append("\\usepackage{xcolor}")
    tex_lines.append("\\usepackage{hyperref}")
    tex_lines.append("\\usepackage{graphicx}")
    tex_lines.append("\\usepackage{fontawesome5}")
    tex_lines.append("\\hypersetup{hidelinks=true}")
    tex_lines.append("\\pagestyle{empty}")
    tex_lines.append("\\setlength{\\parindent}{0pt}")
    tex_lines.append(f"\\setlength{{\\parskip}}{{{par_skip}}}")
    tex_lines.append("\\renewcommand{\\familydefault}{\\sfdefault}")
    tex_lines.append(f"\\definecolor{{sectcol}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}")
    tex_lines.append(f"\\definecolor{{bgcol}}{{RGB}}{{{sec_r},{sec_g},{sec_b}}}")
    tex_lines.append("\\definecolor{softcol}{RGB}{225,225,225}")
    tex_lines.append("\\newcommand{\\cvsection}[1]{")
    tex_lines.append("  \\vspace{8pt}")
    tex_lines.append("  \\noindent\\colorbox{sectcol}{\\makebox[\\linewidth][l]{\\textbf{\\textcolor{white}{\\uppercase{##1}}}}}")
    tex_lines.append("}")
    tex_lines.append("\\newcommand{\\icontext}[2]{\\makebox[16pt][c]{\\textcolor{white}{\\csname fa##1\\endcsname}} \\textcolor{white}{##2}}")
    tex_lines.append("\\begin{document}")
    tex_lines.append("\\fcolorbox{white}{white}{\\begin{minipage}[c][0.95\\textheight][t]{0.68\\linewidth}")
    tex_lines.append("")
    tex_lines.append("\\vspace{-3pt}")
    tex_lines.append("\\noindent\\colorbox{bgcol}{\\makebox[\\linewidth][c]{\\HUGE{\\textcolor{white}{\\uppercase{" + name + "}}}}}")
    tex_lines.append("")
    tex_lines.append("\\vspace{8pt}")
    if summary:
        tex_lines.append("\\cvsection{Summary}")
        tex_lines.append(summary)
        tex_lines.append("\\vspace{4pt}")
    if experience:
        tex_lines.append("\\cvsection{Experience}")
        for exp in experience:
            company = _escape_latex(exp.get("company", ""))
            role = _escape_latex(exp.get("role", ""))
            sd = _escape_latex(exp.get("start_date", ""))
            ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            tex_lines.append("")
            tex_lines.append("\\vspace{4pt}")
            tex_lines.append("\\noindent\\textbf{" + role + "} \\hfill \\textcolor{sectcol}{" + company + "}, \\textcolor{bgcol}{" + date_str + "}\\\\")
            for b in exp.get("bullets", []):
                tex_lines.append("\\textbullet\\ " + _escape_latex(b))
    edu_data = data.get("education", [])
    if edu_data:
        tex_lines.append("\\cvsection{Education}")
        for edu in edu_data:
            inst = _escape_latex(edu.get("institution", ""))
            degree = _escape_latex(edu.get("degree", ""))
            field = _escape_latex(edu.get("field", ""))
            sd = _escape_latex(edu.get("start_date", ""))
            ed = _escape_latex(edu.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            deg_str = f"{degree}{' in '+field if field else ''}"
            tex_lines.append("")
            tex_lines.append("\\vspace{4pt}")
            tex_lines.append("\\noindent\\textbf{" + deg_str + "} \\hfill \\textcolor{bgcol}{" + inst + "}, " + date_str)
    tex_lines.append("\\end{minipage}}")
    tex_lines.append("\\fcolorbox{white}{sectcol}{\\begin{minipage}[c][0.95\\textheight][t]{0.30\\linewidth}")
    tex_lines.append("\\vspace{12pt}")
    tex_lines.append("\\begin{center}")
    tex_lines.append("\\large\\textbf{\\textcolor{white}{Contact}}")
    tex_lines.append("\\end{center}")
    tex_lines.append("\\vspace{4pt}")
    tex_lines.append("\\hrule\\vspace{8pt}")
    if address:
        tex_lines.append("\\icontext{MapMarker}{" + address + "}\\\\[6pt]")
    if phone:
        tex_lines.append("\\icontext{Phone}{" + phone + "}\\\\[6pt]")
    if email:
        tex_lines.append("\\icontext{Envelope}{" + email + "}\\\\[6pt]")
    if website:
        w = website.replace("https://","").replace("http://","")
        tex_lines.append("\\icontext{Globe}{" + w + "}\\\\[6pt]")
    if linkedin:
        tex_lines.append("\\icontext{Linkedin}{linkedin.com/in/" + linkedin + "}\\\\[6pt]")
    if skills:
        tex_lines.append("")
        tex_lines.append("\\vspace{12pt}")
        tex_lines.append("\\begin{center}")
        tex_lines.append("\\large\\textbf{\\textcolor{white}{Skills}}")
        tex_lines.append("\\end{center}")
        tex_lines.append("\\vspace{4pt}")
        tex_lines.append("\\hrule\\vspace{8pt}")
        for s in skills[:10]:
            tex_lines.append("\\textcolor{white}{\\textbullet\\ " + _escape_latex(s) + "}\\\\[4pt]")
    tex_lines.append("\\end{minipage}}")
    tex_lines.append("")
    tex_lines.append("\\null\\vspace{\\fill}")
    wd = website or "yourwebsite.com"
    tex_lines.append("\\noindent\\colorbox{bgcol}{\\makebox[\\textwidth][c]{\\small\\textcolor{white}{" + wd + "}}}")
    tex_lines.append("\\end{document}")
    tex = "\n".join(tex_lines)
    return tex


def _generate_latex_two_column(data: dict, config: dict) -> str:
    color_key = config.get("color", "purple")
    prim_r, prim_g, prim_b = COLOR_RGB.get(color_key, COLOR_RGB["purple"])[0].split(",")
    margin, par_skip, item_sep, sec_before = SPACING_MAP.get(config.get("spacing", "spacious"), SPACING_MAP["spacious"])

    p = data.get("personal", {})
    name = _escape_latex(p.get("name", "Your Name"))
    email = _escape_latex(p.get("email", ""))
    phone = _escape_latex(p.get("phone", ""))
    linkedin = _escape_latex(p.get("linkedin", ""))
    website = _escape_latex(p.get("website", ""))
    address = _escape_latex(p.get("address", ""))
    title_str = _escape_latex(p.get("title", ""))
    summary = _escape_latex(data.get("summary", ""))

    skills = data.get("skills", [])
    experience = data.get("experience", [])

    tex_lines = []
    tex_lines.append("\\documentclass[10pt,a4paper]{article}")
    tex_lines.append("\\usepackage[utf8]{inputenc}")
    tex_lines.append("\\usepackage[T1]{fontenc}")
    tex_lines.append(f"\\usepackage[margin={margin}]{{geometry}}")
    tex_lines.append("\\usepackage{xcolor}")
    tex_lines.append("\\usepackage{multicol}")
    tex_lines.append("\\usepackage{hyperref}")
    tex_lines.append("\\usepackage{fontawesome5}")
    tex_lines.append("\\hypersetup{hidelinks=true}")
    tex_lines.append("\\pagestyle{empty}")
    tex_lines.append("\\setlength{\\parindent}{0pt}")
    tex_lines.append(f"\\setlength{{\\parskip}}{{{par_skip}}}")
    tex_lines.append(f"\\definecolor{{sectcol}}{{RGB}}{{{prim_r},{prim_g},{prim_b}}}")
    tex_lines.append("\\newcommand{\\secbox}[1]{\\vspace{8pt}\\noindent\\colorbox{sectcol}{\\makebox[\\linewidth][l]{\\textbf{\\textcolor{white}{\\uppercase{##1}}}}}\\vspace{4pt}}")
    tex_lines.append("\\begin{document}")
    tex_lines.append("\\begin{center}")
    tex_lines.append("{\\LARGE \\textbf{" + name + "}}\\\\[4pt]")
    if title_str:
        tex_lines.append("{\\large \\textcolor{sectcol}{" + title_str + "}}\\\\[4pt]")
    contact_parts = []
    if email:
        contact_parts.append("\\href{mailto:" + email + "}{" + email + "}")
    if phone:
        contact_parts.append(phone)
    if address:
        contact_parts.append(address)
    if contact_parts:
        tex_lines.append(" $\\mid$ ".join(contact_parts) + "\\\\[4pt]")
    web_parts = []
    if website:
        w = website.replace("https://","").replace("http://","")
        web_parts.append("\\href{" + website + "}{" + w + "}")
    if linkedin:
        web_parts.append("\\href{https://linkedin.com/in/" + linkedin + "}{linkedin.com/in/" + linkedin + "}")
    if web_parts:
        tex_lines.append(" $\\mid$ ".join(web_parts))
    tex_lines.append("\\end{center}")
    tex_lines.append("")
    tex_lines.append("\\rule{\\textwidth}{0.5pt}")
    tex_lines.append("")
    if summary:
        tex_lines.append(summary)
        tex_lines.append("")
        tex_lines.append("\\rule{\\textwidth}{0.5pt}")
        tex_lines.append("")
    tex_lines.append("\\begin{multicols}{2}")
    if experience:
        tex_lines.append("\\secbox{Experience}")
        for exp in experience:
            company = _escape_latex(exp.get("company", ""))
            role = _escape_latex(exp.get("role", ""))
            sd = _escape_latex(exp.get("start_date", ""))
            ed = _escape_latex(exp.get("current", False) and "Present" or exp.get("end_date", ""))
            date_str = f"{sd} -- {ed}" if sd else ""
            tex_lines.append("")
            tex_lines.append("\\textbf{" + role + "}\\hfill " + date_str)
            tex_lines.append("\\textit{" + company + "}")
            for b in exp.get("bullets", []):
                tex_lines.append("\\textbullet\\ " + _escape_latex(b))
            tex_lines.append("\\vspace{6pt}")
    if skills:
        tex_lines.append("\\secbox{Skills}")
        escaped = [_escape_latex(s) for s in skills]
        tex_lines.append(", ".join(escaped))
        tex_lines.append("")
    edu_data = data.get("education", [])
    if edu_data:
        tex_lines.append("\\secbox{Education}")
        for edu in edu_data:
            inst = _escape_latex(edu.get("institution", ""))
            degree = _escape_latex(edu.get("degree", ""))
            field = _escape_latex(edu.get("field", ""))
            deg_str = f"{degree}{' in '+field if field else ''}"
            tex_lines.append("")
            tex_lines.append("\\textbf{" + deg_str + "}")
            tex_lines.append("\\textit{" + inst + "}")
            tex_lines.append("\\vspace{4pt}")
    tex_lines.append("\\end{multicols}")
    tex_lines.append("\\end{document}")
    return "\n".join(tex_lines)


def _generate_latex(data: dict, template_id: str, config: dict) -> str:
    base = template_id.split("-")[0] if "-" in template_id else template_id
    base = TEMPLATE_META.get(template_id, {}).get("base_template", base)
    if base == "modern":
        return _generate_latex_modern(data, config)
    elif base == "minimalistic":
        return _generate_latex_minimalistic(data, config)
    elif base == "sidebar" or base == "sidebarleft":
        return _generate_latex_sidebar(data, config)
    elif base == "two_column":
        return _generate_latex_two_column(data, config)
    elif base in ("infographics", "infographics2", "rows"):
        return _generate_latex_classic(data, config)
    else:
        return _generate_latex_classic(data, config)


def _compile_latex(tex_content: str, output_dir: str | Path) -> Path:
    """Compile LaTeX to PDF, falling back to .tex download if pdflatex unavailable."""
    tmp = tempfile.mkdtemp(prefix="latexcv_")
    latex_available = shutil.which("pdflatex") is not None
    try:
        tex_path = Path(tmp) / "main.tex"
        tex_path.write_text(tex_content, encoding="utf-8")
        out_pdf = Path(output_dir) / "resume.pdf"
        out_pdf.parent.mkdir(parents=True, exist_ok=True)
        if not latex_available:
            shutil.copy2(str(tex_path), str(out_pdf.with_suffix(".tex")))
            return out_pdf.with_suffix(".tex")
        timeout = getattr(settings, "LATEX_TIMEOUT", 60)
        for _ in range(2):
            subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"],
                cwd=tmp,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        pdf_path = Path(tmp) / "main.pdf"
        if not pdf_path.exists():
            log_path = Path(tmp) / "main.log"
            log_text = log_path.read_text() if log_path.exists() else "No log generated"
            shutil.copy2(str(tex_path), str(out_pdf.with_suffix(".tex")))
            return out_pdf.with_suffix(".tex")
        shutil.copy2(str(pdf_path), str(out_pdf))
        return out_pdf
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "LaTeX compilation timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Compilation error: {str(e)}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _extract_skills_from_jd(jd_text: str) -> dict:
    jd_lower = jd_text.lower()
    required = []
    preferred = []
    keywords = []
    for industry, skill_list in INDUSTRY_KEYWORDS.items():
        for skill in skill_list:
            if skill in jd_lower and skill not in keywords:
                keywords.append(skill)
    lines = jd_text.split("\n")
    in_required = False
    in_preferred = False
    in_qualifications = False
    for line in lines:
        ll = line.lower().strip()
        if re.search(r"(required|must have|essential|minimum)\s*(qualifications?|skills?)", ll):
            in_required = True
            in_preferred = False
            in_qualifications = True
            continue
        if re.search(r"(preferred|nice to have|bonus|plus|desirable)", ll):
            in_preferred = True
            in_required = False
            continue
        if in_required or in_qualifications:
            words = re.findall(r"[\w#+.]+", line)
            for w in words:
                if w.lower() not in [r.lower() for r in required] and len(w) > 2:
                    required.append(w)
        if in_preferred:
            words = re.findall(r"[\w#+.]+", line)
            for w in words:
                if w.lower() not in [p.lower() for p in preferred] and len(w) > 2:
                    preferred.append(w)
    required = [s for s in required if s.lower() in jd_lower][:20]
    preferred = [s for s in preferred if s.lower() in jd_lower][:15]
    return {
        "required_skills": required or keywords[:15],
        "preferred_skills": preferred or [],
        "keywords": keywords[:30],
        "culture_fit": ["team player", "communication", "problem solving"] if "team" in jd_lower else [],
        "role_level": "mid" if any(w in jd_lower for w in ["senior","lead","principal"]) else "senior" if any(w in jd_lower for w in ["junior","entry"]) else "mid",
        "industry": "tech" if any(k in jd_lower for k in ["python","javascript","software","engineer","developer"]) else "finance" if any(k in jd_lower for k in ["finance","accounting","investment"]) else "general",
    }


def _analyze_jd(job_description: str, company_name: str = "", job_title: str = "") -> dict:
    api_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if api_key:
        try:
            result = analyze_jd_with_gemini(job_description, company_name, job_title, api_key)
            if result and "error" not in result:
                return result
        except Exception:
            pass
    return _extract_skills_from_jd(job_description)


def _optimize_resume_data(resume_data: dict, analysis: dict) -> dict:
    data = resume_data.copy()
    keywords = analysis.get("keywords", []) + analysis.get("required_skills", [])
    existing_skills = set(s.lower() for s in data.get("skills", []))
    new_skills = []
    for kw in keywords:
        if kw.lower() not in existing_skills:
            new_skills.append(kw)
    if new_skills:
        data["skills"] = data.get("skills", []) + new_skills[:10]
    api_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if api_key:
        try:
            result = optimize_resume_with_gemini(data, analysis.get("job_description", ""), api_key)
            if result and "error" not in result:
                return result.get("optimized_resume", data)
        except Exception:
            pass
    return data


# ── Existing Endpoints ──

@router.get("/")
def list_templates():
    return {"success": True, "data": _scan_templates()}


@router.get("/{template_id}")
def get_template(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    tex = _find_tex(tdir)
    if not tex:
        raise HTTPException(404, "main.tex not found for this template")
    return {"success": True, "data": {"tex_content": tex.read_text("utf-8")}}


@router.get("/{template_id}/download")
def download_template(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    tex = _find_tex(tdir)
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
        return Response(content=zip_bytes, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{template_id}-template.zip"'})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@router.get("/{template_id}/preview")
def preview_pdf(template_id: str):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
    pdf = _find_pdf(tdir)
    if not pdf:
        raise HTTPException(404, "No preview PDF available")
    return FileResponse(str(pdf), media_type="application/pdf")


class CompileRequest(BaseModel):
    substitutions: dict = {}


@router.post("/{template_id}/compile")
def compile_template(template_id: str, req: CompileRequest):
    meta = TEMPLATE_META.get(template_id)
    if not meta:
        raise HTTPException(404, f"Template {template_id} not found")
    tdir = LATEX_DIR / meta["base_template"]
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
        timeout = getattr(settings, "LATEX_TIMEOUT", 60)
        for _ in range(2):
            subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"],
                cwd=str(Path(tmp) / subdir),
                capture_output=True, text=True, timeout=timeout,
            )
        pdf_path = Path(tmp) / subdir / "main.pdf"
        if not pdf_path.exists():
            log_path = Path(tmp) / subdir / "main.log"
            log_text = log_path.read_text() if log_path.exists() else "No log"
            raise HTTPException(500, f"LaTeX compilation failed.\n\nLOG:\n{log_text[-3000:]}")
        return Response(
            content=pdf_path.read_bytes(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{template_id}-resume.pdf"'},
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "LaTeX compilation timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Compilation error: {str(e)}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ── Data Models for New Endpoints ──

class PersonalInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    website: str = ""
    address: str = ""
    title: str = ""
    photo: Optional[str] = None

class EducationEntry(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    start_date: str = ""
    end_date: str = ""
    gpa: str = ""
    honors: str = ""
    description: str = ""

class ExperienceEntry(BaseModel):
    company: str = ""
    role: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    bullets: list[str] = []
    technologies: list[str] = []

class ProjectEntry(BaseModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = []
    url: str = ""
    start_date: str = ""
    end_date: str = ""

class CertificationEntry(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""

class LanguageEntry(BaseModel):
    language: str = ""
    proficiency: str = ""

class PublicationEntry(BaseModel):
    title: str = ""
    venue: str = ""
    year: str = ""
    url: str = ""

class AwardEntry(BaseModel):
    name: str = ""
    issuer: str = ""
    year: str = ""

class ResumeData(BaseModel):
    personal: PersonalInfo = PersonalInfo()
    summary: str = ""
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    projects: list[ProjectEntry] = []
    skills: list[str] = []
    certifications: list[CertificationEntry] = []
    languages: list[LanguageEntry] = []
    publications: list[PublicationEntry] = []
    awards: list[AwardEntry] = []

class CustomCompileRequest(BaseModel):
    template_id: str
    resume_data: ResumeData
    config: dict = {}

class JDAnalyzeRequest(BaseModel):
    job_description: str
    company_name: str = ""
    job_title: str = ""

class ResumeFromJDRequest(BaseModel):
    template_id: str
    job_description: str
    company_name: str = ""
    job_title: str = ""
    resume_data: Optional[ResumeData] = None
    config: dict = {}

class AIOptimizeRequest(BaseModel):
    resume_data: ResumeData
    job_description: str = ""
    company_name: str = ""
    focus_areas: list[str] = []


# ── New Endpoints ──

@router.post("/custom-compile")
def custom_compile(req: CustomCompileRequest):
    meta = TEMPLATE_META.get(req.template_id)
    if not meta:
        raise HTTPException(404, f"Template {req.template_id} not found")
    config = {**meta["config"], **req.config}
    data = req.resume_data.model_dump()
    tex = _generate_latex(data, req.template_id, config)
    tmp = tempfile.mkdtemp(prefix="latexcv_custom_")
    try:
        out = _compile_latex(tex, tmp)
        is_tex = out.suffix == ".tex"
        content = Path(out).read_bytes()
        media = "application/x-latex" if is_tex else "application/pdf"
        ext = "tex" if is_tex else "pdf"
        return Response(
            content=content,
            media_type=media,
            headers={"Content-Disposition": f'attachment; filename="{req.template_id}-resume.{ext}"'},
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@router.post("/analyze-jd")
def analyze_jd_endpoint(req: JDAnalyzeRequest):
    result = _analyze_jd(req.job_description, req.company_name, req.job_title)
    return {"success": True, "data": result}


@router.post("/generate-from-jd")
async def generate_from_jd(req: ResumeFromJDRequest):
    meta = TEMPLATE_META.get(req.template_id)
    if not meta:
        raise HTTPException(404, f"Template {req.template_id} not found")
    analysis = _analyze_jd(req.job_description, req.company_name, req.job_title)
    base_data = req.resume_data.model_dump() if req.resume_data else ResumeData().model_dump()
    optimized = _optimize_resume_data(base_data, {**analysis, "job_description": req.job_description})
    config = {**meta["config"], **req.config}
    tex = _generate_latex(optimized, req.template_id, config)
    tmp = tempfile.mkdtemp(prefix="latexcv_jd_")
    try:
        out = _compile_latex(tex, tmp)
        is_tex = out.suffix == ".tex"
        content = Path(out).read_bytes()
        media = "application/x-latex" if is_tex else "application/pdf"
        ext = "tex" if is_tex else "pdf"
        return Response(
            content=content,
            media_type=media,
            headers={"Content-Disposition": f'attachment; filename="{req.template_id}-tailored-resume.{ext}"'},
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@router.post("/ai-optimize")
def ai_optimize(req: AIOptimizeRequest):
    data = req.resume_data.model_dump()
    api_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    optimized = data
    suggestions = []
    if api_key:
        try:
            result = optimize_resume_with_gemini(data, req.job_description, api_key)
            if result and "error" not in result:
                optimized = result.get("optimized_resume", data)
                suggestions = result.get("suggestions", [])
        except Exception as e:
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


@router.get("/search")
def search_templates(q: str = "", industry: str = "", role: str = "", style: str = "", experience: str = "", min_ats: int = 0, sort: str = "popular"):
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
