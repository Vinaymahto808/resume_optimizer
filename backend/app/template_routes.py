import json
from io import BytesIO
from html import escape as html_escape
from urllib.parse import quote as url_quote
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.models import User
from app.auth import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])

TEMPLATE_LAYOUT_BY_ID = {
    "simple-clean": "simple", "simple-minimal": "simple", "simple-basic": "simple", "simple-light": "simple",
    "modern-pro": "modern", "modern-sleek": "modern", "modern-vibrant": "modern", "modern-edge": "modern",
    "onecol-executive": "onecol", "onecol-professional": "onecol", "onecol-corporate": "onecol",
    "photo-profile": "photo", "photo-visual": "photo",
    "pro-classic": "professional", "pro-elegant": "professional", "pro-premium": "professional",
    "ats-optimized": "ats", "ats-max": "ats", "ats-ultra": "ats",
}

TEMPLATE_COLORS = {
    "simple-clean": "#475569", "simple-minimal": "#334155", "simple-basic": "#64748b", "simple-light": "#94a3b8",
    "modern-pro": "#4f46e5", "modern-sleek": "#0d9488", "modern-vibrant": "#0891b2", "modern-edge": "#7c3aed",
    "onecol-executive": "#1e293b", "onecol-professional": "#334155", "onecol-corporate": "#0f172a",
    "photo-profile": "#4f46e5", "photo-visual": "#0d9488",
    "pro-classic": "#1e40af", "pro-elegant": "#4338ca", "pro-premium": "#0f172a",
    "ats-optimized": "#059669", "ats-max": "#0d9488", "ats-ultra": "#047857",
}

TEMPLATE_DISPLAY_NAMES = {
    "simple-clean": "Simple Clean", "simple-minimal": "Simple Minimal", "simple-basic": "Simple Basic", "simple-light": "Simple Light",
    "modern-pro": "Modern Pro", "modern-sleek": "Modern Sleek", "modern-vibrant": "Modern Vibrant", "modern-edge": "Modern Edge",
    "onecol-executive": "Executive", "onecol-professional": "Professional", "onecol-corporate": "Corporate",
    "photo-profile": "Profile Plus", "photo-visual": "Visual CV",
    "pro-classic": "Classic Pro", "pro-elegant": "Elegant Pro", "pro-premium": "Premium",
    "ats-optimized": "ATS Optimized", "ats-max": "ATS Max", "ats-ultra": "ATS Ultra",
}

TEMPLATE_FAMILY_BY_ID = {
    "monochrome": "minimalist",
    "midnight": "minimalist",
    "executive-luxe": "minimalist",
    "celestial": "balanced",
    "aurora-technical": "balanced",
    "verdant": "creative",
    "editorial-vertical": "creative",
}

TEMPLATE_THEMES = {
    "minimalist": {
        "label": "Minimalist & Single-Column",
        "accent": "#334155",
        "accent_soft": "rgba(51,65,85,0.12)",
        "accent_2": "#0f172a",
        "page_bg": "#edf2f7",
        "surface": "#ffffff",
        "ink": "#0f172a",
        "muted": "#475569",
        "panel": "#f8fafc",
        "panel_2": "#e2e8f0",
        "hero_bg": "linear-gradient(135deg, #0f172a 0%, #1f2937 100%)",
        "chip_bg": "rgba(51,65,85,0.08)",
        "chip_text": "#334155",
        "badge_bg": "rgba(51,65,85,0.1)",
        "latex_rgb": "41, 71, 135",
    },
    "balanced": {
        "label": "Balanced Two-Column",
        "accent": "#1d4ed8",
        "accent_soft": "rgba(29,78,216,0.12)",
        "accent_2": "#0f766e",
        "page_bg": "#dfe9f5",
        "surface": "#ffffff",
        "ink": "#0f172a",
        "muted": "#475569",
        "panel": "#f8fafc",
        "panel_2": "#dbeafe",
        "hero_bg": "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
        "chip_bg": "rgba(29,78,216,0.08)",
        "chip_text": "#1d4ed8",
        "badge_bg": "rgba(29,78,216,0.1)",
        "latex_rgb": "31, 78, 216",
    },
    "creative": {
        "label": "Creative / Media",
        "accent": "#0f766e",
        "accent_soft": "rgba(15,118,110,0.12)",
        "accent_2": "#7c3aed",
        "page_bg": "#eef2ff",
        "surface": "#ffffff",
        "ink": "#111827",
        "muted": "#4b5563",
        "panel": "#f8fafc",
        "panel_2": "#e0f2fe",
        "hero_bg": "linear-gradient(135deg, #0f766e 0%, #7c3aed 100%)",
        "chip_bg": "rgba(15,118,110,0.08)",
        "chip_text": "#0f766e",
        "badge_bg": "rgba(15,118,110,0.1)",
        "latex_rgb": "15, 118, 110",
    },
}

def _escape_html(value) -> str:
    return html_escape("" if value is None else str(value), quote=True)

def _escape_latex(value) -> str:
    text = "" if value is None else str(value)
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in text)

def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    cleaned = []
    for char in value:
        cleaned.append(char if char.isalnum() or char in {"-", "_"} else "_")
    slug = "".join(cleaned).strip("_")
    return slug or "resume"

def _resolve_template_context(template_id: str, requested_family: str = ""):
    family = (requested_family or TEMPLATE_FAMILY_BY_ID.get(template_id) or "minimalist").lower()
    theme = TEMPLATE_THEMES.get(family, TEMPLATE_THEMES["minimalist"])
    template_name = TEMPLATE_DISPLAY_NAMES.get(template_id, template_id.replace("-", " ").title())
    return family, theme, template_name

def _contact_url(platform: str, value: str) -> str:
    safe_value = url_quote(value.strip(), safe="-_.~")
    return f"https://{platform}/{safe_value}"

def _render_contact_chips(data) -> str:
    chips = []
    if data.phone:
        chips.append(f'<span class="contact-chip">{_escape_html(data.phone)}</span>')
    if data.email:
        chips.append(f'<a class="contact-chip contact-link" href="mailto:{_escape_html(data.email)}">{_escape_html(data.email)}</a>')
    if data.location:
        chips.append(f'<span class="contact-chip">{_escape_html(data.location)}</span>')
    if data.linkedin:
        chips.append(
            f'<a class="contact-chip contact-link" href="{_contact_url("linkedin.com/in", data.linkedin)}">LinkedIn</a>'
        )
    if data.github:
        chips.append(
            f'<a class="contact-chip contact-link" href="{_contact_url("github.com", data.github)}">GitHub</a>'
        )
    return "".join(chips)

def _render_skill_chips(skills) -> str:
    if not skills:
        return '<div class="section-empty">No skills added yet.</div>'
    return "".join(f'<span class="skill-chip">{_escape_html(skill)}</span>' for skill in skills)

def _render_bullets(bullets) -> str:
    if not bullets:
        return ""
    items = "".join(f"<li>{_escape_html(item)}</li>" for item in bullets if item)
    return f'<ul class="bullets">{items}</ul>' if items else ""

