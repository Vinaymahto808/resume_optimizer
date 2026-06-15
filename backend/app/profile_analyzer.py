import re
from typing import Optional

KEYWORDS_BY_CATEGORY = {
    "Languages": ["python", "sql", "r", "typescript", "java", "scala", "julia"],
    "ML & AI": [
        "machine learning", "deep learning", "nlp", "natural language processing",
        "computer vision", "llm", "large language model", "rag", "retrieval augmented generation",
        "fine-tuning", "lora", "peft", "transformer", "neural network", "cnn", "rnn",
        "langchain", "llamaindex", "langgraph", "huggingface", "pytorch", "tensorflow",
        "scikit-learn", "xgboost", "lightgbm", "catboost", "gradient boosting",
        "random forest", "decision tree", "svm", "logistic regression", "linear regression",
        "clustering", "k-means", "dimensionality reduction", "pca", "feature engineering",
        "hyperparameter tuning", "cross-validation", "model evaluation",
    ],
    "Data & Analytics": [
        "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
        "data analysis", "data visualization", "statistical analysis", "hypothesis testing",
        "a/b testing", "data wrangling", "etl", "sql", "data pipeline", "feature engineering",
    ],
    "Cloud & DevOps": [
        "aws", "gcp", "google cloud", "azure", "vertex ai", "s3", "gcs",
        "docker", "kubernetes", "terraform", "github actions", "ci/cd",
    ],
    "Frameworks & Tools": [
        "fastapi", "flask", "streamlit", "django", "gradio",
        "rest api", "graphql", "redis", "postgresql", "mongodb",
        "git", "linux", "unix",
    ],
    "Soft Skills": [
        "communication", "leadership", "teamwork", "problem solving",
        "critical thinking", "analytical", "cross-functional", "stakeholder",
    ],
}

SCORE_WEIGHTS = {
    "Languages": 0.10,
    "ML & AI": 0.30,
    "Data & Analytics": 0.25,
    "Cloud & DevOps": 0.15,
    "Frameworks & Tools": 0.12,
    "Soft Skills": 0.08,
}

INDUSTRY_CLUSTERS = {
    "healthcare": ["healthcare", "clinical", "medical", "pharma", "health", "patient",
                   "biomedical", "bioinformatics", "drug", "hospital", "phi", "hipaa"],
    "fintech": ["fintech", "finance", "banking", "payment", "trading", "risk", "fraud",
                "transaction", "portfolio", "investment", "insurance"],
    "ecommerce": ["ecommerce", "retail", "recommendation", "customer", "inventory",
                  "supply chain", "logistics", "pricing", "personalization"],
    "saas": ["saas", "product", "user", "subscription", "b2b", "b2c", "platform"],
    "consulting": ["consulting", "strategy", "client", "solution", "advisory"],
}


def extract_text_sections(profile_text: str) -> dict:
    return {"raw": profile_text, "word_count": len(profile_text.split()), "char_count": len(profile_text)}


def keyword_match_analysis(profile_text: str) -> dict:
    text_lower = profile_text.lower()
    results = {}
    total_match_count = 0
    total_possible = 0

    for category, keywords in KEYWORDS_BY_CATEGORY.items():
        matched = []
        for kw in keywords:
            if kw in text_lower:
                matched.append(kw)
        results[category] = {
            "matched": matched,
            "count": len(matched),
            "total": len(keywords),
            "score": round(len(matched) / len(keywords) * 100, 1) if keywords else 0,
        }
        total_match_count += len(matched)
        total_possible += len(keywords)

    overall = round(total_match_count / total_possible * 100, 1) if total_possible else 0
    return {"categories": results, "overall_score": overall, "total_matched": total_match_count}


def profile_strength_assessment(keyword_results: dict) -> dict:
    weighted_score = 0
    strengths = []
    weaknesses = []

    for category, data in keyword_results["categories"].items():
        weight = SCORE_WEIGHTS.get(category, 0)
        weighted_score += data["score"] * weight
        if data["score"] >= 40:
            strengths.append((category, data["score"]))
        elif data["score"] < 20:
            weaknesses.append((category, data["score"]))

    return {
        "weighted_score": round(weighted_score, 1),
        "strengths": strengths,
        "weaknesses": weaknesses,
    }


def detect_industry(profile_text: str) -> list:
    text_lower = profile_text.lower()
    detected = []
    for industry, signals in INDUSTRY_CLUSTERS.items():
        matches = sum(1 for s in signals if s in text_lower)
        if matches >= 2:
            detected.append((industry, matches))
    detected.sort(key=lambda x: -x[1])
    return [d[0] for d in detected]


