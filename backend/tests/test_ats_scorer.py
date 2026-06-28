import pytest
from unittest.mock import patch, MagicMock, mock_open, PropertyMock

from app.ats_scorer import (
    extract_text_from_pdf, extract_text_from_docx, parse_resume,
    detect_sections, _find_keywords, _count_action_verbs, _count_weak_phrases,
    _count_buzzwords, _count_quantified, _count_dates,
    score_ats_parse_rate, score_human_quality,
    generate_dual_score_report, calculate_ats_score, generate_nineteen_point_checks,
    INDUSTRY_KEYWORDS,
)


# ========== extract_text_from_pdf ==========

class TestExtractTextFromPdf:
    def test_extracts_text_successfully(self):
        mock_pdfplumber = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "A" * 60
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.open.return_value.__enter__.return_value = mock_pdf
        with patch.dict("sys.modules", {"pdfplumber": mock_pdfplumber}):
            result = extract_text_from_pdf("/fake/path.pdf")
            assert result == "A" * 60

    def test_falls_back_to_pdfminer_on_exception(self):
        mock_pdfplumber = MagicMock()
        mock_pdfplumber.open.side_effect = Exception("pdfplumber error")
        mock_pdfminer = MagicMock()
        mock_pdfminer.extract_text = MagicMock(return_value="PDFMiner extracted text " * 10)
        with patch.dict("sys.modules", {"pdfplumber": mock_pdfplumber, "pdfminer": MagicMock(), "pdfminer.high_level": mock_pdfminer}):
            result = extract_text_from_pdf("/fake/path.pdf")
            assert "PDFMiner extracted text" in result

    def test_returns_error_message_on_all_failures(self):
        mock_pdfplumber = MagicMock()
        mock_pdfplumber.open.side_effect = Exception("error1")
        mock_pdfminer = MagicMock()
        mock_pdfminer.extract_text = MagicMock(side_effect=Exception("error2"))
        with patch.dict("sys.modules", {"pdfplumber": mock_pdfplumber, "pdfminer": MagicMock(), "pdfminer.high_level": mock_pdfminer}):
            result = extract_text_from_pdf("/fake/path.pdf")
            assert result.startswith("[Error extracting text:")

    def test_uses_groq_ocr_when_text_too_short(self):
        mock_pdfplumber = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "short"
        mock_pdfplumber.open.return_value.__enter__.return_value.pages = [mock_page]
        with patch.dict("sys.modules", {"pdfplumber": mock_pdfplumber}):
            with patch("app.ats_scorer.extract_text_from_scanned_pdf") as mock_ocr:
                mock_ocr.return_value = "OCR extracted long text"
                with patch("app.ats_scorer.settings") as mock_settings:
                    mock_settings.GROQ_API_KEY = "test-key"
                    with patch("builtins.open", mock_open(read_data=b"file content")):
                        result = extract_text_from_pdf("/fake/path.pdf")
                        assert result == "OCR extracted long text"


# ========== extract_text_from_docx ==========

class TestExtractTextFromDocx:
    def test_extracts_docx_text(self):
        mock_docx = MagicMock()
        mock_para1 = MagicMock()
        mock_para1.text = "Paragraph 1"
        mock_para2 = MagicMock()
        mock_para2.text = "Paragraph 2"
        mock_docx.Document.return_value.paragraphs = [mock_para1, mock_para2]
        with patch.dict("sys.modules", {"docx": mock_docx}):
            result = extract_text_from_docx("/fake/path.docx")
            assert result == "Paragraph 1\nParagraph 2"

    def test_returns_error_on_exception(self):
        mock_docx = MagicMock()
        mock_docx.Document.side_effect = Exception("docx error")
        with patch.dict("sys.modules", {"docx": mock_docx}):
            result = extract_text_from_docx("/fake/path.docx")
            assert result.startswith("[Error extracting text:")


# ========== parse_resume ==========

class TestParseResume:
    @patch("app.ats_scorer.extract_text_from_pdf")
    def test_parses_pdf(self, mock_extract):
        mock_extract.return_value = "PDF text"
        result = parse_resume("file.pdf")
        assert result == "PDF text"

    @patch("app.ats_scorer.extract_text_from_docx")
    def test_parses_docx(self, mock_extract):
        mock_extract.return_value = "DOCX text"
        result = parse_resume("file.docx")
        assert result == "DOCX text"

    @patch("builtins.open", mock_open(read_data="Plain text content"))
    def test_parses_txt(self):
        result = parse_resume("file.txt")
        assert result == "Plain text content"

    @patch("builtins.open", mock_open(read_data="Plain text content"))
    def test_parses_unknown_extension(self):
        result = parse_resume("file.unknown")
        assert result == "Plain text content"


