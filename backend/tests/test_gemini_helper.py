import pytest
from unittest.mock import MagicMock, patch

from app.gemini_helper import (
    analyze_with_gemini, match_job_with_gemini, suggest_jobs_with_gemini,
    generate_career_roadmap, generate_portfolio_html, generate_analytics_suggestions,
    PROFILE_ANALYSIS_PROMPT, JOB_MATCH_PROMPT, AI_SUGGEST_JOBS_PROMPT,
    CAREER_ROADMAP_PROMPT, PORTFOLIO_GENERATOR_PROMPT, ANALYTICS_SUGGESTIONS_PROMPT,
)


class TestPromptsFormat:
    def test_profile_analysis_prompt(self):
        prompt = PROFILE_ANALYSIS_PROMPT.format(profile_text="test profile")
        assert "test profile" in prompt
        assert "overall_rating" in prompt

    def test_job_match_prompt(self):
        prompt = JOB_MATCH_PROMPT.format(
            profile_text="test profile",
            job_title="Data Scientist",
            job_description="test job desc",
        )
        assert "test profile" in prompt
        assert "Data Scientist" in prompt
        assert "fit_score" in prompt

    def test_suggest_jobs_prompt(self):
        prompt = AI_SUGGEST_JOBS_PROMPT.format(profile_text="test profile")
        assert "suggested_roles" in prompt

    def test_career_roadmap_prompt(self):
        prompt = CAREER_ROADMAP_PROMPT.format(target_role="Data Scientist")
        assert "Data Scientist" in prompt

    def test_portfolio_prompt(self):
        prompt = PORTFOLIO_GENERATOR_PROMPT.format(resume_text="test resume")
        assert "test resume" in prompt

    def test_analytics_prompt(self):
        prompt = ANALYTICS_SUGGESTIONS_PROMPT.format(profile_text="test profile")
        assert "profile_strength" in prompt


class TestGeminiFunctions:
    def _mock_genai(self, resp_text='{"result": "success"}'):
        mock_genai = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = resp_text
        mock_genai.GenerativeModel.return_value.generate_content.return_value = mock_resp
        return mock_genai

    def test_analyze_with_gemini(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = analyze_with_gemini("test profile", "api-key")
            assert result == {"result": "success"}
            mock_genai.configure.assert_called_once_with(api_key="api-key")

    def test_analyze_with_gemini_error(self):
        mock_genai = MagicMock()
        mock_genai.GenerativeModel.side_effect = Exception("API error")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = analyze_with_gemini("test", "key")
            assert "error" in result

    def test_analyze_strips_code_fences(self):
        mock_genai = self._mock_genai('```json\n{"key": "value"}\n```')
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = analyze_with_gemini("test", "key")
            assert result == {"key": "value"}

    def test_match_job_success(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = match_job_with_gemini("profile", "ML Engineer", "desc", "key")
            assert result == {"result": "success"}

    def test_match_job_error(self):
        mock_genai = MagicMock()
        mock_genai.GenerativeModel.return_value.generate_content.side_effect = Exception("error")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = match_job_with_gemini("p", "t", "d", "k")
            assert "error" in result

    def test_suggest_jobs_success(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = suggest_jobs_with_gemini("profile", "key")
            assert result == {"result": "success"}

    def test_career_roadmap_success(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = generate_career_roadmap("Data Scientist", "key")
            assert result == {"result": "success"}

    def test_career_roadmap_error(self):
        mock_genai = MagicMock()
        mock_genai.GenerativeModel.return_value.generate_content.side_effect = Exception("err")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = generate_career_roadmap("DS", "k")
            assert "error" in result

    def test_portfolio_html_success(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = generate_portfolio_html("resume text", "key")
            assert result == {"result": "success"}

    def test_portfolio_html_error(self):
        mock_genai = MagicMock()
        mock_genai.GenerativeModel.return_value.generate_content.side_effect = Exception("err")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = generate_portfolio_html("r", "k")
            assert "error" in result

    def test_analytics_suggestions_success(self):
        mock_genai = self._mock_genai()
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            result = generate_analytics_suggestions("profile", "key")
            assert result == {"result": "success"}
