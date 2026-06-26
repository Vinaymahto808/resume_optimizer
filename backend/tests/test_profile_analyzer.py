import pytest
from app.profile_analyzer import (
    extract_text_sections, keyword_match_analysis, profile_strength_assessment,
    detect_industry, generate_suggestions, generate_headline, generate_about_section,
    analyze_profile,
)


class TestExtractTextSections:
    def test_returns_word_and_char_counts(self):
        result = extract_text_sections("Hello world")
        assert result["word_count"] == 2
        assert result["char_count"] == 11
        assert result["raw"] == "Hello world"

    def test_empty_text(self):
        result = extract_text_sections("")
        assert result["word_count"] == 0
        assert result["char_count"] == 0


class TestKeywordMatchAnalysis:
    def test_returns_categories(self, sample_profile_text):
        result = keyword_match_analysis(sample_profile_text)
        assert "categories" in result
        assert "overall_score" in result
        assert "total_matched" in result
        assert "ML & AI" in result["categories"]
        assert "Languages" in result["categories"]

    def test_high_match_for_relevant_text(self):
        text = "python machine learning deep learning nlp docker aws gcp sql pandas"
        result = keyword_match_analysis(text)
        assert result["total_matched"] > 0
        assert result["overall_score"] > 0

    def test_no_match_for_irrelevant_text(self):
        text = "cooking baking gaming swimming"
        result = keyword_match_analysis(text)
        assert result["total_matched"] == 0
        assert result["overall_score"] == 0.0

    def test_category_scoring(self):
        text = "python sql"
        result = keyword_match_analysis(text)
        langs = result["categories"]["Languages"]
        assert langs["count"] == 2
        assert langs["total"] > 2
        assert langs["score"] > 0

    def test_soft_skills_category(self):
        text = "communication leadership teamwork"
        result = keyword_match_analysis(text)
        soft = result["categories"]["Soft Skills"]
        assert soft["count"] >= 3


class TestProfileStrengthAssessment:
    def test_returns_weighted_score(self, sample_profile_text):
        kw = keyword_match_analysis(sample_profile_text)
        result = profile_strength_assessment(kw)
        assert "weighted_score" in result
        assert "strengths" in result
        assert "weaknesses" in result
        assert result["weighted_score"] > 0

    def test_weak_profile_has_weaknesses(self):
        kw = keyword_match_analysis("cooking baking")
        result = profile_strength_assessment(kw)
        assert len(result["weaknesses"]) > 0

    def test_weak_profile_has_no_strengths(self):
        kw = keyword_match_analysis("cooking baking")
        result = profile_strength_assessment(kw)
        assert len(result["strengths"]) == 0


class TestDetectIndustry:
    def test_detects_healthcare(self):
        text = "healthcare clinical patient medical hospital"
        assert "healthcare" in detect_industry(text)

    def test_detects_fintech(self):
        text = "fintech banking payment trading risk"
        assert "fintech" in detect_industry(text)

    def test_no_industry_detected(self):
        assert detect_industry("random unrelated text") == []

    def test_multiple_industries(self):
        text = "healthcare clinical fintech banking"
        industries = detect_industry(text)
        assert len(industries) >= 1