def _render_experience_entries(experience) -> str:
    if not experience:
        return '<div class="section-empty">Add work history to surface impact and outcomes.</div>'
    items = []
    for exp in experience:
        bullets = _render_bullets(exp.get("bullets", []))
        items.append(
            f'''
            <div class="entry">
              <div class="entry-head">
                <strong>{_escape_html(exp.get("company", ""))}</strong>
                <span>{_escape_html(exp.get("dates", ""))}</span>
              </div>
              <div class="entry-sub">
                <em>{_escape_html(exp.get("role", ""))}</em>
                <span>{_escape_html(exp.get("location", ""))}</span>
              </div>
              {bullets}
            </div>
            '''
        )
    return "".join(items)

def _render_education_entries(education) -> str:
    if not education:
        return '<div class="section-empty">Add education details when available.</div>'
    items = []
    for edu in education:
        items.append(
            f'''
            <div class="entry">
              <div class="entry-head">
                <strong>{_escape_html(edu.get("degree", ""))}</strong>
                <span>{_escape_html(edu.get("dates", ""))}</span>
              </div>
              <div class="entry-sub">
                <span>{_escape_html(edu.get("school", ""))}</span>
                <span>{_escape_html(edu.get("gpa", ""))}</span>
              </div>
            </div>
            '''
        )
    return "".join(items)

def _render_projects_entries(projects) -> str:
    if not projects:
        return '<div class="section-empty">Add projects to show portfolio depth.</div>'
    items = []
    for proj in projects:
        bullets = _render_bullets(proj.get("bullets", []))
        items.append(
            f'''
            <div class="entry">
              <div class="entry-head">
                <strong>{_escape_html(proj.get("name", ""))}</strong>
                <span>{_escape_html(proj.get("role", ""))}</span>
              </div>
              {bullets}
            </div>
            '''
        )
    return "".join(items)

def _render_list_entries(items, empty_text: str) -> str:
    if not items:
        return f'<div class="section-empty">{_escape_html(empty_text)}</div>'
    return "".join(f'<div class="entry item-entry">{_escape_html(item)}</div>' for item in items)

def _panel(title: str, content: str, panel_class: str = "section-card") -> str:
    return f'''
    <section class="{panel_class}">
      <div class="section-title">{_escape_html(title)}</div>
      {content}
    </section>
    '''

def _resume_style(theme: dict) -> str:
    return f"""
      @page {{ margin: 0.55in; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      body {{
        background: {theme["page_bg"]};
        font-family: Inter, "Helvetica Neue", Arial, sans-serif;
        color: {theme["ink"]};
        line-height: 1.45;
      }}
      a {{ color: inherit; text-decoration: none; }}
      .sheet {{
        max-width: 760px;
        margin: 0 auto;
        background: {theme["surface"]};
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
      }}
      .hero {{
        padding: 28px 30px;
        color: #fff;
        background: {theme["hero_bg"]};
      }}
      .hero-label {{
        display: inline-flex;
        align-items: center;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        margin-bottom: 12px;
      }}
      .hero-name {{
        font-size: 27px;
        font-weight: 800;
        line-height: 1.05;
        margin-bottom: 6px;
      }}
      .hero-role {{
        font-size: 13px;
        font-weight: 600;
        opacity: 0.93;
        margin-bottom: 10px;
      }}
      .hero-summary {{
        font-size: 11.5px;
        max-width: 620px;
        opacity: 0.92;
      }}
      .hero-footer {{
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }}
      .contact-chip, .skill-chip {{
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
      }}
      .contact-chip {{
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
      }}
      .contact-link:hover {{ background: rgba(255, 255, 255, 0.2); }}
      .body {{
        padding: 24px 28px 28px;
      }}
      .body-grid {{
        display: grid;
        gap: 14px;
      }}
      .layout-balanced .body-grid {{
        grid-template-columns: minmax(200px, 0.82fr) minmax(0, 1.18fr);
      }}
      .layout-creative .body-grid {{
        grid-template-columns: minmax(0, 1.08fr) minmax(200px, 0.78fr);
      }}
      .stack {{
        display: flex;
        flex-direction: column;
        gap: 12px;
      }}
      .section-card {{
        background: {theme["panel"]};
        border: 1px solid {theme["panel_2"]};
        border-radius: 18px;
        padding: 15px 16px;
      }}
      .side-card {{
        background: linear-gradient(180deg, {theme["accent_2"]} 0%, {theme["accent"]} 100%);
        color: #fff;
        border: none;
      }}
      .section-title {{
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: {theme["accent"]};
      }}
      .side-card .section-title {{
        color: rgba(255, 255, 255, 0.92);
      }}
      .section-title::after {{
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(148, 163, 184, 0.24);
      }}
      .side-card .section-title::after {{
        background: rgba(255, 255, 255, 0.18);
      }}
      .section-empty {{
        font-size: 11px;
        color: {theme["muted"]};
      }}
      .side-card .section-empty {{
        color: rgba(255, 255, 255, 0.8);
      }}
      .chip-row {{
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }}
      .skill-chip {{
        background: {theme["chip_bg"]};
        color: {theme["chip_text"]};
        border: 1px solid rgba(148, 163, 184, 0.12);
      }}
      .side-card .skill-chip {{
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.12);
      }}
      .entry {{
        padding-top: 10px;
        margin-top: 10px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }}
      .entry:first-child {{
        padding-top: 0;
        margin-top: 0;
        border-top: none;
      }}
      .entry-head {{
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        font-weight: 700;
      }}
      .entry-sub {{
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 4px;
        font-size: 10px;
        color: {theme["muted"]};
      }}
      .side-card .entry-sub {{
        color: rgba(255, 255, 255, 0.82);
      }}
      .bullets {{
        margin: 8px 0 0 15px;
        padding: 0;
      }}
      .bullets li {{
        margin-bottom: 3px;
        font-size: 11px;
        line-height: 1.42;
      }}
      .hero-variant-minimalist .hero-footer,
      .hero-variant-creative .hero-footer {{
        margin-top: 18px;
      }}
      .hero-variant-balanced {{
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-end;
      }}
      .hero-variant-balanced .hero-copy {{
        max-width: 56%;
      }}
      .hero-tag {{
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        margin-bottom: 12px;
      }}
      .hero-stats {{
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }}
      .stat-pill {{
        display: inline-flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 10px;
        font-weight: 700;
      }}
      .hero-band {{
        margin-bottom: 10px;
      }}
    """

TEMPLATES = [
    {
        "id": "monochrome",
        "name": "Monochrome",
        "description": "Clean minimal layout with strong typography for maximum ATS readability.",
        "color": "#334155",
        "family": "minimalist",
        "mono": True,
        "formats": ["PDF", "DOCX"],
        "features": ["100% ATS-safe", "Minimal design", "Plain text export", "Single column"],
        "is_pro": False,
    },
    {
        "id": "celestial",
        "name": "Celestial",
        "description": "Soft neutral tones with refined typography for a sophisticated professional feel.",
        "color": "#4f7dff",
        "family": "balanced",
        "mono": False,
        "formats": ["PDF", "DOCX"],
        "features": ["ATS-optimized layout", "Modern design", "Free font pairing", "Two column"],
        "is_pro": False,
    },
    {
        "id": "midnight",
        "name": "Midnight",
        "description": "Dark, bold header with high-contrast body for a commanding executive presence.",
        "color": "#1e293b",
        "family": "minimalist",
        "mono": True,
        "formats": ["PDF", "DOCX"],
        "features": ["Executive style", "High contrast", "Header accent bar", "Single column"],
        "is_pro": True,
    },
    {
        "id": "verdant",
        "name": "Verdant",
        "description": "Fresh green accents paired with clean sans-serif for creative and green industry roles.",
        "color": "#059669",
        "family": "creative",
        "mono": False,
        "formats": ["PDF", "DOCX"],
        "features": ["Color accent", "Modern sans-serif", "Skills grid", "Two column"],
        "is_pro": True,
    },
]

