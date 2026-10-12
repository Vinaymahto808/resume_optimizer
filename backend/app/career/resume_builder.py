"""Structured resume builder: one editable resume per client id.

The structured resume is the source of truth for matching: every save rewrites
the profile's plain-text resume (and its embedding) from it. Uploads are parsed
with the existing text extractor (app.resume_parser) and section parser
(app.unified_profile), so parsing never invents content: anything it can't
place is left for the user to fill in.

Exports are ATS-safe: single column, standard fonts, no tables or images. PDF
uses the LaTeX templates when pdflatex is installed and a built-in text PDF
writer otherwise; DOCX uses python-docx.
"""
import io
import json
import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.career.identity import set_resume
from app.career.models import SeekerProfile, StructuredResume

S = 300      # short field limit
L = 3000     # long field limit


# --------------------------------------------------------------- schema ----
# Mirrors the frontend ResumeData type (src/types) so the Resume Studio edits it directly.

class Bullet(BaseModel):
    id: str = Field(default_factory=lambda: f"b-{uuid.uuid4().hex[:8]}", max_length=64)
    original: str = Field(default="", max_length=1000)
    optimized: str = Field(default="", max_length=1000)
    isOptimized: bool = False
    keywords: list[str] = Field(default_factory=list, max_length=30)
    impactScore: int = Field(default=0, ge=0, le=100)

    def text(self) -> str:
        return (self.optimized if self.isOptimized and self.optimized.strip() else self.original).strip()


class Experience(BaseModel):
    id: str = Field(default_factory=lambda: f"exp-{uuid.uuid4().hex[:8]}", max_length=64)
    role: str = Field(default="", max_length=S)
    company: str = Field(default="", max_length=S)
    location: str = Field(default="", max_length=S)
    startDate: str = Field(default="", max_length=40)
    endDate: str = Field(default="", max_length=40)
    bullets: list[Bullet] = Field(default_factory=list, max_length=30)


class SkillGroup(BaseModel):
    category: str = Field(default="Skills", max_length=100)
    items: list[str] = Field(default_factory=list, max_length=80)


class Education(BaseModel):
    degree: str = Field(default="", max_length=S)
    school: str = Field(default="", max_length=S)
    year: str = Field(default="", max_length=40)


class ResumeDoc(BaseModel):
    fullName: str = Field(default="", max_length=200)
    title: str = Field(default="", max_length=S)
    email: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=50)
    location: str = Field(default="", max_length=200)
    linkedin: str = Field(default="", max_length=500)
    github: str = Field(default="", max_length=500)
    portfolio: str = Field(default="", max_length=500)
    summary: str = Field(default="", max_length=L)
    experience: list[Experience] = Field(default_factory=list, max_length=30)
    skills: list[SkillGroup] = Field(default_factory=list, max_length=20)
    education: list[Education] = Field(default_factory=list, max_length=10)

    def is_empty(self) -> bool:
        return not (self.fullName or self.summary or self.experience or self.skills or self.education)


# -------------------------------------------------------------- storage ----

def load(db, client_id: str) -> Optional[StructuredResume]:
    return db.get(StructuredResume, client_id)


def current(db, profile: SeekerProfile) -> tuple[ResumeDoc, str, Optional[datetime]]:
    """Saved resume, else one parsed from the profile's resume text, else a blank one prefilled from the profile."""
    row = load(db, profile.client_id)
    if row:
        return ResumeDoc.model_validate(json.loads(row.data or "{}")), "saved", row.updated_at
    if (profile.resume_text or "").strip():
        return parse_text(profile.resume_text), "parsed", None
    return ResumeDoc(fullName=profile.full_name or "", email=profile.email or "", phone=profile.phone or "",
                     location=profile.location or "", title=profile.headline or "", linkedin=profile.linkedin or "",
                     github=profile.github or "", portfolio=profile.portfolio or ""), "empty", None


