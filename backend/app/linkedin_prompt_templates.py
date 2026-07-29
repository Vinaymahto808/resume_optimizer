"""
LLM prompt templates for LinkedIn Easy Apply form answering.
Adapted from AIHawk's strings.py — 12 Q&A section templates + specialized prompts.
"""


personal_information_template = """
You are a job applicant. Based on the following personal information from the resume,
answer the question concisely. If the answer is not found in the resume, return "N/A".

RESUME PERSONAL INFO:
{resume_section}

QUESTION: {question}

Answer:"""


self_identification_template = """
You are filling out a job application self-identification section.
Answer based on the resume data. If unknown, return "Prefer not to say".

RESUME SELF IDENTIFICATION:
{resume_section}

QUESTION: {question}

Answer:"""


legal_authorization_template = """
You are filling out a job application legal authorization section.
Answer based on the resume data. If unknown, return "Prefer not to say".

RESUME LEGAL AUTHORIZATION:
{resume_section}

QUESTION: {question}

Answer:"""


work_preferences_template = """
You are filling out a job application work preferences section.
Answer based on the resume data. If unknown, return "Yes".

RESUME WORK PREFERENCES:
{resume_section}

QUESTION: {question}

Answer:"""


education_details_template = """
You are a job applicant answering education-related questions.
Answer based on the resume education section. If the answer is not found, return "N/A".

RESUME EDUCATION:
{resume_section}

QUESTION: {question}

Answer:"""


experience_details_template = """
You are a job applicant answering experience-related questions.
Answer based on the resume experience section. Be specific and quantify when possible.
If the answer is not found, return "N/A".

RESUME EXPERIENCE:
{resume_section}

QUESTION: {question}

Answer:"""


projects_template = """
You are a job applicant answering project-related questions.
Answer based on the resume projects section. Be concise and relevant.
If the answer is not found, return "N/A".

RESUME PROJECTS:
{resume_section}

QUESTION: {question}

Answer:"""


availability_template = """
You are filling out a job application availability section.
Answer based on the resume availability data.

RESUME AVAILABILITY:
{resume_section}

QUESTION: {question}

Answer:"""


salary_expectations_template = """
You are filling out a job application salary expectations section.
Answer based on the resume salary expectations data.

RESUME SALARY:
{resume_section}

QUESTION: {question}

Answer:"""


certifications_template = """
You are a job applicant answering certification-related questions.
Answer based on the resume certifications section.
If the answer is not found, return "N/A".

RESUME CERTIFICATIONS:
{resume_section}

QUESTION: {question}

Answer:"""


languages_template = """
You are a job applicant answering language-related questions.
Answer based on the resume languages section.
If the answer is not found, return "N/A".

RESUME LANGUAGES:
{resume_section}

QUESTION: {question}

Answer:"""


interests_template = """
You are a job applicant answering interest-related questions.
Answer based on the resume interests section.
If the answer is not found, return "N/A".

RESUME INTERESTS:
{resume_section}

QUESTION: {question}

Answer:"""


summarize_prompt_template = """
You are an experienced technical recruiter and career advisor.
Given the following job description, extract and summarize the key information.

JOB DESCRIPTION:
{job_description}

Please provide:
1. Key technical skills required
2. Soft skills desired
3. Education requirements
4. Experience level required
5. Key responsibilities
6. Role evolution or growth potential
7. Industry/domain focus

Provide a concise, structured summary. Do not add information not present in the job description."""


coverletter_template = """
You are a professional cover letter writer.
Write a personalized 3-paragraph cover letter for the following job application.

JOB DESCRIPTION:
{job_description}

APPLICANT RESUME:
{resume_text}

The cover letter should:
1. Opening paragraph: Express enthusiasm for the specific role and company, mention how you found it
2. Middle paragraph: Highlight 2-3 most relevant experiences/skills that match the job requirements
3. Closing paragraph: Express eagerness to discuss further, thank the reader

Keep it professional, concise (max 300 words), and tailored to the specific job.
Do not use generic phrases. Be specific about how your experience relates to their needs."""


numeric_question_template = """
You are filling out a job application. The question asks for a numeric value
(years of experience, number of certifications, etc.).

APPLICANT RESUME:
{resume_text}

QUESTION: {question}

Based on the resume, provide the most accurate numeric answer.
If you cannot determine the answer, return "2" as a minimum.
Extract only the number, nothing else."""


options_template = """
You are filling out a job application multiple-choice question.
Select the best option based on the applicant's resume.

APPLICANT RESUME:
{resume_text}

QUESTION: {question}

AVAILABLE OPTIONS:
{options}

Return ONLY the exact text of the best matching option. Nothing else."""


try_to_fix_template = """
You are filling out a job application form. The previous attempt to fill a field
resulted in an error. Fix the answer based on the error message.

ORIGINAL QUESTION: {question}
PREVIOUS ANSWER: {previous_answer}
ERROR MESSAGE: {error_message}
APPLICANT RESUME:
{resume_text}

Provide a corrected answer that addresses the error."""


func_summarize_prompt_template = """
Remove any [[placeholder]] tokens from the following text and return clean text.

TEXT: {text}

Return only the cleaned text, no explanations."""


SECTION_TEMPLATE_MAP = {
    "personal_information": personal_information_template,
    "self_identification": self_identification_template,
    "legal_authorization": legal_authorization_template,
    "work_preferences": work_preferences_template,
    "education_details": education_details_template,
    "experience_details": experience_details_template,
    "projects": projects_template,
    "availability": availability_template,
    "salary_expectations": salary_expectations_template,
    "certifications": certifications_template,
    "languages": languages_template,
    "interests": interests_template,
}

QUESTION_CLASSIFICATION_PROMPT = """
You are classifying a job application question into one of these categories:
- personal_information (name, email, phone, address, date of birth, etc.)
- self_identification (gender, pronouns, veteran, disability, ethnicity)
- legal_authorization (work authorization, visa sponsorship for US/EU/UK/Canada)
- work_preferences (remote work, relocation, assessments, drug tests)
- education_details (degree, university, GPA, courses)
- experience_details (job roles, responsibilities, skills, years)
- projects (project names, descriptions, links)
- availability (notice period, start date)
- salary_expectations (salary range, compensation)
- certifications (professional certifications, licenses)
- languages (spoken languages, proficiency levels)
- interests (hobbies, professional interests)

QUESTION: {question}

Return ONLY the category name, nothing else.
"""