# ========== detect_sections ==========

class TestDetectSections:
    def test_detects_sections(self):
        text = "Skills\nPython, Java\nExperience\nWorked at Google\nEducation\nMIT"
        sections = detect_sections(text)
        assert "skills" in sections
        assert "experience" in sections
        assert "education" in sections

    def test_returns_header_when_no_sections(self):
        text = "Just some text without any section headings"
        sections = detect_sections(text)
        assert "header" in sections

    def test_detects_variant_headings(self):
        text = "Technical Skills\nPython\nWork Experience\nDeveloper"
        sections = detect_sections(text)
        assert any("skills" in k for k in sections)
        assert any("experience" in k for k in sections)

    def test_empty_text(self):
        sections = detect_sections("")
        assert "header" in sections


# ========== _find_keywords ==========

class TestFindKeywords:
    def test_finds_matching_keywords(self):
        text = "I know python, machine learning, and docker"
        found, missing = _find_keywords(text)
        assert "python" in found
        assert "machine learning" in found
        assert "docker" in found

    def test_never_misses_core_skills(self):
        text = "nothing relevant here"
        found, missing = _find_keywords(text)
        assert "leadership" not in missing
        assert "communication" not in missing
        assert "teamwork" not in missing

    def test_all_keywords_missing(self):
        found, missing = _find_keywords("nothing at all")
        assert len(found) == 0


# ========== Counter helpers ==========

class TestCountActionVerbs:
    def test_counts_verbs(self):
        text = "Developed a system. Implemented features. Led the team."
        count = _count_action_verbs(text)
        assert count == 4

    def test_zero_for_no_verbs(self):
        assert _count_action_verbs("Some text without strong verbs") == 0


class TestCountWeakPhrases:
    def test_counts_weak_phrases(self):
        text = "Responsible for development. Duties included testing."
        assert _count_weak_phrases(text) == 2

    def test_zero_for_strong_phrasing(self):
        text = "Developed the system. Implemented features."
        assert _count_weak_phrases(text) == 0


class TestCountBuzzwords:
    def test_counts_buzzwords(self):
        text = "Synergistic leverage of innovative solutions"
        assert _count_buzzwords(text) == 2

    def test_zero_for_clean_text(self):
        text = "Built a REST API with Python and FastAPI"
        assert _count_buzzwords(text) == 0


class TestCountQuantified:
    def test_counts_percentages(self):
        text = "Improved accuracy by 25% and reduced costs by 40%"
        result = _count_quantified(text)
        assert result == 4

    def test_counts_dollar_amounts(self):
        text = "Managed $500K budget and saved $100,000 annually"
        result = _count_quantified(text)
        assert result == 2

    def test_counts_numeric_achievements(self):
        text = "Processed 1000+ documents daily. Served 5000+ users."
        result = _count_quantified(text)
        assert result == 2

    def test_zero_for_no_metrics(self):
        assert _count_quantified("Did some work on a project") == 0


class TestCountDates:
    def test_counts_month_year(self):
        text = "Jan 2020 - Mar 2023"
        assert _count_dates(text) >= 2

    def test_counts_year_ranges(self):
        text = "2019-2022 and 2022-present"
        assert _count_dates(text) >= 2

    def test_zero_for_no_dates(self):
        assert _count_dates("No dates in this text") == 0


# ========== score_ats_parse_rate ==========

