import pytest
from app.job_recommender import compute_job_match, recommend_jobs, SAMPLE_JOBS


class TestComputeJobMatch:
    def test_perfect_match(self):
        profile = "python sql machine learning docker aws"
        job = {
            "title": "Test Job",
            "company": "Test Co",
            "required_skills": ["python", "sql"],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert result["match_pct"] == 100.0
        assert result["matched_skills"] == ["python", "sql"]
        assert result["missing_skills"] == []

    def test_partial_match(self):
        profile = "python sql docker"
        job = {
            "title": "Test Job",
            "company": "Test Co",
            "required_skills": ["python", "sql", "kubernetes", "aws"],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert result["match_pct"] == 50.0
        assert result["matched_skills"] == ["python", "sql"]
        assert result["missing_skills"] == ["kubernetes", "aws"]

    def test_no_match(self):
        profile = "cooking baking gardening"
        job = {
            "title": "Test Job",
            "company": "Test Co",
            "required_skills": ["python", "sql", "ml"],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert result["match_pct"] == 0.0
        assert result["matched_skills"] == []

    def test_empty_skills(self):
        profile = "python"
        job = {
            "title": "Test Job",
            "company": "Test Co",
            "required_skills": [],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert result["match_pct"] == 0.0

    def test_category_breakdown_includes_matched_skills(self):
        profile = "python docker machine learning"
        job = {
            "title": "Test",
            "company": "Test Co",
            "required_skills": ["python", "docker", "machine learning"],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert "Languages" in result["category_breakdown"]
        assert "Cloud & DevOps" in result["category_breakdown"]
        assert "ML & AI" in result["category_breakdown"]

    def test_match_is_case_insensitive(self):
        profile = "Python SQL Docker"
        job = {
            "title": "Test",
            "company": "Test Co",
            "required_skills": ["python", "sql", "docker"],
            "industry": "saas",
            "source": "LinkedIn",
            "url": "https://example.com",
            "description": "Test role",
            "location": "Remote",
        }
        result = compute_job_match(profile, job)
        assert result["match_pct"] == 100.0


class TestRecommendJobs:
    def test_returns_top_matches(self):
        profile = "python sql machine learning deep learning nlp docker gcp aws pandas pytorch scikit-learn"
        matches = recommend_jobs(profile, min_match=10, top_n=5)
        assert len(matches) <= 5
        if matches:
            assert "match_pct" in matches[0]
            assert "job" in matches[0]
            assert "matched_skills" in matches[0]

    def test_returns_sorted_by_match(self):
        profile = "python sql machine learning deep learning nlp docker gcp aws pandas pytorch scikit-learn"
        matches = recommend_jobs(profile, min_match=10, top_n=20)
        for i in range(len(matches) - 1):
            assert matches[i]["match_pct"] >= matches[i + 1]["match_pct"]

    def test_empty_profile_returns_empty(self):
        matches = recommend_jobs("", min_match=100, top_n=10)
        assert len(matches) == 0

    def test_high_min_match_filters_most(self):
        profile = "python sql"
        matches = recommend_jobs(profile, min_match=95, top_n=10)
        for m in matches:
            assert m["match_pct"] >= 95

    def test_low_min_match_includes_most(self):
        profile = "python sql machine learning"
        matches = recommend_jobs(profile, min_match=0, top_n=100)
        assert len(matches) <= len(SAMPLE_JOBS)

    def test_each_match_has_required_fields(self):
        profile = "python sql machine learning"
        matches = recommend_jobs(profile, min_match=0, top_n=5)
        for m in matches:
            assert "job" in m
            assert "match_pct" in m
            assert "matched_skills" in m
            assert "missing_skills" in m
            assert "total_required" in m
            assert "matched_count" in m
            assert "category_breakdown" in m
    def test_healthcare_profile_matches_relevant_jobs(self):
        profile = "healthcare clinical python machine learning nlp patient data"
        matches = recommend_jobs(profile, min_match=20, top_n=10)
        healthcare_jobs = [m for m in matches if m["job"].get("industry") == "healthcare"]
        assert len(healthcare_jobs) > 0

    def test_fintech_profile_matches_relevant_jobs(self):
        profile = "fintech banking python risk modeling fraud detection sql"
        matches = recommend_jobs(profile, min_match=20, top_n=10)
        fintech_jobs = [m for m in matches if m["job"].get("industry") == "fintech"]
        assert len(fintech_jobs) > 0