class ResumeData(BaseModel):
    template_id: str
    layout_family: str = ""
    full_name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)

@router.get("/")
def list_templates():
    return TEMPLATES

@router.post("/generate")
def generate_resume(data: ResumeData, user: User = Depends(get_current_user)):
    family, theme, template_name = _resolve_template_context(data.template_id, data.layout_family)
    latex = _build_latex(data, family, theme, template_name)
    return {
        "latex": latex,
        "filename": f"{_slugify(f'resume-{data.template_id}')}.tex",
        "layout_family": family,
        "template_name": template_name,
    }

def _build_latex(data: ResumeData, family: str = "", theme: dict | None = None, template_name: str = "") -> str:
    if theme is None:
        family, theme, template_name = _resolve_template_context(data.template_id, data.layout_family)

    name = _escape_latex(data.full_name)
    email = _escape_latex(data.email)
    phone = _escape_latex(data.phone)
    location = _escape_latex(data.location)
    linkedin = _escape_latex(data.linkedin)
    github = _escape_latex(data.github)
    summary = _escape_latex(data.summary)
    skills = [_escape_latex(skill) for skill in data.skills]

    contact_parts = []
    if phone:
        contact_parts.append(phone)
    if email:
        contact_parts.append(rf"\href{{mailto:{email}}}{{{email}}}")
    if location:
        contact_parts.append(location)
    if linkedin:
        linkedin_url = url_quote(data.linkedin, safe="-_.~")
        contact_parts.append(rf"\href{{https://linkedin.com/in/{linkedin_url}}}{{linkedin.com/in/{linkedin}}}")
    if github:
        github_url = url_quote(data.github, safe="-_.~")
        contact_parts.append(rf"\href{{https://github.com/{github_url}}}{{github.com/{github}}}")
    contact_line = " $\\vert$ ".join(contact_parts)

    lines = [
        r"\documentclass[letterpaper,10pt]{article}",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage{mathptmx}",
        r"\usepackage{xcolor}",
        r"\usepackage{titlesec}",
        r"\usepackage{hyperref}",
        r"\usepackage{enumitem}",
        rf"\definecolor{{atsblue}}{{RGB}}{{{theme['latex_rgb']}}}",
        r"\pagestyle{empty}",
        r"\setlength{\oddsidemargin}{-0.8in}",
        r"\setlength{\textwidth}{8.1in}",
        r"\setlength{\topmargin}{-0.8in}",
        r"\setlength{\textheight}{10.2in}",
        r"\raggedright",
        r"\setlength{\tabcolsep}{0in}",
        r"\setlength{\parskip}{0pt}",
        r"\renewcommand{\baselinestretch}{0.95}",
        r"\titleformat{\section}{\vspace{-8pt}\scshape\raggedright\small\bfseries\color{atsblue}}{}{0em}{}[\titlerule\vspace{-4pt}]",
        r"\renewcommand\labelitemi{\fontsize{6}{6}\selectfont\textcolor{atsblue}{\textbullet}}",
        r"\pdfgentounicode=1",
        r"\begin{document}",
        r"",
        r"\begin{center}",
        rf"  {{\Large \textbf{{\color{{atsblue}}{name}}}}}\par",
        r"  \vspace{-2pt}",
    ]

    if contact_line:
        lines.append(rf"  {{\fontsize{{7.5}}{{8.5}}\selectfont {contact_line}}}")

    lines.extend([
        r"\end{center}",
        r"",
    ])

    if summary:
        lines.extend([
            r"\section{Professional Summary}",
            rf"{{\fontsize{{8}}{{9.5}}\selectfont {summary}}}",
            r"",
        ])

    if skills:
        skills_text = " \quad ".join(f"\\textbf{{{skill}}}" for skill in skills)
        lines.extend([
            r"\section{Technical Skills}",
            rf"{{\fontsize{{7.5}}{{8.5}}\selectfont {skills_text}}}",
            r"",
        ])

    if data.experience:
        lines.append(r"\section{Experience}")
        for exp in data.experience:
            company = _escape_latex(exp.get("company", ""))
            dates = _escape_latex(exp.get("dates", ""))
            role = _escape_latex(exp.get("role", ""))
            location_text = _escape_latex(exp.get("location", ""))
            lines.extend([
                r"\noindent\begin{tabular*}{\linewidth}{l@{\extracolsep{\fill}}r}",
                rf"  {{\fontsize{{8}}{{9.5}}\selectfont\textbf{{{company}}}}} & {{\fontsize{{7}}{{8.5}}\selectfont {dates}}} \\",
                rf"  {{\fontsize{{7}}{{8.5}}\selectfont\textit{{{role}}}}} & {{\fontsize{{7}}{{8.5}}\selectfont {location_text}}} \\",
                r"\end{tabular*}",
                r"\begin{itemize}[leftmargin=0.12in,itemsep=0pt,topsep=0pt]",
            ])
            for bullet in exp.get("bullets", []):
                lines.append(rf"  \item {{\fontsize{{7}}{{8.5}}\selectfont {_escape_latex(bullet)}}}")
            lines.extend([r"\end{itemize}", r""])

    if data.education:
        lines.append(r"\section{Education}")
        for edu in data.education:
            degree = _escape_latex(edu.get("degree", ""))
            dates = _escape_latex(edu.get("dates", ""))
            school = _escape_latex(edu.get("school", ""))
            gpa = _escape_latex(edu.get("gpa", ""))
            lines.extend([
                rf"{{\fontsize{{8}}{{9.5}}\selectfont\textbf{{{degree}}}\hfill\textit{{{dates}}}}}",
                rf"{{\fontsize{{7.5}}{{8.5}}\selectfont {school} \hfill {gpa}}}",
                r"",
            ])

    if data.projects:
        lines.append(r"\section{Projects}")
        for proj in data.projects:
            name_text = _escape_latex(proj.get("name", ""))
            lines.extend([
                rf"{{\fontsize{{7.5}}{{9}}\selectfont\textbf{{{name_text}}}}}",
                r"\begin{itemize}[leftmargin=0.12in,itemsep=0pt,topsep=0pt]",
            ])
            for bullet in proj.get("bullets", []):
                lines.append(rf"  \item {{\fontsize{{7}}{{8.5}}\selectfont {_escape_latex(bullet)}}}")
            lines.extend([r"\end{itemize}", r""])

    if data.certifications:
        lines.extend([
            r"\section{Certifications}",
            r"\begin{itemize}[leftmargin=0.2in,itemsep=0pt,topsep=0pt]",
        ])
        for cert in data.certifications:
            lines.append(rf"  \item {{\fontsize{{7.5}}{{9}}\selectfont {_escape_latex(cert)}}}")
        lines.extend([r"\end{itemize}", r""])

    if data.achievements:
        lines.extend([
            r"\section{Achievements}",
            r"\begin{itemize}[leftmargin=0.2in,itemsep=0pt,topsep=0pt]",
        ])
        for ach in data.achievements:
            lines.append(rf"  \item {{\fontsize{{7.5}}{{9}}\selectfont {_escape_latex(ach)}}}")
        lines.extend([r"\end{itemize}", r""])

    lines.append(r"\end{document}")
    return "\n".join(lines)

