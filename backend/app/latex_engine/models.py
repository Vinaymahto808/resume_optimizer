from pydantic import BaseModel
from typing import Optional


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


class CompileRequest(BaseModel):
    substitutions: dict = {}