def save(db, profile: SeekerProfile, doc: ResumeDoc) -> StructuredResume:
    row = load(db, profile.client_id)
    if row is None:
        row = StructuredResume(client_id=profile.client_id)
        db.add(row)
    for group in doc.skills:
        group.items = [s.strip() for s in group.items if s.strip()]
    row.data = doc.model_dump_json()
    row.updated_at = datetime.utcnow()
    # The structured resume drives matching, tailoring and autofill.
    set_resume(profile, to_text(doc) if not doc.is_empty() else "")
    for field, value in (("full_name", doc.fullName), ("email", doc.email), ("phone", doc.phone),
                         ("location", doc.location), ("headline", doc.title), ("linkedin", doc.linkedin),
                         ("github", doc.github), ("portfolio", doc.portfolio)):
        if value.strip():
            setattr(profile, field, value.strip())
    if doc.education and doc.education[0].school.strip():
        profile.school = doc.education[0].school.strip()
    db.commit()
    return row


# ------------------------------------------------------------- rendering ----

def contact_line(doc: ResumeDoc) -> str:
    return " | ".join(p for p in (doc.email, doc.phone, doc.location, doc.linkedin, doc.github, doc.portfolio) if p.strip())


def _dates(exp: Experience) -> str:
    return " - ".join(d for d in (exp.startDate, exp.endDate) if d.strip())


def to_text(doc: ResumeDoc) -> str:
    """Plain ATS text. Section headings match what the parser and ATS scorer expect."""
    out = [line for line in (doc.fullName, doc.title, contact_line(doc)) if line.strip()]
    if doc.summary.strip():
        out += ["", "Professional Summary", doc.summary.strip()]
    if doc.experience:
        out += ["", "Experience"]
        for exp in doc.experience:
            head = " - ".join(p for p in (exp.role, exp.company) if p.strip())
            meta = ", ".join(p for p in (exp.location, _dates(exp)) if p.strip())
            out.append(f"{head} ({meta})" if meta else head)
            out += [f"• {b.text()}" for b in exp.bullets if b.text()]
    groups = [g for g in doc.skills if g.items]
    if groups:
        out += ["", "Skills"]
        out += [(f"{g.category}: " if g.category and len(groups) > 1 else "") + ", ".join(g.items) for g in groups]
    if doc.education:
        out += ["", "Education"]
        for ed in doc.education:
            head = " - ".join(p for p in (ed.degree, ed.school) if p.strip())
            out.append(f"{head} ({ed.year})" if ed.year.strip() else head)
    return "\n".join(line for line in out if line is not None).strip()


def to_latex_data(doc: ResumeDoc) -> dict:
    """Shape expected by app.latex_engine.template_engine.generate_latex."""
    return {
        "personal": {"name": doc.fullName, "email": doc.email, "phone": doc.phone, "linkedin": doc.linkedin,
                     "website": doc.portfolio or doc.github, "address": doc.location, "title": doc.title},
        "summary": doc.summary,
        "experience": [{"company": e.company, "role": e.role, "location": e.location, "start_date": e.startDate,
                        "end_date": e.endDate, "current": e.endDate.lower() in ("present", "current", "now"),
                        "bullets": [b.text() for b in e.bullets if b.text()], "technologies": []}
                       for e in doc.experience],
        "education": [{"institution": ed.school, "degree": ed.degree, "end_date": ed.year} for ed in doc.education],
        "skills": [s for g in doc.skills for s in g.items],
        "projects": [], "certifications": [], "languages": [], "publications": [], "awards": [],
    }


# --------------------------------------------------------------- export ----

LATEX_TEMPLATES = ("classic", "modern", "minimalistic")


def export_pdf(doc: ResumeDoc, template: str = "classic") -> tuple[bytes, str]:
    """Returns (pdf bytes, engine) where engine is 'latex:<template>' or 'builtin'."""
    import shutil
    if template in LATEX_TEMPLATES and shutil.which("pdflatex"):
        try:
            from app.latex_engine.compiler import compile_latex
            from app.latex_engine.template_engine import generate_latex
            result = compile_latex(generate_latex(to_latex_data(doc), template, {}), template_id=template)
            if result.is_pdf:
                return result.content, f"latex:{template}"
        except Exception:  # fall back to the built-in writer
            pass
    return simple_pdf(doc), "builtin"