class TestGenerateSuggestions:
    def test_returns_list(self, sample_profile_text):
        kw = keyword_match_analysis(sample_profile_text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(sample_profile_text, kw, strength)
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0

    def test_suggests_title_when_missing(self):
        text = "I like data stuff"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("title" in s.lower() for s in suggestions)

    def test_suggests_ml_when_score_low(self):
        text = "I write code in python"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("ML" in s for s in suggestions) or any("machine learning" in s.lower() for s in suggestions)

    def test_suggests_high_value_ml_when_ml_present(self):
        text = "machine learning deep learning nlp transformer neural network cnn rnn pytorch tensorflow scikit-learn xgboost random forest python"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        ml = kw["categories"]["ML & AI"]
        assert ml["score"] >= 30

    def test_suggests_data_when_score_low(self):
        text = "I manage people"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("data" in s.lower() for s in suggestions)

    def test_suggests_ab_testing(self):
        text = "machine learning pandas numpy matplotlib seaborn data visualization python"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("testing" in s.lower() for s in suggestions)

    def test_suggests_cloud_when_missing(self):
        text = "python sql"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("cloud" in s.lower() for s in suggestions)

    def test_suggests_soft_skills(self):
        text = "python sql machine learning"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("soft" in s.lower() or "communication" in s.lower() for s in suggestions)

    def test_highlights_strengths(self):
        text = "python sql machine learning deep learning nlp docker gcp aws"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        if strength["strengths"]:
            assert any("strong" in s.lower() for s in suggestions)

    def test_word_count_too_short(self):
        text = "Data Scientist"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("brief" in s.lower() or "short" in s.lower() for s in suggestions)

    def test_word_count_too_long(self):
        text = "Data Scientist " + "word " * 400
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("condensing" in s.lower() or "detailed" in s.lower() for s in suggestions)

    def test_quantified_added_when_few(self):
        text = "Data Scientist with python and sql"
        kw = keyword_match_analysis(text)
        strength = profile_strength_assessment(kw)
        suggestions = generate_suggestions(text, kw, strength)
        assert any("quantified" in s.lower() or "25%" in s for s in suggestions)


class TestGenerateHeadline:
    def test_generates_headline(self, sample_profile_text):
        kw = keyword_match_analysis(sample_profile_text)
        industries = detect_industry(sample_profile_text)
        headline = generate_headline(sample_profile_text, kw, industries)
        assert isinstance(headline, str)
        assert len(headline) > 10

    def test_ml_nlp_role(self):
        text = "nlp natural language processing machine learning pytorch"
        kw = keyword_match_analysis(text)
        headline = generate_headline(text, kw, [])
        assert "ML & NLP Engineer" in headline

    def test_data_scientist_role(self):
        text = "pandas data analysis data visualization"
        kw = keyword_match_analysis(text)
        headline = generate_headline(text, kw, [])
        assert "Data Scientist" in headline

    def test_fallback_to_ds(self):
        text = "some random text"
        kw = keyword_match_analysis(text)
        headline = generate_headline(text, kw, [])
        assert "Data Scientist" in headline

    def test_includes_industry(self):
        text = "python machine learning healthcare clinical"
        kw = keyword_match_analysis(text)
        industries = detect_industry(text)
        headline = generate_headline(text, kw, industries)
        assert "Healthcare" in headline

    def test_truncates_long_headline(self):
        text = "python machine learning nlp deep learning" + " pandas" * 50
        kw = keyword_match_analysis(text)
        headline = generate_headline(text, kw, [])
        assert len(headline) <= 220


class TestGenerateAboutSection:
    def test_generates_about(self, sample_profile_text):
        kw = keyword_match_analysis(sample_profile_text)
        industries = detect_industry(sample_profile_text)
        about = generate_about_section(sample_profile_text, kw, industries)
        assert isinstance(about, str)
        assert len(about) > 50

    def test_includes_tech_stack(self):
        text = "python machine learning nlp gcp"
        kw = keyword_match_analysis(text)
        about = generate_about_section(text, kw, [])
        assert "Python" in about

    def test_includes_quantified_when_present(self):
        text = "Improved accuracy by 25%. python machine learning"
        kw = keyword_match_analysis(text)
        about = generate_about_section(text, kw, [])
        assert "achieving" in about

    def test_includes_deployed_when_present(self):
        text = "deployed to production python machine learning"
        kw = keyword_match_analysis(text)
        about = generate_about_section(text, kw, [])
        assert "deployed" in about

    def test_closing_statement(self):
        text = "python"
        kw = keyword_match_analysis(text)
        about = generate_about_section(text, kw, [])
        assert "Open to" in about


class TestAnalyzeProfile:
    def test_returns_complete_analysis(self, sample_profile_text):
        result = analyze_profile(sample_profile_text)
        assert "sections" in result
        assert "keywords" in result
        assert "strength" in result
        assert "industries" in result
        assert "suggestions" in result
        assert "optimized_headline" in result
        assert "optimized_about" in result

    def test_empty_text(self):
        result = analyze_profile("")
        assert result["keywords"]["total_matched"] == 0
