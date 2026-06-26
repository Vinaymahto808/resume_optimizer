import pytest
from unittest.mock import MagicMock, patch

import requests

from app.linkedin_scraper import (
    extract_username, fetch_profile_text, fetch_profile_full,
    parse_linkedin_html, scrape_public_profile, html_unescape,
    _try_direct_fetch, _try_google_cache, _try_proxy_fetch, _try_textise_fetch,
)


class TestHtmlUnescape:
    def test_basic_entities(self):
        assert html_unescape("&amp; &lt; &gt;") == "& < >"

    def test_quote_entities(self):
        assert html_unescape("&quot; &#39;") == '" \''

    def test_no_entities(self):
        assert html_unescape("plain text") == "plain text"


class TestExtractUsername:
    def test_extracts_from_full_url(self):
        assert extract_username("https://linkedin.com/in/johndoe") == "johndoe"

    def test_extracts_with_extra_path(self):
        assert extract_username("https://linkedin.com/in/johndoe/details/experience") == "johndoe"

    def test_returns_none_for_invalid(self):
        assert extract_username("https://example.com") is None

    def test_handles_trailing_slash(self):
        assert extract_username("https://linkedin.com/in/johndoe/") == "johndoe"

    def test_case_insensitive(self):
        assert extract_username("https://LINKEDIN.COM/in/JohnDoe") == "johndoe"


class TestFetchProfileText:
    @patch("app.linkedin_scraper._try_direct_fetch")
    def test_first_strategy_succeeds(self, mock_direct):
        mock_direct.return_value = {"text": "Profile text", "headline": "", "name": ""}
        result = fetch_profile_text("https://linkedin.com/in/testuser")
        assert result["success"] is True
        assert result["source"] == "Direct fetch"

    @patch("app.linkedin_scraper._try_direct_fetch")
    @patch("app.linkedin_scraper._try_google_cache")
    def test_falls_to_second_strategy(self, mock_cache, mock_direct):
        mock_direct.return_value = None
        mock_cache.return_value = {"text": "Cached text", "headline": "", "name": ""}
        result = fetch_profile_text("https://linkedin.com/in/testuser")
        assert result["success"] is True
        assert result["source"] == "Google cache"

    @patch("app.linkedin_scraper._try_direct_fetch")
    @patch("app.linkedin_scraper._try_google_cache")
    @patch("app.linkedin_scraper._try_proxy_fetch")
    @patch("app.linkedin_scraper._try_textise_fetch")
    def test_all_strategies_fail(self, mock_textise, mock_proxy, mock_cache, mock_direct):
        mock_direct.return_value = None
        mock_cache.return_value = None
        mock_proxy.return_value = None
        mock_textise.return_value = None
        result = fetch_profile_text("https://linkedin.com/in/testuser")
        assert result["success"] is False

    def test_invalid_url(self):
        result = fetch_profile_text("https://example.com")
        assert result["success"] is False
        assert "Invalid" in result["error"]


class TestFetchProfileFull:
    def test_invalid_url(self):
        result = fetch_profile_full("https://example.com")
        assert result["success"] is False

    @patch("app.linkedin_scraper._try_direct_fetch")
    def test_successful_fetch(self, mock_direct):
        mock_direct.return_value = {"text": "<html><title>John Doe | Data Scientist | LinkedIn</title></html>", "headline": "", "name": ""}
        result = fetch_profile_full("https://linkedin.com/in/johndoe")
        assert result["success"] is True
        assert result["username"] == "johndoe"

    @patch("app.linkedin_scraper._try_direct_fetch")
    @patch("app.linkedin_scraper._try_google_cache")
    @patch("app.linkedin_scraper._try_proxy_fetch")
    @patch("app.linkedin_scraper._try_textise_fetch")
    def test_all_fail(self, mock_tex, mock_proxy, mock_cache, mock_direct):
        mock_direct.return_value = None
        mock_cache.return_value = None
        mock_proxy.return_value = None
        mock_tex.return_value = None
        result = fetch_profile_full("https://linkedin.com/in/johndoe")
        assert result["success"] is False
        assert "error" in result