@router.post("/generate-pdf")
def generate_pdf(data: ResumeData, user: User = Depends(get_current_user)):
    family, theme, template_name = _resolve_template_context(data.template_id, data.layout_family)
    html = _build_html(data, family, theme, template_name)
    return {
        "html": html,
        "filename": f"{_slugify(f'resume-{data.template_id}')}.pdf",
        "layout_family": family,
        "template_name": template_name,
    }

def _render_snapshot_panel(data: ResumeData) -> str:
    summary = _escape_html(data.summary) if data.summary else "Use this space for a concise summary that highlights impact, strengths, and the role you want next."
    highlight_chips = "".join(
        f'<span class="skill-chip">{_escape_html(skill)}</span>' for skill in data.skills[:3]
    )
    highlights = f'<div class="chip-row">{highlight_chips}</div>' if highlight_chips else ""
    return _panel("Profile Snapshot", f'<p class="section-copy">{summary}</p>{highlights}')

def _render_skill_panel(data: ResumeData, panel_class: str = "section-card") -> str:
    if not data.skills:
        return _panel("Skills", '<div class="section-empty">No skills added yet.</div>', panel_class)
    return _panel("Skills", f'<div class="chip-row">{_render_skill_chips(data.skills)}</div>', panel_class)

def _render_cards_for_order(data: ResumeData, order: list[tuple[str, str]]) -> list[str]:
    cards: list[str] = []
    for section, placement in order:
        if section == "snapshot":
            cards.append(_render_snapshot_panel(data))
        elif section == "skills":
            cards.append(_render_skill_panel(data, placement))
        elif section == "experience":
            cards.append(_panel("Experience", _render_experience_entries(data.experience), placement))
        elif section == "education":
            cards.append(_panel("Education", _render_education_entries(data.education), placement))
        elif section == "projects":
            cards.append(_panel("Projects", _render_projects_entries(data.projects), placement))
        elif section == "certifications":
            cards.append(_panel("Certifications", _render_list_entries(data.certifications, "No certifications added yet."), placement))
        elif section == "achievements":
            cards.append(_panel("Achievements", _render_list_entries(data.achievements, "No achievements added yet."), placement))
    return cards

def _html_document(title: str, theme: dict, family_class: str, body_html: str) -> str:
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{_escape_html(title)}</title>
<style>
{_resume_style(theme)}
  .section-copy {{
    font-size: 11.5px;
    color: {theme["muted"]};
    margin-bottom: 10px;
  }}
  .hero-variant-minimalist {{
    display: block;
  }}
  .hero-variant-balanced .hero-copy {{
    max-width: 56%;
  }}
  .hero-variant-creative {{
    position: relative;
  }}
  .hero-variant-creative::before {{
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: rgba(255, 255, 255, 0.22);
  }}
</style>
</head>
<body>
  <div class="sheet {family_class}">
    {body_html}
  </div>
