SKILL_TAXONOMY = {
    "Programming Languages": ["python", "java", "javascript", "typescript", "golang", "rust", "c++", "c#", "ruby", "php", "swift", "kotlin", "scala", "perl", "r", "matlab", "bash", "shell", "powershell", "solidity", "dart", "elixir", "haskell", "lua", "zig", "mojo"],
    "Frontend": ["react", "angular", "vue", "svelte", "next.js", "nuxt", "html", "css", "sass", "less", "tailwind", "bootstrap", "jquery", "webpack", "vite", "redux", "graphql", "rest api", "ajax", "d3.js", "three.js", "framer motion", "storybook"],
    "Backend & Frameworks": ["node.js", "fastapi", "flask", "django", "spring boot", "express", "asp.net", "laravel", "rails", "gin", "echo", "actix", "rocket", "deno", "bun"],
    "Cloud & DevOps": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions", "gitlab ci", "circleci", "ci/cd", "pulumi", "istio", "helm", "prometheus", "grafana", "datadog", "new relic", "sentry", "cloudflare", "vercel", "netlify", "heroku", "digitalocean", "lambda", "ec2", "s3", "cloudfront", "vertex ai", "bigquery", "pub/sub", "cloud run"],
    "Databases": ["sql", "postgresql", "postgres", "mongodb", "mysql", "sqlite", "oracle", "redis", "elasticsearch", "dynamodb", "cassandra", "snowflake", "bigquery", "redshift", "mariadb", "cosmosdb", "firebase", "supabase", "neon", "planetscale", "cockroachdb", "clickhouse", "pinot", "druid"],
    "ML & AI": ["machine learning", "deep learning", "nlp", "natural language processing", "computer vision", "llm", "large language model", "rag", "retrieval augmented generation", "fine-tuning", "lora", "peft", "qlora", "transformer", "neural network", "cnn", "rnn", "lstm", "attention mechanism", "langchain", "llamaindex", "langgraph", "huggingface", "transformers", "pytorch", "tensorflow", "keras", "scikit-learn", "xgboost", "lightgbm", "catboost", "gradient boosting", "random forest", "decision tree", "svm", "logistic regression", "linear regression", "clustering", "k-means", "dimensionality reduction", "pca", "feature engineering", "hyperparameter tuning", "cross-validation", "model evaluation", "model deployment", "mlops", "mlflow", "wandb", "weights & biases", "openai", "gemini", "claude", "mistral", "llama", "vector database", "pinecone", "qdrant", "weaviate", "chroma", "pgvector"],
    "Data & Analytics": ["pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly", "dash", "streamlit", "gradio", "data analysis", "data visualization", "statistical analysis", "hypothesis testing", "a/b testing", "data wrangling", "etl", "data pipeline", "data engineering", "spark", "pyspark", "kafka", "airflow", "hadoop", "flink", "beam", "dbt", "looker", "tableau", "power bi", "metabase", "superset", "data modeling", "data warehouse", "data lake", "data governance"],
    "Architecture & Design": ["microservices", "event-driven", "event driven", "solid", "design patterns", "domain-driven design", "domain driven design", "cqrs", "restful", "grpc", "message queue", "rabbitmq", "sqs", "pub/sub", "nats", "kafka", "redis streams", "event sourcing", "clean architecture", "hexagonal architecture", "serverless", "edge computing"],
    "Testing": ["unit testing", "integration testing", "e2e testing", "tdd", "test driven development", "jest", "pytest", "cypress", "selenium", "playwright", "vitest", "mocha", "chai", "jasmine", "karma", "junit", "mockito", "testing library"],
    "Security": ["security", "authentication", "authorization", "oauth", "jwt", "ssl", "tls", "penetration testing", "pen testing", "compliance", "cybersecurity", "encryption", "zero trust", "siem", "soar", "vulnerability assessment"],
    "Soft Skills": ["leadership", "communication", "teamwork", "collaboration", "problem-solving", "problem solving", "critical thinking", "mentoring", "cross-functional", "cross functional", "stakeholder management", "stakeholder", "project management", "product management", "agile", "scrum", "kanban", "sprint", "jira", "confluence", "presentation", "public speaking", "negotiation", "conflict resolution", "decision making", "strategic thinking", "analytical", "detail-oriented", "detail oriented"],
}


_ALL_SKILLS = []
for _cat, _skills in SKILL_TAXONOMY.items():
    for _s in _skills:
        _ALL_SKILLS.append((_s.lower(), _cat))

_SKILL_TO_CATEGORY = dict(_ALL_SKILLS)


def build_skill_matcher():
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        nlp = spacy.blank("en")
    from spacy.matcher import PhraseMatcher
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    for skill in sorted(set(s for s, _ in _ALL_SKILLS)):
        matcher.add(skill, [nlp(skill)])
    return matcher, nlp


def extract_skills(text: str) -> list[str]:
    if not text:
        return []
    text_lower = text.lower()
    matched = set()
    for skill, _ in _ALL_SKILLS:
        if skill in text_lower:
            matched.add(skill)
    return sorted(matched)


def categorize_skills(matched_skills: list[str]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for skill in matched_skills:
        cat = _SKILL_TO_CATEGORY.get(skill.lower())
        if cat:
            result.setdefault(cat, []).append(skill)
    for cat in result:
        result[cat] = sorted(set(result[cat]))
    return result


def get_skill_category(skill: str) -> str:
    return _SKILL_TO_CATEGORY.get(skill.lower(), "Other")


def score_skill_coverage(profile_skills: list[str], job_skills: list[str]) -> dict:
    profile_set = set(s.lower() for s in profile_skills)
    job_set = set(s.lower() for s in job_skills)
    matched = list(profile_set & job_set)
    missing = list(job_set - profile_set)
    total_required = len(job_set)
    match_pct = round(len(matched) / total_required * 100, 1) if total_required > 0 else 0.0
    return {
        "matched": sorted(matched),
        "missing": sorted(missing),
        "match_pct": match_pct,
        "matched_count": len(matched),
        "total_required": total_required,
    }