def export_docx(doc: ResumeDoc) -> bytes:
    from docx import Document
    from docx.shared import Pt

    d = Document()
    style = d.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)
    d.add_heading(doc.fullName or "Resume", level=0)
    if doc.title:
        d.add_paragraph(doc.title)
    if contact_line(doc):
        d.add_paragraph(contact_line(doc))
    if doc.summary.strip():
        d.add_heading("Professional Summary", level=1)
        d.add_paragraph(doc.summary.strip())
    if doc.experience:
        d.add_heading("Experience", level=1)
        for exp in doc.experience:
            p = d.add_paragraph()
            p.add_run(" - ".join(x for x in (exp.role, exp.company) if x.strip())).bold = True
            meta = ", ".join(x for x in (exp.location, _dates(exp)) if x.strip())
            if meta:
                p.add_run(f"  ({meta})")
            for b in exp.bullets:
                if b.text():
                    d.add_paragraph(b.text(), style="List Bullet")
    groups = [g for g in doc.skills if g.items]
    if groups:
        d.add_heading("Skills", level=1)
        for g in groups:
            d.add_paragraph((f"{g.category}: " if len(groups) > 1 else "") + ", ".join(g.items))
    if doc.education:
        d.add_heading("Education", level=1)
        for ed in doc.education:
            d.add_paragraph(" - ".join(x for x in (ed.degree, ed.school, ed.year) if x.strip()))
    buf = io.BytesIO()
    d.save(buf)
    return buf.getvalue()


# Built-in PDF writer: Letter page, Helvetica, real (selectable) text, single column.
_WIDTHS_AVG = 0.5   # average Helvetica glyph width as a fraction of font size


def _pdf_escape(s: str) -> str:
    s = s.replace("•", "-").replace("–", "-").replace("—", "-").replace("’", "'").replace("“", '"').replace("”", '"')
    s = s.encode("latin-1", "replace").decode("latin-1")
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _wrap(text: str, size: float, width: float) -> list[str]:
    max_chars = max(20, int(width / (size * _WIDTHS_AVG)))
    lines, cur = [], ""
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > max_chars:
            lines.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}" if cur else word
    if cur:
        lines.append(cur)
    return lines or [""]