</body>
</html>'''

def _build_html_minimalist(data: ResumeData, theme: dict, template_name: str) -> str:
    hero = f'''
    <header class="hero hero-variant-minimalist">
      <div class="hero-label">{_escape_html(theme["label"])} • {_escape_html(template_name)}</div>
      <div class="hero-name">{_escape_html(data.full_name)}</div>
      <div class="hero-role">ATS-ready resume</div>
      <p class="hero-summary">{_escape_html(data.summary) if data.summary else "A concise summary that makes the role, value, and direction immediately clear."}</p>
      <div class="hero-footer">
        {_render_contact_chips(data)}
      </div>
      <div class="hero-footer">
        <span class="stat-pill">ATS optimized</span>
        <span class="stat-pill">PDF & DOCX</span>
        <span class="stat-pill">{_escape_html(theme["label"])}</span>
      </div>
    </header>
    '''
    cards = _render_cards_for_order(data, [
        ("snapshot", "section-card"),
        ("skills", "section-card"),
        ("experience", "section-card"),
        ("education", "section-card"),
        ("projects", "section-card"),
        ("certifications", "section-card"),
        ("achievements", "section-card"),
    ])
    body = f'''
    {hero}
    <div class="body">
      <div class="stack">
        {"".join(cards)}
      </div>
    </div>
    '''
    return _html_document(f"{template_name} Resume", theme, "layout-minimalist", body)

def _build_html_balanced(data: ResumeData, theme: dict, template_name: str) -> str:
    hero = f'''
    <header class="hero hero-variant-balanced">
      <div class="hero-copy">
        <div class="hero-tag">{_escape_html(theme["label"])} • {_escape_html(template_name)}</div>
        <div class="hero-name">{_escape_html(data.full_name)}</div>
        <div class="hero-role">ATS-ready resume</div>
        <p class="hero-summary">{_escape_html(data.summary) if data.summary else "A balanced structure that keeps qualifications easy to skim while still feeling polished and modern."}</p>
        <div class="hero-footer">
          {_render_contact_chips(data)}
        </div>
      </div>
      <div class="hero-stats">
        <span class="stat-pill">Two-column layout</span>
        <span class="stat-pill">ATS ready</span>
        <span class="stat-pill">PDF & DOCX</span>
      </div>
    </header>
    '''
    body = f'''
    {hero}
    <div class="body">
      <div class="body-grid">
        <aside class="stack">
          {"".join(_render_cards_for_order(data, [
            ("skills", "section-card side-card"),
            ("education", "section-card side-card"),
            ("certifications", "section-card side-card"),
            ("achievements", "section-card side-card"),
          ]))}
        </aside>
        <main class="stack">
          {"".join(_render_cards_for_order(data, [
            ("snapshot", "section-card"),
            ("experience", "section-card"),
            ("projects", "section-card"),
          ]))}
        </main>
      </div>
    </div>
    '''
    return _html_document(f"{template_name} Resume", theme, "layout-balanced", body)

def _build_html_creative(data: ResumeData, theme: dict, template_name: str) -> str:
    hero = f'''
    <header class="hero hero-variant-creative">
      <div class="hero-band">
        <div class="hero-label">{_escape_html(theme["label"])} • {_escape_html(template_name)}</div>
      </div>
      <div class="hero-name">{_escape_html(data.full_name)}</div>
      <div class="hero-role">ATS-ready resume</div>
      <p class="hero-summary">{_escape_html(data.summary) if data.summary else "An editorial layout with stronger visual rhythm for marketing, media, and brand-heavy roles."}</p>
      <div class="hero-footer">
        {_render_contact_chips(data)}
      </div>
      <div class="hero-footer">
        <span class="stat-pill">Creative layout</span>
        <span class="stat-pill">Modern structure</span>
        <span class="stat-pill">PDF & DOCX</span>
      </div>
    </header>
    '''
    body = f'''
    {hero}
    <div class="body">
      <div class="body-grid">
        <main class="stack">
          {"".join(_render_cards_for_order(data, [
            ("snapshot", "section-card"),
            ("experience", "section-card"),
            ("projects", "section-card"),
          ]))}
        </main>
        <aside class="stack">
          {"".join(_render_cards_for_order(data, [
            ("skills", "section-card side-card"),
            ("education", "section-card side-card"),
            ("certifications", "section-card side-card"),
            ("achievements", "section-card side-card"),
          ]))}
        </aside>
      </div>
    </div>
    '''
    return _html_document(f"{template_name} Resume", theme, "layout-creative", body)

def _build_html(data: ResumeData, family: str = "", theme: dict | None = None, template_name: str = "") -> str:
    if theme is None:
        family, theme, template_name = _resolve_template_context(data.template_id, data.layout_family)
    family = family or "minimalist"
    if family == "balanced":
        return _build_html_balanced(data, theme, template_name)
    if family == "creative":
        return _build_html_creative(data, theme, template_name)
    return _build_html_minimalist(data, theme, template_name)

def _pdf_style_simple(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{background:{c};padding:10mm 12mm}} .h h1{{color:#fff;font-size:22px;font-weight:800}} .h .s{{color:rgba(255,255,255,.5);font-size:10px}}
.b{{padding:8mm 12mm}} .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:5mm 0 3mm;border-bottom:1px solid #e2e8f0;padding-bottom:1mm}}
.jb{{margin-bottom:3mm}} .jb .t{{font-size:12px;font-weight:600}} .jb .d{{font-size:10px;color:#64748b}} .jb .p{{font-size:10px;color:#64748b;line-height:1.5}}
.k{{display:inline-block;background:#f1f5f9;padding:2px 8px;border-radius:3px;font-size:9px;margin:1px 2px 1px 0;color:#475569}}
"""

def _pdf_html_simple(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    e = data.email or "maya@email.com"
    p = data.phone or "(555) 000-0000"
    l = data.location or "Boston, MA"
    s = _escape_html(data.summary or "Professional with experience in administrative support and team coordination.")
    sk = "".join(f'<span class="k">{_escape_html(skill)}</span>' for skill in data.skills) if data.skills else '<span class="k">Communication</span><span class="k">Leadership</span><span class="k">Analytics</span>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_simple(c)}</style></head><body>
<div class="h"><h1>{n}</h1><div class="s">{_escape_html(data.location or "Product Marketing Manager")} &middot; {e}</div></div>
<div class="b">
<div class="st">Professional Summary</div>
<p style="font-size:11px;color:#64748b;line-height:1.6;margin-bottom:4mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="t">Administrative Assistant</div><div class="d">Redford &amp; Sons, Boston MA &middot; 2021 &mdash; Present</div><div class="p">Coordinate meetings, travel arrangements, and train new staff. Prepare 5+ reports weekly for management.</div></div>
<div class="jb"><div class="t">Secretary</div><div class="d">Bright Spot Ltd, Boston MA &middot; 2018 &mdash; 2021</div><div class="p">Typed correspondence, distributed mail, and managed office communications.</div></div>
<div class="st">Skills</div><div>{sk}</div>
<div class="st">Education</div>
<div class="jb"><div class="t">B.A. in History</div><div class="d">Brown University, Providence RI &middot; 2014 &mdash; 2018</div></div>
</div></body></html>"""

def _pdf_style_modern(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{background:linear-gradient(135deg,{c},{c}cc);padding:10mm 12mm;position:relative;overflow:hidden}}
.h::after{{content:'';position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.06)}}
.h h1{{color:#fff;font-size:26px;font-weight:800}} .h .s{{color:rgba(255,255,255,.6);font-size:11px}}
.h .stats{{display:flex;gap:6mm;margin-top:3mm}} .h .stats div{{text-align:center}}
.h .stats .v{{color:#fff;font-size:16px;font-weight:800}} .h .stats .l{{color:rgba(255,255,255,.4);font-size:8px;text-transform:uppercase;letter-spacing:1px}}
.b{{padding:8mm 12mm;display:flex;gap:6mm}}
.l{{width:55mm}} .l .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:4mm 0 2mm}} .l p{{font-size:10px;color:#64748b;margin:1mm 0}}
.r{{flex:1}} .r .st{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:4mm 0 2mm}}
.jb{{margin-bottom:3mm;padding-left:2mm;border-left:2px solid {c}44}} .jb .t{{font-size:12px;font-weight:600}} .jb .d{{font-size:10px;color:#64748b}} .jb .p{{font-size:10px;color:#64748b;line-height:1.4}}
.k{{display:inline-block;background:{c}11;color:{c};padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;margin:1px 2px 1px 0}}
"""

def _pdf_html_modern(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    s = _escape_html(data.summary or "Product Marketing Manager with 6+ years driving B2B SaaS growth through data-informed campaigns and cross-functional leadership.")
    sk = "".join(f'<span class="k">{_escape_html(skill)}</span>' for skill in data.skills) if data.skills else '<span class="k">GTM Strategy</span><span class="k">Product Marketing</span><span class="k">Data Analysis</span>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_modern(c)}</style></head><body>
<div class="h"><h1>{n}</h1><div class="s">{_escape_html(data.location or "Product Marketing Manager")}</div>
<div class="stats"><div><div class="v">8+</div><div class="l">Years</div></div><div><div class="v">40%</div><div class="l">Growth</div></div><div><div class="v">3</div><div class="l">Launches</div></div></div></div>
<div class="b"><div class="l"><div class="st">Contact</div><p>{_escape_html(data.email or "maya@email.com")}</p><p>{_escape_html(data.phone or "(555) 000-0000")}</p><p>{_escape_html(data.location or "Boston, MA")}</p><div class="st">Skills</div>{sk}</div>
<div class="r"><div class="st">Summary</div><p style="font-size:11px;color:#64748b;line-height:1.6;margin-bottom:3mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="t">Sr. Product Marketing Manager</div><div class="d">TechCorp &middot; 2021 &mdash; Present</div><div class="p">Led GTM strategy for 3 product launches, driving 40% pipeline growth and $2M in new revenue.</div></div>
<div class="jb"><div class="t">Product Marketing Manager</div><div class="d">GrowthIO &middot; 2018 &mdash; 2021</div><div class="p">Developed messaging frameworks and competitive positioning for 5 product lines.</div></div>
<div class="st">Education</div>
<div class="jb"><div class="t">MBA, Marketing</div><div class="d">Harvard Business School &middot; 2014 &mdash; 2018</div></div>
</div></div></body></html>"""

def _pdf_style_onecol(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{background:{c};padding:8mm 12mm;display:flex;justify-content:space-between;align-items:center}}
.h h1{{color:#fff;font-size:22px;font-weight:800;letter-spacing:1px}}
.h .info{{color:rgba(255,255,255,.5);font-size:9px;text-align:right}}
.b{{padding:8mm 12mm}} .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:4mm 0 2mm}}
.jb{{margin-bottom:3mm;padding:2mm 3mm;background:#fafbfc;border-radius:3px;border:1px solid #f1f5f9}}
.jb .t{{font-size:12px;font-weight:600}} .jb .d{{font-size:10px;color:{c};font-weight:500}} .jb .p{{font-size:10px;color:#64748b;line-height:1.4}}
.k{{display:inline-block;background:{c}11;color:{c};padding:2px 10px;border-radius:3px;font-size:9px;font-weight:600;margin:1px 2px}}
"""

def _pdf_html_onecol(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    s = _escape_html(data.summary or "Administrative professional with 4+ years experience in corporate environments.")
    sk = "".join(f'<span class="k">{_escape_html(skill)}</span>' for skill in data.skills) if data.skills else '<span class="k">Analytical Thinking</span><span class="k">Leadership</span><span class="k">Communication</span>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_onecol(c)}</style></head><body>
<div class="h"><h1>{n}</h1><div class="info">{_escape_html(data.email or "maya@email.com")}<br>{_escape_html(data.phone or "(555) 000-0000")}</div></div>
<div class="b">
<div class="st">Professional Summary</div><p style="font-size:11px;color:#64748b;line-height:1.6;margin-bottom:3mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="t">Administrative Assistant</div><div class="d">Redford &amp; Sons, Boston MA</div><div class="p">Coordinate meetings, travel arrangements, and train new staff. Prepare reports for management.</div></div>
<div class="jb"><div class="t">Secretary</div><div class="d">Bright Spot Ltd, Boston MA</div><div class="p">Document preparation, mail distribution, and correspondence management.</div></div>
<div class="st">Core Skills</div><div>{sk}</div>
<div class="st">Education</div>
<div class="jb"><div class="t">B.A. History</div><div class="d">Brown University &middot; 2014 &mdash; 2018</div></div>
</div></body></html>"""

def _pdf_style_photo(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{background:{c};padding:8mm 12mm;display:flex;align-items:center;gap:5mm}}
.h .ph{{width:55px;height:55px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.3);flex-shrink:0}}
.h .ph span{{font-size:22px;font-weight:800;color:#fff}} .h .d h1{{color:#fff;font-size:24px;font-weight:800}} .h .d span{{color:rgba(255,255,255,.6);font-size:11px}}
.b{{padding:8mm 12mm;display:flex;gap:6mm}} .l{{width:55mm}} .l .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:4mm 0 2mm}} .l p{{font-size:10px;color:#64748b;margin:1mm 0}}
.r{{flex:1}} .r .st{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin:4mm 0 2mm}}
.jb{{margin-bottom:3mm;padding:2mm 0;border-bottom:1px solid #f1f5f9}} .jb .t{{font-size:12px;font-weight:600}} .jb .d{{font-size:10px;color:#64748b}} .jb .p{{font-size:10px;color:#64748b}}
"""

def _pdf_html_photo(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    s = _escape_html(data.summary or "Professional with 4+ years of experience in administrative support.")
    sk = "".join(f'<p>{_escape_html(skill)}</p>' for skill in data.skills[:5]) if data.skills else '<p>Communication</p><p>Leadership</p><p>Analytics</p>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_photo(c)}</style></head><body>
<div class="h"><div class="ph"><span>MP</span></div><div class="d"><h1>{n}</h1><span>{_escape_html(data.location or "Product Marketing Manager")}</span></div></div>
<div class="b"><div class="l"><div class="st">Contact</div><p>{_escape_html(data.email or "maya@email.com")}</p><p>{_escape_html(data.phone or "(555) 000-0000")}</p><p>{_escape_html(data.location or "Boston, MA")}</p><div class="st">Skills</div>{sk}</div>
<div class="r"><div class="st">Profile</div><p style="font-size:11px;color:#64748b;line-height:1.5;margin-bottom:3mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="t">Administrative Assistant</div><div class="d">Redford &amp; Sons &middot; 2021 &mdash; Present</div><div class="p">Coordinate meetings, travel, and train new staff.</div></div>
<div class="jb"><div class="t">Secretary</div><div class="d">Bright Spot Ltd &middot; 2018 &mdash; 2021</div><div class="p">Document typing, reports, and correspondence.</div></div>
<div class="st">Education</div>
<div class="jb"><div class="t">B.A. History</div><div class="d">Brown University &middot; 2014 &mdash; 2018</div></div>
</div></div></body></html>"""

def _pdf_style_professional(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{display:flex}} .h .a{{width:6px;background:{c}}}
.h .c{{padding:10mm 12mm;flex:1;background:#fafafa}} .h .c h1{{font-size:28px;font-weight:800}} .h .c span{{font-size:11px;color:#64748b}}
.b{{padding:6mm 12mm 6mm 14mm}} .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:{c};margin:4mm 0 2mm}}
.jb{{margin-bottom:3mm;border-left:1px solid #e2e8f0;padding-left:3mm}} .jb .t{{font-size:12px;font-weight:600}} .jb .d{{font-size:10px;color:#64748b}} .jb .p{{font-size:10px;color:#64748b;line-height:1.4}}
.k{{display:inline-block;border:1px solid {c}44;color:{c};padding:2px 8px;border-radius:2px;font-size:9px;margin:1px 2px;font-weight:500}}
"""

def _pdf_html_professional(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    s = _escape_html(data.summary or "Dedicated professional with 4+ years experience in corporate environments.")
    sk = "".join(f'<span class="k">{_escape_html(skill)}</span>' for skill in data.skills) if data.skills else '<span class="k">Analytical Thinking</span><span class="k">Leadership</span><span class="k">MS Office</span>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_professional(c)}</style></head><body>
<div class="h"><div class="a"></div><div class="c"><h1>{n}</h1><span>{_escape_html(data.location or "Administrative Assistant")} &middot; {_escape_html(data.email or "maya@email.com")}</span></div></div>
<div class="b">
<div class="st">Professional Summary</div><p style="font-size:11px;color:#64748b;line-height:1.6;margin-bottom:3mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="t">Administrative Assistant</div><div class="d">Redford &amp; Sons &middot; 2021 &mdash; Present</div><div class="p">Coordinate executive schedules, travel arrangements, and team training.</div></div>
<div class="jb"><div class="t">Secretary</div><div class="d">Bright Spot Ltd &middot; 2018 &mdash; 2021</div><div class="p">Managed correspondence, prepared reports, and office administration.</div></div>
<div class="st">Skills</div><div>{sk}</div>
<div class="st">Education</div>
<div class="jb"><div class="t">B.A. History, Brown University</div><div class="d">2014 &mdash; 2018</div></div>
</div></body></html>"""

def _pdf_style_ats(c):
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.45;width:210mm;height:297mm}}
.h{{background:{c};padding:6mm 12mm;display:flex;justify-content:space-between;align-items:center}}
.h h1{{color:#fff;font-size:20px;font-weight:700}} .h .st{{font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:2px}}
.info{{background:#f0fdf4;padding:4mm 12mm;font-size:10px;color:#059669;font-weight:600}}
.b{{padding:6mm 12mm}} .st{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:{c};margin:4mm 0 2mm}}
.jb{{display:flex;gap:3mm;margin-bottom:2mm;padding:1.5mm 0;border-bottom:1px solid #f0fdf4}}
.jb .yr{{font-size:9px;color:{c};font-weight:600;min-width:22mm}} .jb .c{{flex:1}} .jb .c .t{{font-size:11px;font-weight:600}} .jb .c .d{{font-size:9px;color:#64748b}} .jb .c .p{{font-size:9px;color:#64748b}}
.k{{display:inline-block;background:#f0fdf4;color:#059669;padding:2px 8px;border-radius:2px;font-size:8px;font-weight:600;margin:1px}}
"""

def _pdf_html_ats(data, c, name):
    n = _escape_html(data.full_name or "Maya Patel")
    s = _escape_html(data.summary or "Results-driven PMM with 6+ years driving B2B SaaS growth.")
    sk = "".join(f'<span class="k">{_escape_html(skill)}</span>' for skill in data.skills) if data.skills else '<span class="k">GTM Strategy</span><span class="k">B2B SaaS</span><span class="k">Product Marketing</span>'
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_pdf_style_ats(c)}</style></head><body>
<div class="h"><h1>{n}</h1><div class="st">ATS-Optimized Resume</div></div>
<div class="info">{_escape_html(data.email or "maya@email.com")} | {_escape_html(data.phone or "(555) 000-0000")} | {_escape_html(data.location or "Boston, MA")}</div>
<div class="b">
<div class="st">Summary</div><p style="font-size:10px;color:#64748b;line-height:1.5;margin-bottom:2mm">{s}</p>
<div class="st">Experience</div>
<div class="jb"><div class="yr">2021 &mdash; Present</div><div class="c"><div class="t">Sr. PMM, TechCorp</div><div class="p">GTM strategy, 40% pipeline growth, 3 product launches.</div></div></div>
<div class="jb"><div class="yr">2018 &mdash; 2021</div><div class="c"><div class="t">PMM, GrowthIO</div><div class="p">Messaging, positioning, 5 product lines.</div></div></div>
<div class="st">Keywords</div><div>{sk}</div>
<div class="st">Education</div>
<div class="jb"><div class="c"><div class="t">MBA, Harvard Business School</div></div></div>
</div></body></html>"""

@router.post("/download-pdf")
def download_pdf(data: ResumeData, user: User = Depends(get_current_user)):
    layout = TEMPLATE_LAYOUT_BY_ID.get(data.template_id, "simple")
    color = TEMPLATE_COLORS.get(data.template_id, "#475569")
    name = TEMPLATE_DISPLAY_NAMES.get(data.template_id, data.template_id)

    builders = {
        "simple": _pdf_html_simple,
        "modern": _pdf_html_modern,
        "onecol": _pdf_html_onecol,
        "photo": _pdf_html_photo,
        "professional": _pdf_html_professional,
        "ats": _pdf_html_ats,
    }
    gen = builders.get(layout, _pdf_html_simple)
    html = gen(data, color, name)

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            pdf_bytes = page.pdf(format="A4", print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            browser.close()
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)}"}

    filename = f"{_slugify(f'resume-{data.template_id}')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

class EducationEntry(BaseModel):
    school: str = ""
    degree: str = ""
    field: str = ""
    gpa: str = ""
    grad_year: str = ""
    start_year: str = ""
    coursework: list[str] = Field(default_factory=list)
    awards: list[str] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)

class ExperienceEntry(BaseModel):
    role: str = ""
    organization: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    bullets: list[str] = Field(default_factory=list)

class ProjectEntry(BaseModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = Field(default_factory=list)
    url: str = ""

class ExtracurricularEntry(BaseModel):
    name: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""

class StudentResumeData(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    goal: str = "college"
    summary: str = ""
    education: list[EducationEntry] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    extracurriculars: list[ExtracurricularEntry] = Field(default_factory=list)
    awards: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)

GOAL_LABELS = {
    "college": "College Admissions",
    "internship": "Internship",
    "first-job": "First Job",
    "part-time": "Part-time Work",
    "scholarship": "Scholarship Application",
    "leadership": "Extracurricular Leadership",
}

STUDENT_THEME = {
    "accent": "#10b981",
    "accent_soft": "rgba(16,185,129,0.1)",
    "accent_2": "#047857",
    "page_bg": "#fafdfa",
    "surface": "#ffffff",
    "ink": "#0f172a",
    "muted": "#475569",
    "panel": "#f8fafc",
    "panel_2": "#d1fae5",
}

def _student_pdf_style():
    c = STUDENT_THEME["accent"]
    return f"""
@page{{margin:0}}*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#0f172a;font-size:10px;line-height:1.45;width:210mm;height:297mm;background:#fff}}
.h{{background:linear-gradient(135deg,#0f172a,#1e293b);padding:7mm 10mm;display:flex;justify-content:space-between;align-items:center}}
.h .l h1{{color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px}}
.h .l .sub{{color:{c};font-size:11px;font-weight:500;margin-top:1mm}}
.h .r{{text-align:right}}
.h .r div{{color:rgba(255,255,255,0.6);font-size:9px;margin:1px 0}}
.goal{{background:{c}11;padding:3mm 10mm;font-size:10px;color:{c};font-weight:600;border-bottom:2px solid {c}44}}
.goal span{{background:{c};color:#fff;padding:1px 8px;border-radius:3px;font-size:8px;font-weight:700;margin-right:4px}}
.b{{padding:4mm 10mm}}
.sec{{margin-bottom:3mm}}
.sec-h{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:{c};margin-bottom:2mm;padding-bottom:0.5mm;border-bottom:1.5px solid {c}44;display:flex;align-items:center;gap:4px}}
.sec-h svg{{width:12px;height:12px;fill:{c}}}
.edu-card{{background:#f8fafc;border-radius:4px;padding:2mm 3mm;margin-bottom:2mm;border-left:3px solid {c};display:flex;justify-content:space-between}}
.edu-card .l .name{{font-size:11px;font-weight:700}}
.edu-card .l .detail{{font-size:9px;color:#475569;margin-top:1mm}}
.edu-card .l .detail span{{display:inline-block;background:{c}11;color:{c};padding:0 4px;border-radius:2px;font-size:8px;font-weight:500;margin:1px 1px 0 0}}
.edu-card .r{{text-align:right;font-size:9px;color:#64748b;white-space:nowrap}}
.edu-card .r .gpa{{font-weight:700;color:{c};font-size:12px}}
.achv span{{display:inline-block;background:#fef9c3;color:#92400e;padding:0 4px;border-radius:2px;font-size:8px;margin:1px 2px 1px 0}}
.exp-item{{margin-bottom:2mm;padding:1.5mm 0;border-bottom:1px solid #f1f5f9}}
.exp-item:last-child{{border-bottom:none}}
.exp-item .top{{display:flex;justify-content:space-between;align-items:baseline}}
.exp-item .top .role{{font-size:11px;font-weight:700}}
.exp-item .top .org{{font-size:10px;color:{c};font-weight:500}}
.exp-item .top .date{{font-size:9px;color:#94a3b8}}
.exp-item ul{{margin:1mm 0 0 3mm;padding:0}}
.exp-item ul li{{font-size:9px;color:#475569;margin:0.5mm 0;line-height:1.4}}
.proj-grid{{display:flex;flex-wrap:wrap;gap:2mm}}
.proj-card{{flex:1;min-width:70mm;background:#f8fafc;border-radius:4px;padding:2mm 3mm;border:1px solid #e2e8f0}}
.proj-card .name{{font-size:10px;font-weight:700;color:#0f172a}}
.proj-card .desc{{font-size:9px;color:#475569;margin:1mm 0}}
.proj-card .tags span{{display:inline-block;background:{c}11;color:{c};padding:0 4px;border-radius:2px;font-size:7px;font-weight:500;margin:1px}}
.skill-grid{{display:flex;flex-wrap:wrap;gap:1.5mm}}
.skill-grid span{{background:#f1f5f9;color:#334155;padding:1.5px 8px;border-radius:3px;font-size:9px;font-weight:500}}
.skill-grid span.accent{{background:{c};color:#fff}}
.extra-item{{display:flex;gap:2mm;margin-bottom:1.5mm;padding:1.5mm 0;border-bottom:1px solid #f8fafc}}
.extra-item .name{{font-size:10px;font-weight:600;min-width:30mm}}
.extra-item .role{{font-size:9px;color:#64748b}}
.extra-item .date{{font-size:8px;color:#94a3b8;margin-left:auto;white-space:nowrap}}
.footer{{border-top:1px solid #e2e8f0;padding:2mm 10mm;font-size:8px;color:#94a3b8;text-align:center}}
.pg-indicator{{position:fixed;top:0;right:0;background:{c};color:#fff;padding:2px 6px;font-size:7px;font-weight:700;border-radius:0 0 0 3px;z-index:999}}
"""

def _build_student_pdf(data: StudentResumeData) -> str:
    n = _escape_html(data.full_name or "Student Name")
    e = _escape_html(data.email or "")
    p = _escape_html(data.phone or "")
    l = _escape_html(data.location or "")
    li = _escape_html(data.linkedin or "")
    g = _escape_html(GOAL_LABELS.get(data.goal, "Student Resume"))
    s = _escape_html(data.summary or "")

    contact_items = []
    if e: contact_items.append(e)
    if p: contact_items.append(p)
    if l: contact_items.append(l)
    contact_str = "".join(f"<div>{item}</div>" for item in contact_items)
    if li:
        contact_str += f'<div style="color:#10b981">{li}</div>'

    edu_blocks = ""
    for edu in data.education:
        course_list = ""
        if edu.coursework:
            course_list = "".join(f'<span>{_escape_html(c)}</span>' for c in edu.coursework[:6])
        award_list = ""
        if edu.awards:
            award_list = '<div class="achv">' + "".join(f'<span>&#9733; {_escape_html(a)}</span>' for a in edu.awards[:4]) + '</div>'
        act_list = ""
        if edu.activities:
            act_list = '<div style="margin-top:1mm;font-size:8px;color:#64748b">' + ", ".join(_escape_html(a) for a in edu.activities[:4]) + '</div>'
        years = f"{edu.start_year} - {edu.grad_year}" if edu.start_year and edu.grad_year else edu.grad_year
        gpa_html = f'<div class="gpa">{_escape_html(edu.gpa)}</div>' if edu.gpa else ""
        degree = f"{edu.degree} in {edu.field}" if edu.degree and edu.field else edu.degree or edu.field or ""
        edu_blocks += f'''