def generate_suggestions(profile_text: str, keyword_results: dict, strength: dict) -> list:
    text_lower = profile_text.lower()
    suggestions = []

    matched_all = set()
    for cat_data in keyword_results["categories"].values():
        matched_all.update(cat_data["matched"])

    category = keyword_results["categories"]

    if category["ML & AI"]["score"] < 30:
        suggestions.append("Add specific ML techniques you've used (e.g., XGBoost, transformers, clustering algorithms).")
    else:
        missing_ml = [kw for kw in KEYWORDS_BY_CATEGORY["ML & AI"]
                      if kw not in matched_all and kw in KEYWORDS_BY_CATEGORY["ML & AI"]]
        high_value = ["rag", "fine-tuning", "langchain", "huggingface", "pytorch", "xgboost"]
        missing_high = [kw for kw in high_value if kw not in matched_all]
        if missing_high:
            suggestions.append(f"Consider adding: {', '.join(missing_high[:4])} — high-demand ML skills.")

    if category["Data & Analytics"]["score"] < 30:
        suggestions.append("Highlight your data analysis experience — Pandas, NumPy, visualization, statistical methods.")
    else:
        if "a/b testing" not in text_lower and "hypothesis testing" not in text_lower:
            suggestions.append("Mention A/B testing or hypothesis testing experience — valued in data science roles.")

    if category["Cloud & DevOps"]["score"] < 25:
        suggestions.append("Add your cloud platform experience (GCP/AWS) and tools like Docker, CI/CD.")

    if category["Soft Skills"]["score"] < 20:
        suggestions.append("Include soft skills like cross-functional collaboration, stakeholder communication, or mentoring.")

    if strength["strengths"]:
        for cat, score in strength["strengths"]:
            suggestions.append(f"Your '{cat}' section is strong ({score}%) — keep this prominent.")

    title_present = re.search(
        r'(data scientist|data engineer|ml engineer|machine learning|ai engineer|data analyst)',
        text_lower
    )
    if not title_present:
        suggestions.append("Add your target role title (e.g., 'Data Scientist') in your headline and summary.")

    word_count = len(profile_text.split())
    if word_count < 80:
        suggestions.append("Your profile is brief ({word_count} words). Aim for 150-250 words in your About section for better visibility.")
    elif word_count > 400:
        suggestions.append("Your profile is detailed. Consider condensing to keep the most impactful content scannable.")

    quantified = re.findall(r'\b\d{2,}%|\b\d+x\b|\b\d{3,}\s*(users|documents|requests|customers|models)', text_lower)
    if len(quantified) < 2:
        suggestions.append("Add quantified achievements (e.g., 'improved accuracy by 25%', 'processed 10K+ documents').")

    return suggestions


TITLE_ROLES = [
    "Data Scientist", "Machine Learning Engineer", "AI Engineer",
    "NLP Engineer", "Data Analyst", "ML Engineer", "AI/ML Engineer",
    "Data Science Engineer", "Applied Scientist",
]

INDUSTRY_PREFIXES = {
    "healthcare": "Healthcare",
    "fintech": "Fintech",
    "ecommerce": "E-Commerce",
    "saas": "SaaS",
    "consulting": "Consulting",
}


def generate_headline(profile_text: str, keyword_results: dict, industries: list) -> str:
    text_lower = profile_text.lower()
    matched_all = set()
    for cat_data in keyword_results["categories"].values():
        matched_all.update(cat_data["matched"])

    has_ml = any(kw in matched_all for kw in ["machine learning", "deep learning", "scikit-learn", "pytorch"])
    has_nlp = any(kw in matched_all for kw in ["nlp", "natural language processing", "huggingface", "transformers"])
    has_data = any(kw in matched_all for kw in ["pandas", "data analysis", "data visualization"])
    has_cloud = any(kw in matched_all for kw in ["gcp", "aws", "docker", "vertex ai"])
    has_llm = any(kw in matched_all for kw in ["llm", "rag", "langchain", "prompt engineering"])
    has_agent = any(kw in matched_all for kw in ["langgraph", "multi-agent", "google adk"])

    roles = []
    if has_ml and has_nlp:
        roles.append("ML & NLP Engineer")
    elif has_ml:
        roles.append("Machine Learning Engineer")
    if has_data:
        roles.append("Data Scientist")
    if has_llm:
        roles.append("AI Engineer")
    if has_agent:
        roles.append("Agentic AI")

    if not roles:
        roles = ["Data Scientist"]

    primary_role = roles[0]
    secondary = [r for r in roles[1:] if r != primary_role][:1]

    tech_parts = []
    if has_ml:
        tech_parts.append("ML")
    if has_nlp:
        tech_parts.append("NLP")
    if has_llm:
        tech_parts.append("LLMs")
    if has_data:
        tech_parts.append("Data Science")
    if has_cloud:
        tech_parts.append("Cloud")

    tech_str = " | ".join(tech_parts) if tech_parts else "Data Science"

    industry_str = ""
    if industries:
        ind_names = [INDUSTRY_PREFIXES.get(i, i.capitalize()) for i in industries]
        industry_str = f" | {', '.join(ind_names[:2])}"

    headline = f"{primary_role}{' & ' + secondary[0] if secondary else ''} | {tech_str}{industry_str} | Python | Building Production AI Solutions"

    if len(headline) > 220:
        headline = f"{primary_role} | {tech_str}{industry_str} | Python"

    return headline


