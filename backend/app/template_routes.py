from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.models import User
from app.auth import get_current_user

router = APIRouter(prefix="/api/templates", tags=["templates"])

TEMPLATES = [
    {
        "id": "minimal",
        "name": "Minimal",
        "description": "Minimalist design with maximum ATS compatibility",
        "preview": "/templates/minimal.png",
        "features": ["Plain text", "Max ATS score", "No graphics"],
        "is_pro": False,
    },
    {
        "id": "professional",
        "name": "Professional",
        "description": "Traditional two-column layout for experienced professionals",
        "preview": "/templates/professional.png",
        "features": ["Two columns", "Skills sidebar", "Summary section"],
        "is_pro": True,
    },
]

class ResumeData(BaseModel):
    template_id: str
    full_name: str
    email: str
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    projects: list[dict] = []
    certifications: list[str] = []
    achievements: list[str] = []

@router.get("/")
def list_templates():
    return TEMPLATES

@router.post("/generate")
def generate_resume(data: ResumeData, user: User = Depends(get_current_user)):
    latex = _build_latex(data)
    return {"latex": latex, "filename": f"resume_{data.template_id}.tex"}

def _build_latex(data: ResumeData) -> str:
    lines = [
        r"\documentclass[letterpaper,10pt]{article}",
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage[T1]{fontenc}",
        r"\usepackage{mathptmx}",
        r"\usepackage{xcolor}",
        r"\usepackage{titlesec}",
        r"\usepackage{hyperref}",
        r"\usepackage{enumitem}",
        r"\definecolor{atsblue}{RGB}{41, 71, 135}",
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
        rf"  {{\Large \textbf{{\color{{atsblue}}{data.full_name}}}}}\par",
        r"  \vspace{-2pt}",
        rf"  {{\fontsize{{7.5}}{{8.5}}\selectfont {data.phone} $\vert$ \href{{mailto:{data.email}}}{{{data.email}}} $\vert$ {data.location}}}",
        r"  \vspace{-2pt}",
        rf"  {{\fontsize{{7.5}}{{8.5}}\selectfont \href{{https://linkedin.com/in/{data.linkedin}}}{{linkedin.com/in/{data.linkedin}}} $\vert$ \href{{https://github.com/{data.github}}}{{github.com/{data.github}}}}}",
        r"\end{center}",
        r"",
    ]

    if data.summary:
        lines.extend([
            r"\section{Professional Summary}",
            rf"{{\fontsize{{8}}{{9.5}}\selectfont {data.summary}}}",
            r"",
        ])

    if data.skills:
        skills_text = " \quad ".join(f"\\textbf{{{s}}}" for s in data.skills)
        lines.extend([
            r"\section{Technical Skills}",
            rf"{{\fontsize{{7.5}}{{8.5}}\selectfont {skills_text}}}",
            r"",
        ])

    if data.experience:
        lines.append(r"\section{Experience}")
        for exp in data.experience:
            lines.extend([
                r"\noindent\begin{tabular*}{\linewidth}{l@{\extracolsep{\fill}}r}",
                rf"  {{\fontsize{{8}}{{9.5}}\selectfont\\textbf{{{exp.get('company', '')}}}}} & {{\fontsize{{7}}{{8.5}}\selectfont {exp.get('dates', '')}}} \\",
                rf"  {{\fontsize{{7}}{{8.5}}\selectfont\\textit{{{exp.get('role', '')}}}}} & {{\fontsize{{7}}{{8.5}}\selectfont {exp.get('location', '')}}} \\",
                r"\end{tabular*}",
                r"\begin{itemize}[leftmargin=0.12in,itemsep=0pt,topsep=0pt]",
            ])
            for bullet in exp.get("bullets", []):
                lines.append(rf"  \item {{\fontsize{{7}}{{8.5}}\selectfont {bullet}}}")
            lines.extend([
                r"\end{itemize}",
                r"",
            ])

    if data.education:
        lines.append(r"\section{Education}")
        for edu in data.education:
            lines.extend([
                rf"{{\fontsize{{8}}{{9.5}}\selectfont\\textbf{{{edu.get('degree', '')}}}\hfill\\textit{{{edu.get('dates', '')}}}}}",
                rf"{{\fontsize{{7.5}}{{8.5}}\selectfont {edu.get('school', '')} \hfill {edu.get('gpa', '')}}}",
                r"",
            ])

    if data.projects:
        lines.append(r"\section{Projects}")
        for proj in data.projects:
            lines.extend([
                rf"{{\fontsize{{7.5}}{{9}}\selectfont\\textbf{{{proj.get('name', '')}}}}}",
                r"\begin{itemize}[leftmargin=0.12in,itemsep=0pt,topsep=0pt]",
            ])
            for bullet in proj.get("bullets", []):
                lines.append(rf"  \item {{\fontsize{{7}}{{8.5}}\selectfont {bullet}}}")
            lines.extend([
                r"\end{itemize}",
                r"",
            ])

    if data.certifications:
        lines.extend([
            r"\section{Certifications}",
            r"\begin{itemize}[leftmargin=0.2in,itemsep=0pt,topsep=0pt]",
        ])
        for cert in data.certifications:
            lines.append(rf"  \item {{\fontsize{{7.5}}{{9}}\selectfont {cert}}}")
        lines.extend([r"\end{itemize}", r""])

    if data.achievements:
        lines.extend([
            r"\section{Achievements}",
            r"\begin{itemize}[leftmargin=0.2in,itemsep=0pt,topsep=0pt]",
        ])
        for ach in data.achievements:
            lines.append(rf"  \item {{\fontsize{{7.5}}{{9}}\selectfont {ach}}}")
        lines.extend([r"\end{itemize}", r""])

    lines.append(r"\end{document}")
    return "\n".join(lines)