def simple_pdf(doc: ResumeDoc) -> bytes:
    W, H, M = 612, 792, 54
    body = W - 2 * M
    items: list[tuple[str, float, bool, float]] = []   # (text, size, bold, indent)

    def add(text, size=10.0, bold=False, indent=0.0, gap=0.0):
        if gap:
            items.append(("", gap, False, 0))
        for line in _wrap(text, size, body - indent):
            items.append((line, size, bold, indent))

    add(doc.fullName or "Resume", 18, True)
    if doc.title:
        add(doc.title, 11)
    if contact_line(doc):
        add(contact_line(doc), 9)
    if doc.summary.strip():
        add("PROFESSIONAL SUMMARY", 11, True, gap=8)
        add(doc.summary.strip())
    if doc.experience:
        add("EXPERIENCE", 11, True, gap=8)
        for exp in doc.experience:
            meta = ", ".join(x for x in (exp.location, _dates(exp)) if x.strip())
            add(" - ".join(x for x in (exp.role, exp.company) if x.strip()) + (f" ({meta})" if meta else ""), 10.5, True, gap=3)
            for b in exp.bullets:
                if b.text():
                    add(f"- {b.text()}", 10, indent=10)
    groups = [g for g in doc.skills if g.items]
    if groups:
        add("SKILLS", 11, True, gap=8)
        for g in groups:
            add((f"{g.category}: " if len(groups) > 1 else "") + ", ".join(g.items))
    if doc.education:
        add("EDUCATION", 11, True, gap=8)
        for ed in doc.education:
            add(" - ".join(x for x in (ed.degree, ed.school, ed.year) if x.strip()))

    pages, cur, y = [], [], H - M
    for text, size, bold, indent in items:
        lead = size * 1.35
        if y - lead < M:
            pages.append(cur)
            cur, y = [], H - M
        y -= lead
        if text:
            cur.append(f"BT /{'F2' if bold else 'F1'} {size:g} Tf {M + indent:.1f} {y:.1f} Td ({_pdf_escape(text)}) Tj ET")
    pages.append(cur)

    objs: list[bytes] = []
    def obj(content: str) -> int:
        objs.append(content.encode("latin-1"))
        return len(objs)

    font1 = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    font2 = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    pages_id = len(objs) + 1 + 2 * len(pages)   # reserved after page/content objects
    kids = []
    for ops in pages:
        stream = "\n".join(ops)
        content = obj(f"<< /Length {len(stream.encode('latin-1'))} >>\nstream\n{stream}\nendstream")
        kids.append(obj(f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {W} {H}] "
                        f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {content} 0 R >>"))
    if obj(f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>") != pages_id:
        raise RuntimeError("PDF object numbering is out of sync")
    title = _pdf_escape(f"{doc.fullName} Resume".strip())
    info = obj(f"<< /Title ({title}) /Producer (ProfileOptimizer) >>")
    catalog = obj(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, body_bytes in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + body_bytes + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root {catalog} 0 R /Info {info} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


# -------------------------------------------------------------- parsing ----

_MONTH = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+"   # only real month names
_DATE_RANGE = re.compile(
    rf"\(?\s*((?:{_MONTH})?(?:19|20)\d{{2}})\s*(?:-|–|—|to)\s*((?:{_MONTH})?(?:19|20)\d{{2}}|present|current|now)\s*\)?",
    re.I)
_BULLET_CHARS = "•-*→▪›‣●◦"


def _split_dates(text: str) -> tuple[str, str, str]:
    m = _DATE_RANGE.search(text or "")
    if not m:
        return (text or "").strip(" |,()"), "", ""
    rest = (text[:m.start()] + text[m.end():]).strip(" |,()-–")
    end = m.group(2)
    return rest, m.group(1).strip(), end.title() if end.lower() in ("present", "current", "now") else end.strip()


def _section(sections: dict, *names: str) -> str:
    for name in names:
        if name in sections:
            lines = sections[name].split("\n")
            return "\n".join(lines[1:] if lines and lines[0].strip().lower().rstrip(":").startswith(name) else lines).strip()
    return ""


def parse_text(text: str) -> ResumeDoc:
    from app.unified_profile import _detect_sections, normalize_resume_text

    text = (text or "").replace("\r\n", "\n")
    up = normalize_resume_text(text)
    sections = _detect_sections(text)
    header = [l.strip() for l in sections.get("header", "").split("\n") if l.strip()]

    doc = ResumeDoc(fullName=up.name or "", email=up.email or "", phone=up.phone or "")
    if header:
        # The line after the name is usually the headline, unless it is the contact line.
        for line in header[1:3]:
            if "@" not in line and not re.search(r"\d{3}", line) and len(line) <= 120:
                doc.title = line
                break
    loc = re.search(r"\b([A-Z][a-zA-Z .]+,\s*(?:[A-Z]{2}|[A-Z][a-z]+))\b(?![^|]*@)", "\n".join(header[:4]))
    if loc and loc.group(1).strip() != doc.fullName:
        doc.location = loc.group(1).strip()
    for url in re.findall(r"(?:https?://)?(?:www\.)?[\w.-]+\.[a-z]{2,}/[\w./%-]+", text[:1500], re.I):
        if "linkedin" in url.lower() and not doc.linkedin:
            doc.linkedin = url
        elif "github" in url.lower() and not doc.github:
            doc.github = url

    doc.summary = re.sub(r"\s+", " ", _section(sections, "professional summary", "summary", "objective"))[:L]

    for entry in up.experience[:30]:
        role, company = entry.get("title", ""), entry.get("company", "")
        company, start, end = _split_dates(company)
        if not start:
            role, start, end = _split_dates(role)
        if not start and entry.get("duration"):
            _, start, end = _split_dates(entry["duration"])
        loc_m = re.search(r",\s*([A-Z][a-zA-Z .]+,\s*[A-Z]{2})$", company)
        location = ""
        if loc_m:
            location, company = loc_m.group(1), company[:loc_m.start()].strip()
        doc.experience.append(Experience(
            role=role[:S], company=company[:S], location=location, startDate=start, endDate=end,
            bullets=[Bullet(original=b[:1000], optimized=b[:1000]) for b in entry.get("bullets", [])[:30] if b.strip()]))

    if not doc.experience:
        # Fallback for experience written without bullet characters (the shared parser drops those roles):
        # a line with a date range starts a role, every other line is one of its bullets. Nothing is dropped.
        current = None
        for line in _section(sections, "work experience", "experience", "employment").split("\n"):
            line = line.strip().lstrip(_BULLET_CHARS).strip()
            if not line:
                continue
            if _DATE_RANGE.search(line) or current is None:
                rest, start, end = _split_dates(line)
                parts = [p.strip() for p in re.split(r"\s+(?:at|@)\s+|\s+[-–|]\s+|,\s+", rest, maxsplit=1) if p.strip()]
                if not (start or end) and current is None and len(line.split()) > 8:
                    # First line is a sentence, not a role header: keep it as a bullet of an untitled role.
                    current = Experience()
                    current.bullets.append(Bullet(original=line[:1000], optimized=line[:1000]))
                else:
                    current = Experience(role=(parts[0] if parts else "")[:S], company=(parts[1] if len(parts) > 1 else "")[:S],
                                         startDate=start, endDate=end)
                doc.experience.append(current)
            elif len(current.bullets) < 30:
                current.bullets.append(Bullet(original=line[:1000], optimized=line[:1000]))
        doc.experience = doc.experience[:30]

    skills_text = _section(sections, "technical skills", "skills")
    groups = []
    for line in skills_text.split("\n"):
        line = line.strip().lstrip(_BULLET_CHARS).strip()
        if not line:
            continue
        category, _, items = line.partition(":") if ":" in line[:40] else ("Skills", "", line)
        values = [s.strip() for s in re.split(r"[,;|•]", items) if s.strip() and len(s.strip()) <= 60]
        if values:
            groups.append(SkillGroup(category=category.strip()[:100] or "Skills", items=values[:80]))
    if not groups and up.skills:
        groups = [SkillGroup(category="Skills", items=up.skills[:80])]
    doc.skills = groups[:20]

    for ed in up.education[:10]:
        degree, school = ed.get("degree", ""), ed.get("institution", "")
        school, start, end = _split_dates(school)
        doc.education.append(Education(degree=degree[:S], school=school[:S], year=end or ed.get("year", "") or start))
    if not doc.education:
        # Line-level fallback for formats the shared parser misses ("MS Computer Science - Stanford (2016 - 2018)").
        year_re = re.compile(r"\b(?:19|20)\d{2}\b")
        for line in _section(sections, "education").split("\n")[:10]:
            line = line.strip().lstrip(_BULLET_CHARS).strip()
            if not line:
                continue
            rest, start, end = _split_dates(line)
            if not (start or end):
                found = year_re.search(rest)
                end = found.group(0) if found else ""
                rest = re.sub(r"\(?\b(?:19|20)\d{2}\b\)?", "", rest).strip(" ,-|")
            parts = [p.strip() for p in re.split(r"\s+[-–|]\s+|,\s+", rest, maxsplit=1) if p.strip()]
            if parts:
                doc.education.append(Education(degree=parts[0][:S], school=(parts[1] if len(parts) > 1 else "")[:S],
                                               year=end or start))
    return doc