def generate_about_section(profile_text: str, keyword_results: dict, industries: list) -> str:
    text_lower = profile_text.lower()
    matched_all = set()
    for cat_data in keyword_results["categories"].values():
        matched_all.update(cat_data["matched"])

    has_ml = any(kw in matched_all for kw in ["machine learning", "deep learning", "scikit-learn", "pytorch"])
    has_nlp = any(kw in matched_all for kw in ["nlp", "natural language processing", "huggingface", "transformers"])
    has_llm = any(kw in matched_all for kw in ["llm", "rag", "langchain", "prompt engineering"])
    has_data = any(kw in matched_all for kw in ["pandas", "data analysis", "data visualization", "sql"])
    has_cloud = any(kw in matched_all for kw in ["gcp", "aws", "docker", "vertex ai"])
    has_agent = any(kw in matched_all for kw in ["langgraph", "multi-agent", "google adk"])

    has_quantified = bool(re.findall(r'\b\d{2,}%|\b\d+x\b|\b\d{3,}\s*(users|documents|requests|customers|models)', text_lower))
    has_deployed = "deploy" in text_lower or "production" in text_lower

    parts = []

    intro_parts = ["Data Scientist"]
    if has_ml and has_nlp:
        intro_parts = ["ML & NLP Engineer"]
    elif has_llm:
        intro_parts = ["AI/ML Engineer"]
    if has_agent:
        intro_parts = ["AI Engineer"]

    industry_context = ""
    if industries:
        ind_names = [INDUSTRY_PREFIXES.get(i, i.capitalize()) for i in industries]
        industry_context = f" in {', '.join(ind_names[:2])}"

    intro = (
        f"{' and '.join(intro_parts)} with hands-on experience building production-grade "
        f"AI solutions{industry_context}. Passionate about leveraging data and machine learning "
        f"to solve complex problems and drive measurable business impact."
    )
    parts.append(intro)

    techs = []
    if has_llm:
        techs.append("LLMs and RAG pipelines")
    if has_nlp:
        techs.append("NLP/document processing systems")
    if has_ml:
        techs.append("predictive ML models")
    if has_data:
        techs.append("data analysis and visualization")
    if has_agent:
        techs.append("multi-agent AI orchestration")

    if techs:
        tech_list = ", ".join(techs[:-1]) + (" and " + techs[-1] if len(techs) > 1 else techs[0])
        middle = f"Skilled in {tech_list} using Python, with strong emphasis on clean code, testing, and scalable architecture."
        parts.append(middle)

    infra_parts = []
    if has_cloud:
        infra_parts.append("cloud platforms (GCP/AWS)")
    infra_parts.append("Docker")
    if "ci/cd" in text_lower or "github actions" in text_lower:
        infra_parts.append("CI/CD pipelines")

    if infra_parts:
        infra_str = ", ".join(infra_parts[:-1]) + (" and " + infra_parts[-1] if len(infra_parts) > 1 else infra_parts[0])
        parts.append(f"Experienced with {infra_str} for deploying and managing production AI applications.")

    outcomes = []
    if has_deployed:
        outcomes.append("deployed multiple AI applications to production")
    if has_quantified:
        outcomes.append("achieving measurable performance improvements")
    if has_deployed or has_quantified:
        parts.append(f"A track record of {' and '.join(outcomes)}.")

    closing = "Open to data science and ML engineering roles where I can apply my technical skills to solve real-world problems."
    parts.append(closing)

    return "\n\n".join(parts)


def analyze_profile(profile_text: str) -> dict:
    sections = extract_text_sections(profile_text)
    keyword_results = keyword_match_analysis(profile_text)
    strength = profile_strength_assessment(keyword_results)
    industries = detect_industry(profile_text)
    suggestions = generate_suggestions(profile_text, keyword_results, strength)
    headline = generate_headline(profile_text, keyword_results, industries)
    about = generate_about_section(profile_text, keyword_results, industries)

    return {
        "sections": sections,
        "keywords": keyword_results,
        "strength": strength,
        "industries": industries,
        "suggestions": suggestions,
        "optimized_headline": headline,
        "optimized_about": about,
    }