<div class="edu-card">
  <div class="l">
    <div class="name">{_escape_html(edu.school)}</div>
    <div class="detail">{_escape_html(degree)}{course_list}</div>
    {award_list}{act_list}
  </div>
  <div class="r">{gpa_html}<div>{_escape_html(years)}</div></div>
</div>'''

    exp_blocks = ""
    for exp in data.experience:
        bullets = "".join(f"<li>{_escape_html(b)}</li>" for b in exp.bullets) if exp.bullets else ""
        date_str = f"{exp.start_date} - {exp.end_date}" if exp.start_date or exp.end_date else ""
        org_loc = exp.organization
        if exp.location:
            org_loc += f", {exp.location}"
        exp_blocks += f'''
<div class="exp-item">
  <div class="top">
    <div><span class="role">{_escape_html(exp.role)}</span> <span class="org">{_escape_html(org_loc)}</span></div>
    <div class="date">{_escape_html(date_str)}</div>
  </div>
  {f"<ul>{bullets}</ul>" if bullets else ""}
</div>'''

    proj_blocks = ""
    if data.projects:
        proj_cards = ""
        for proj in data.projects:
            tech_tags = "".join(f"<span>{_escape_html(t)}</span>" for t in proj.technologies) if proj.technologies else ""
            proj_cards += f'''