class TestParseLinkedInHtml:
    def test_extracts_name_from_title(self):
        html = "<title>John Doe | Data Scientist | LinkedIn</title>"
        result = parse_linkedin_html(html)
        assert "John Doe" in result["name"]

    def test_extracts_headline_from_title(self):
        html = "<title>John Doe | Data Scientist at Google | LinkedIn</title>"
        result = parse_linkedin_html(html)
        assert "Data Scientist" in result["headline"]

    def test_falls_back_to_h1(self):
        html = "<h1>Jane Smith</h1>"
        result = parse_linkedin_html(html)
        assert "Jane Smith" in result["name"]

    def test_extracts_about(self):
        html = '<section class="core-section-container"><p class="break-words">About me text</p></section>'
        result = parse_linkedin_html(html)
        assert "About me text" in result["about"]

    def test_extracts_skills(self):
        html = '<span class="visually-hidden">Python</span><span class="visually-hidden">SQL</span>'
        result = parse_linkedin_html(html)
        assert "Python" in result["skills"]
        assert "SQL" in result["skills"]

    def test_deduplicates_skills(self):
        html = '<span class="visually-hidden">Python</span><span class="visually-hidden">Python</span>'
        result = parse_linkedin_html(html)
        assert len(result["skills"]) == 1

    def test_empty_html(self):
        result = parse_linkedin_html("")
        assert result["name"] == ""
        assert result["about"] == ""
        assert result["skills"] == []


class TestTryDirectFetch:
    @patch("app.linkedin_scraper.requests.get")
    def test_successful_fetch(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<section class="core-section-container"><p class="break-words">About section text longer than fifty characters to pass the minimum check</p></section>'
        mock_get.return_value = mock_response
        result = _try_direct_fetch("testuser")
        assert result is not None
        assert "About" in result["text"]

    @patch("app.linkedin_scraper.requests.get")
    def test_non_200_response(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        result = _try_direct_fetch("testuser")
        assert result is None


class TestTryGoogleCache:
    @patch("app.linkedin_scraper.requests.get")
    def test_successful_fetch(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<div class="core-section-container__content">About section text longer than fifty characters for validation purposes here</section>'
        mock_get.return_value = mock_response
        result = _try_google_cache("testuser")
        assert result is not None

    @patch("app.linkedin_scraper.requests.get")
    def test_non_200_response(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response
        result = _try_google_cache("testuser")
        assert result is None


class TestTryProxyFetch:
    @patch("app.linkedin_scraper.requests.get")
    def test_successful_fetch(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<section class="core-section-container"><p class="break-words">About section text long enough to meet the fifty character threshold requirement</p></section>'
        mock_get.return_value = mock_response
        result = _try_proxy_fetch("testuser")
        assert result is not None

    @patch("app.linkedin_scraper.requests.get")
    def test_non_200_response(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response
        result = _try_proxy_fetch("testuser")
        assert result is None


class TestTryTextiseFetch:
    @patch("app.linkedin_scraper.requests.get")
    def test_successful_fetch(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "A" * 150
        mock_get.return_value = mock_response
        result = _try_textise_fetch("testuser")
        assert result is not None

    @patch("app.linkedin_scraper.requests.get")
    def test_short_content(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "short"
        mock_get.return_value = mock_response
        result = _try_textise_fetch("testuser")
        assert result is None

    @patch("app.linkedin_scraper.requests.get")
    def test_non_200_response(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response
        result = _try_textise_fetch("testuser")
        assert result is None

    @patch("app.linkedin_scraper.requests.get")
    def test_exception(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Network error")
        result = _try_textise_fetch("testuser")
        assert result is None


class TestScrapePublicProfile:
    def test_invalid_url(self):
        result = scrape_public_profile("https://example.com")
        assert result["success"] is False

    @patch("app.linkedin_scraper._try_direct_fetch")
    def test_successful_fetch(self, mock_direct):
        mock_direct.return_value = {
            "text": "<html><title>John Doe | Data Scientist | LinkedIn</title></html>",
            "headline": "",
            "name": "",
        }
        result = scrape_public_profile("https://linkedin.com/in/johndoe")
        assert result["success"] is True
        assert result["username"] == "johndoe"