class TestScoreAtsParseRate:
    def test_returns_full_checks(self):
        text = (
            "test@email.com +1-555-123-4567\n"
            "Experience\n"
            "• Bullet point 1\n"
            "• Bullet point 2\n"
            "• Bullet point 3\n"
            "• Bullet point 4\n"
            "• Bullet point 5\n"
            "Education\n"
            "Skills\n"
            "Python, SQL, Machine Learning\n"
            "Summary\n"
        )
        score, checks = score_ats_parse_rate(text)
        assert len(checks) == 10
        assert isinstance(score, float)
        assert score > 0

    def test_file_format_error(self):
        text = "[Error: Could not parse file]"
        score, checks = score_ats_parse_rate(text)
        file_check = next(c for c in checks if c["id"] == "file_format")
        assert file_check["passed"] is False
        assert file_check["score"] == 0.0

    def test_low_word_count_fails_format(self):
        text = "Short"
        score, checks = score_ats_parse_rate(text)
        file_check = next(c for c in checks if c["id"] == "file_format")
        assert file_check["passed"] is False

    def test_no_contact_info(self):
        text = "Just some text without email or phone number"
        score, checks = score_ats_parse_rate(text)
        contact = next(c for c in checks if c["id"] == "contact_info")
        assert contact["passed"] is False

    def test_partial_contact(self):
        text = "test@email.com"
        score, checks = score_ats_parse_rate(text)
        contact = next(c for c in checks if c["id"] == "contact_info")
        assert contact["score"] == 5.0

    def test_full_contact(self):
        text = "test@email.com +1-555-123-4567"
        score, checks = score_ats_parse_rate(text)
        contact = next(c for c in checks if c["id"] == "contact_info")
        assert contact["passed"] is True

    def test_no_sections_found(self):
        text = "Random text without any section headings"
        score, checks = score_ats_parse_rate(text)
        section = next(c for c in checks if c["id"] == "section_completeness")
        assert section["passed"] is False

    def test_no_bullet_points(self):
        text = "Just a paragraph without any bullet points"
        score, checks = score_ats_parse_rate(text)
        bullet = next(c for c in checks if c["id"] == "bullet_format")
        assert bullet["passed"] is False

    def test_no_keywords(self):
        text = "Some random unrelated text about cooking"
        score, checks = score_ats_parse_rate(text)
        kw = next(c for c in checks if c["id"] == "keyword_density")
        assert kw["passed"] is False

    def test_skills_section_present_with_tech(self):
        text = "Skills\nPython, Machine Learning, Docker, Kubernetes, AWS, SQL"
        score, checks = score_ats_parse_rate(text)
        skills = next(c for c in checks if c["id"] == "skills_section")
        assert skills["passed"] is True

    def test_skills_section_present_no_tech(self):
        text = "Skills\nCommunication, teamwork"
        score, checks = score_ats_parse_rate(text)
        skills = next(c for c in checks if c["id"] == "skills_section")
        assert skills["passed"] is True

    def test_skills_section_absent(self):
        text = "Some text without a skills section"
        score, checks = score_ats_parse_rate(text)
        skills = next(c for c in checks if c["id"] == "skills_section")
        assert skills["passed"] is False

    def test_complex_tables_detected(self):
        text = "| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 | Col7 | Col8 | Col9 | Col10 | Col11 |"
        score, checks = score_ats_parse_rate(text)
        tables = next(c for c in checks if c["id"] == "no_tables")
        assert tables["passed"] is False

    def test_standard_chars_pass(self):
        text = "Normal ASCII text with standard characters."
        score, checks = score_ats_parse_rate(text)
        std = next(c for c in checks if c["id"] == "standard_chars")
        assert std["passed"] is True

    def test_non_standard_chars_fail(self):
        text = "Text with \x00\x01\x02 non-standard chars"
        score, checks = score_ats_parse_rate(text)
        std = next(c for c in checks if c["id"] == "standard_chars")
        assert std["passed"] is False

    def test_length_ideal(self):
        text = "word " * 500
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 10.0

    def test_length_medium_short(self):
        text = "word " * 250
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 7.0

    def test_length_long(self):
        text = "word " * 900
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 6.0

    def test_length_short(self):
        text = "word " * 150
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 4.0

    def test_length_very_long(self):
        text = "word " * 1300
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 3.0

    def test_length_minimal(self):
        text = "word " * 50
        score, checks = score_ats_parse_rate(text)
        length = next(c for c in checks if c["id"] == "resume_length")
        assert length["score"] == 1.0

    def test_dates_found(self):
        text = "Jan 2020 - Mar 2023 and Feb 2019"
        score, checks = score_ats_parse_rate(text)
        dates = next(c for c in checks if c["id"] == "experience_dates")
        assert dates["passed"] is True

    def test_no_dates(self):
        text = "Some text without any dates at all"
        score, checks = score_ats_parse_rate(text)
        dates = next(c for c in checks if c["id"] == "experience_dates")
        assert dates["passed"] is False


# ========== score_human_quality ==========