<div class="proj-card">
  <div class="name">{_escape_html(proj.name)}</div>
  <div class="desc">{_escape_html(proj.description)}</div>
  {f'<div class="tags">{tech_tags}</div>' if tech_tags else ""}
</div>'''
        proj_blocks = f'<div class="proj-grid">{proj_cards}</div>'

    skill_tags = ""
    all_skills = data.skills[:20]
    if all_skills:
        skill_tags = "".join(f'<span>{_escape_html(s)}</span>' for s in all_skills)

    lang_tags = ""
    if data.languages:
        lang_tags = "".join(f'<span class="accent">{_escape_html(l)}</span>' for l in data.languages)

    extra_blocks = ""
    for extra in data.extracurriculars:
        date_str = f"{extra.start_date} - {extra.end_date}" if extra.start_date or extra.end_date else ""
        extra_blocks += f'''
<div class="extra-item">
  <div class="name">{_escape_html(extra.name)}</div>
  <div class="role">{_escape_html(extra.role)}</div>
  <div class="date">{_escape_html(date_str)}</div>
</div>'''

    award_blocks = ""
    if data.awards:
        award_blocks = '<div style="display:flex;flex-wrap:wrap;gap:2mm">' + "".join(f'<span style="background:#fef9c3;color:#92400e;padding:1px 8px;border-radius:3px;font-size:9px;font-weight:500">&#9733; {_escape_html(a)}</span>' for a in data.awards[:6]) + '</div>'

    interest_blocks = ""
    if data.interests:
        interest_blocks = "".join(f'<span style="background:#f1f5f9;color:#64748b;padding:1px 8px;border-radius:12px;font-size:8px;margin:0 2px">{_escape_html(i)}</span>' for i in data.interests[:8])

    summary_block = f'<p style="font-size:10px;color:#475569;line-height:1.5;margin-bottom:1mm">{s}</p>' if s else ""

    edu_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Education</div>
  {edu_blocks or '<p style="font-size:9px;color:#94a3b8">No education entries</p>'}
</div>''' if data.education else ""

    exp_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Experience</div>
  {exp_blocks or '<p style="font-size:9px;color:#94a3b8">No experience entries</p>'}
