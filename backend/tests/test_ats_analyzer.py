import pytest
from app.ats_analyzer import analyze_ats, ATS_CHECKLIST


class TestAnalyzeAts:
    def test_returns_full_result_structure(self):
        text = "Some resume text with basic content"
        result = analyze_ats(text)
        assert "overall_score" in result
        assert "word_count" in result
        assert "checks" in result
        assert "strengths" in result
        assert "weaknesses" in result
        assert "suggestions" in result
        assert "passed_count" in result
        assert "total_checks" in result
        assert result["total_checks"] == len(ATS_CHECKLIST)

    def test_strong_resume_passes_most_checks(self, sample_resume_text_strong):
        result = analyze_ats(sample_resume_text_strong)
        assert result["overall_score"] > 50
        assert result["passed_count"] >= 4

    def test_short_text_has_some_baseline_score(self):
        result = analyze_ats("")
        assert result["overall_score"] >= 0
        assert result["passed_count"] >= 0

    def test_contact_information_check(self):
        text = "test@email.com +1-555-123-4567"
        result = analyze_ats(text)
        contact = next(c for c in result["checks"] if c["id"] == "contact")
        assert contact["passed"] is True

    def test_missing_contact(self):
        result = analyze_ats("No contact info here")
        contact = next(c for c in result["checks"] if c["id"] == "contact")
        assert contact["passed"] is False

    def test_summary_detected_when_long_enough(self):
        text = "Professional " + ("word " * 35) + " summary"
        result = analyze_ats(text)
        summary = next(c for c in result["checks"] if c["id"] == "summary")
        assert summary["passed"] is True

    def test_summary_missing(self):
        result = analyze_ats("Short text without enough words or summary keywords at all here")
        summary = next(c for c in result["checks"] if c["id"] == "summary")
        assert summary["passed"] is False

    def test_sections_detected(self):
        text = "Experience\nWorked here\nEducation\nWent there\nSkills\nPython"
        result = analyze_ats(text)
        sections = next(c for c in result["checks"] if c["id"] == "sections")
        assert sections["passed"] is True

    def test_bullet_points_detected(self):
        text = "\n".join("- Bullet " + str(i) for i in range(6))
        result = analyze_ats(text)
        bullets = next(c for c in result["checks"] if c["id"] == "bullets")
        assert bullets["passed"] is True

    def test_quantified_achievements(self):
        text = "Improved accuracy by 25% and reduced costs by 40%. Processed 1000 documents daily."
        result = analyze_ats(text)
        quant = next(c for c in result["checks"] if c["id"] == "quantified")
        assert quant["passed"] is True

    def test_ds_keywords_present(self):
        text = "python sql machine learning deep learning nlp pandas scikit-learn pytorch docker"
        result = analyze_ats(text)
        kw = next(c for c in result["checks"] if c["id"] == "job_keywords")
        assert kw["passed"] is True

    def test_skills_section_present(self):
        text = "Skills\nPython, SQL, Machine Learning"
        result = analyze_ats(text)
        skill = next(c for c in result["checks"] if c["id"] == "skills_section")
        assert skill["passed"] is True

    def test_resume_length_ok(self):
        text = "word " * 400
        result = analyze_ats(text)
        length = next(c for c in result["checks"] if c["id"] == "length")
        assert length["passed"] is True

    def test_resume_too_short(self):
        text = "word " * 50
        result = analyze_ats(text)
        assert len(result["suggestions"]) > 0

    def test_resume_too_long(self):
        text = "word " * 1000
        result = analyze_ats(text)
        assert len(result["suggestions"]) > 0

    def test_education_section(self):
        text = "Education\nMIT\n2019"
        result = analyze_ats(text)
        edu = next(c for c in result["checks"] if c["id"] == "education")
        assert edu["passed"] is True

    def test_experience_dates(self):
        text = "Jan 2020 - Mar 2023"
        result = analyze_ats(text)
        dates = next(c for c in result["checks"] if c["id"] == "experience_dates")
        assert dates["passed"] is True

    def test_complex_tables(self):
        text = "| a | b | c | d | e | f | g | h | i | j | k |"
        result = analyze_ats(text)
        tables = next(c for c in result["checks"] if c["id"] == "no_tables")
        assert tables["passed"] is False

    def test_standard_chars(self):
        text = "Normal text"
        result = analyze_ats(text)
        fmt = next(c for c in result["checks"] if c["id"] == "file_format")
        assert fmt["passed"] is True

    def test_generates_suggestions_for_weaknesses(self):
        text = "Short text without keywords"
        result = analyze_ats(text)
        assert len(result["suggestions"]) > 0

    def test_weaknesses_and_strengths_are_mutually_exclusive(self):
        text = "python sql machine learning nlp pandas scikit-learn pytorch tensorflow docker gcp aws\n- Bullet 1\n- Bullet 2\n- Bullet 3\n- Bullet 4\n- Bullet 5\nExperience\nEducation\nSkills\n"
        result = analyze_ats(text)
        for s in result["strengths"]:
            assert s["passed"] is True
        for w in result["weaknesses"]:
            assert w["passed"] is False
        assert len(result["strengths"]) + len(result["weaknesses"]) == result["total_checks"]