class TestScoreHumanQuality:
    def test_returns_full_checks(self):
        text = (
            "Professional Summary\n"
            "Experienced developer\n"
            "• Developed ML models improving accuracy by 35%\n"
            "• Led team of 5 engineers\n"
            "• Reduced costs by 40%\n"
            "• Built system processing 10K+ documents\n"
            "• Managed $500K budget\n\n"
            "Volunteer at local charity\n"
            "Certified AWS developer\n"
            "Published author\n"
        )
        score, checks = score_human_quality(text)
        assert len(checks) == 10
        assert isinstance(score, float)

    def test_no_quantified_achievements(self):
        text = "Did some work. Helped the team."
        score, checks = score_human_quality(text)
        quant = next(c for c in checks if c["id"] == "quantified_achievements")
        assert quant["passed"] is False

    def test_few_action_verbs(self):
        text = "Was responsible for development. Duties included testing."
        score, checks = score_human_quality(text)
        verbs = next(c for c in checks if c["id"] == "action_verbs")
        assert verbs["passed"] is False

    def test_many_action_verbs(self):
        text = "Developed. Implemented. Designed. Built. Led. Optimized. Deployed."
        score, checks = score_human_quality(text)
        verbs = next(c for c in checks if c["id"] == "action_verbs")
        assert verbs["passed"] is True

    def test_active_voice_present(self):
        text = "Developed the system. Implemented the solution."
        score, checks = score_human_quality(text)
        voice = next(c for c in checks if c["id"] == "active_voice")
        assert voice["passed"] is True

    def test_passive_voice_detected(self):
        text = "The system was developed by me. The solution was implemented."
        score, checks = score_human_quality(text)
        voice = next(c for c in checks if c["id"] == "active_voice")
        assert voice["passed"] is False

    def test_passive_only(self):
        text = "Was developed. Was implemented. Was tested."
        score, checks = score_human_quality(text)
        voice = next(c for c in checks if c["id"] == "active_voice")
        assert voice["score"] == 1.0

    def test_many_buzzwords(self):
        text = "Synergy leverage innovative dynamic results-oriented team player ninja guru rockstar"
        score, checks = score_human_quality(text)
        buzz = next(c for c in checks if c["id"] == "buzzword_avoidance")
        assert buzz["passed"] is False
        assert buzz["score"] == 2.0

    def test_moderate_buzzwords(self):
        text = "Synergy leverage innovative"
        score, checks = score_human_quality(text)
        buzz = next(c for c in checks if c["id"] == "buzzword_avoidance")
        assert buzz["score"] == 7.0

    def test_few_buzzwords(self):
        text = "Synergy only"
        score, checks = score_human_quality(text)
        buzz = next(c for c in checks if c["id"] == "buzzword_avoidance")
        assert buzz["score"] == 10.0

    def test_spelling_errors_detected(self):
        text = "Managment responsiblities acheived"
        score, checks = score_human_quality(text)
        grammar = next(c for c in checks if c["id"] == "spelling_grammar")
        assert grammar["passed"] is False

    def test_grammar_double_spaces(self):
        text = "This  has  double  spaces"
        score, checks = score_human_quality(text)
        grammar = next(c for c in checks if c["id"] == "spelling_grammar")
        assert grammar["score"] < 10.0

    def test_has_headline(self):
        text = "Professional Summary\nExperienced developer"
        score, checks = score_human_quality(text)
        headline = next(c for c in checks if c["id"] == "tailored_headline")
        assert headline["passed"] is True

    def test_no_headline_with_short_first_line(self):
        text = "Hi"
        score, checks = score_human_quality(text)
        headline = next(c for c in checks if c["id"] == "tailored_headline")
        assert headline["passed"] is False
        assert headline["score"] == 0.0

    def test_no_headline_with_good_first_line(self):
        text = "Senior Data Scientist with 5 years of experience"
        score, checks = score_human_quality(text)
        headline = next(c for c in checks if c["id"] == "tailored_headline")
        assert headline["score"] == 3.0

    def test_personality_signals(self):
        text = "Volunteer at charity. Certified AWS. Published author. Mentor at bootcamp."
        score, checks = score_human_quality(text)
        personality = next(c for c in checks if c["id"] == "personality_showcase")
        assert personality["passed"] is True

    def test_no_personality_signals(self):
        text = "Just work experience with no extracurriculars."
        score, checks = score_human_quality(text)
        personality = next(c for c in checks if c["id"] == "personality_showcase")
        assert personality["passed"] is False

    def test_strong_bullet_starts(self):
        text = "• Developed features\n• Implemented solutions\n• Led the team\n"
        score, checks = score_human_quality(text)
        bullet_start = next(c for c in checks if c["id"] == "strong_bullet_starts")
        assert bullet_start["passed"] is True

    def test_weak_bullet_starts(self):
        text = "• the project\n• a solution\n• for the team\n"
        score, checks = score_human_quality(text)
        bullet_start = next(c for c in checks if c["id"] == "strong_bullet_starts")
        assert bullet_start["passed"] is False

    def test_no_bullets(self):
        text = "Just a paragraph without bullets"
        score, checks = score_human_quality(text)
        bullet_start = next(c for c in checks if c["id"] == "strong_bullet_starts")
        assert bullet_start["passed"] is False
        assert bullet_start["score"] == 0.0

    def test_weak_phrases_detected(self):
        text = "Responsible for development. Duties included testing."
        score, checks = score_human_quality(text)
        weak = next(c for c in checks if c["id"] == "weak_phrases")
        assert weak["passed"] is False

    def test_no_weak_phrases(self):
        text = "Developed the system. Implemented features."
        score, checks = score_human_quality(text)
        weak = next(c for c in checks if c["id"] == "weak_phrases")
        assert weak["passed"] is True

    def test_structure_long_lines(self):
        text = "A" * 250 + "\nNormal line"
        score, checks = score_human_quality(text)
        struct = next(c for c in checks if c["id"] == "structure_quality")
        assert struct["score"] < 5.0

    def test_structure_excessive_blank_lines(self):
        text = "Line1\n\n\n\n\n\n\n\n\n\n\n\n\n\nLine2"
        score, checks = score_human_quality(text)
        struct = next(c for c in checks if c["id"] == "structure_quality")
        assert struct["passed"] is False

    def test_structure_all_caps(self):
        text = "VERY IMPORTANT\nANOTHER CAPS LINE\nYET ANOTHER\nFOURTH ONE\nNORMAL LINE"
        score, checks = score_human_quality(text)
        struct = next(c for c in checks if c["id"] == "structure_quality")
        assert struct["score"] < 5.0