</div>''' if data.experience else ""

    proj_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Projects</div>
  {proj_blocks or '<p style="font-size:9px;color:#94a3b8">No project entries</p>'}
</div>''' if data.projects else ""

    skill_section = ""
    if skill_tags or lang_tags:
        skill_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Skills</div>
  <div class="skill-grid">{skill_tags}{lang_tags}</div>
</div>'''

    extra_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Extracurriculars</div>
  {extra_blocks or '<p style="font-size:9px;color:#94a3b8">No entries</p>'}
</div>''' if data.extracurriculars else ""

    award_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Awards & Honors</div>
  {award_blocks}
</div>''' if data.awards else ""

    interest_section = f'''
<div class="sec">
  <div class="sec-h">&#9679; Interests</div>
  <div>{interest_blocks}</div>
</div>''' if data.interests else ""

    body = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{_student_pdf_style()}</style></head><body>
<div class="h">
  <div class="l">
    <h1>{n}</h1>
    <div class="sub">{g}</div>
  </div>
  <div class="r">{contact_str}</div>
</div>
{s and f'<div class="goal"><span>GOAL</span>{s}</div>' or f'<div class="goal"><span>GOAL</span>{g}</div>'}
<div class="b">
{summary_block}
{edu_section}
{exp_section}
{proj_section}
{skill_section}
{extra_section}
{award_section}
{interest_section}
</div>
<div class="footer">Student Resume &mdash; Built with ProfileOptimizer</div>
</body></html>"""
    return body

@router.post("/student-pdf")
def download_student_pdf(data: StudentResumeData, user: User = Depends(get_current_user)):
    html = _build_student_pdf(data)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            pdf_bytes = page.pdf(format="A4", print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            browser.close()
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)}"}

    slug = _slugify(data.full_name or "student-resume")
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{slug}-resume.pdf"'},
    )