# ========== generate_dual_score_report ==========

class TestGenerateDualScoreReport:
    @patch("app.ats_scorer.parse_resume")
    def test_returns_complete_report(self, mock_parse):
        mock_parse.return_value = (
            "test@email.com +1-555-123-4567\n"
            "• Developed ML models improving accuracy by 35%\n"
            "• Led team of 5 engineers\n"
            "Skills\nPython, SQL\n"
            "Experience\nJan 2020\n"
            "Education\n"
            "Summary\n"
        )
        report = generate_dual_score_report("/fake/path.pdf")
        assert "atsparse_score" in report
        assert "human_quality_score" in report
        assert "unified_score" in report
        assert "tier1_checks" in report
        assert "tier2_checks" in report
        assert "all_suggestions" in report
        assert "breakdown" in report
        assert "keywords_found" in report
        assert "keywords_missing" in report
        assert "raw_text" in report


# ========== calculate_ats_score ==========

class TestCalculateATSScore:
    @patch("app.ats_scorer.parse_resume")
    def test_returns_formatted_result(self, mock_parse):
        mock_parse.return_value = "Some resume text with keywords Python and SQL"
        result = calculate_ats_score("/fake/path.pdf")
        assert "ats_score" in result
        assert "breakdown" in result
        assert "keywords_found" in result
        assert "keywords_missing" in result
        assert "suggestions" in result
        assert "nineteen_point" in result
        assert "tier1_checks" in result
        assert "tier2_checks" in result
        assert 0 <= result["ats_score"] <= 100

    @patch("app.ats_scorer.parse_resume")
    def test_suggestions_capped_at_8(self, mock_parse):
        mock_parse.return_value = "a"
        result = calculate_ats_score("/fake/path.pdf")
        assert len(result["suggestions"]) <= 8

    @patch("app.ats_scorer.parse_resume")
    def test_score_clamped_to_range(self, mock_parse):
        mock_parse.return_value = "x"
        result = calculate_ats_score("/fake/path.pdf")
        assert 0 <= result["ats_score"] <= 100


# ========== generate_nineteen_point_checks ==========

class TestGenerateNineteenPoint:
    def test_creates_categories(self):
        tier1 = [{"id": "file_format", "passed": True, "score": 5.0, "max_score": 5, "label": "test", "detail": "test"}]
        tier2 = [{"id": "action_verbs", "passed": True, "score": 10.0, "max_score": 15, "label": "test", "detail": "test"}]
        result = generate_nineteen_point_checks(tier1, tier2)
        assert "Content" in result
        assert "Format" in result
        assert "Skills" in result
        assert "Sections" in result
        assert "Style" in result
