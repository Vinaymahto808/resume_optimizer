import pytest
from unittest.mock import MagicMock, patch, mock_open

from app.resume_parser import (
    _validate_magic, _tesseract_available, _ocr_with_tesseract,
    _ocr_with_groq, _render_pdf_pages_as_images,
    extract_text_from_scanned_pdf, extract_text_from_pdf,
    extract_text_from_docx, extract_text_from_image,
    extract_text_from_resume,
)


class TestValidateMagic:
    def test_valid_pdf(self):
        valid, _ = _validate_magic(b"%PDF-1.4", "pdf")
        assert valid is True

    def test_invalid_pdf(self):
        valid, _ = _validate_magic(b"Not a PDF", "pdf")
        assert valid is False

    def test_valid_docx(self):
        valid, resolved = _validate_magic(b"PK\x03\x04", "docx")
        assert valid is True
        assert resolved == "docx"

    def test_valid_doc_magic(self):
        valid, resolved = _validate_magic(b"\xD0\xCF\x11\xE0", "doc")
        assert valid is True
        assert resolved == "doc"

    def test_invalid_doc(self):
        valid, msg = _validate_magic(b"not a doc", "docx")
        assert valid is False
        assert "header" in msg.lower()

    def test_unknown_ext_passes(self):
        valid, resolved = _validate_magic(b"anything", "txt")
        assert valid is True
        assert resolved == "txt"


class TestTesseractAvailable:
    def test_available(self):
        mock_pytesseract = MagicMock()
        mock_pytesseract.pytesseract = MagicMock()
        mock_pytesseract.pytesseract.get_tesseract_version.return_value = "5.0"
        with patch.dict("sys.modules", {"pytesseract": mock_pytesseract}):
            assert _tesseract_available() is True

    def test_not_available(self):
        mock_pytesseract = MagicMock()
        mock_pytesseract.pytesseract = MagicMock()
        mock_pytesseract.pytesseract.get_tesseract_version.side_effect = Exception("not found")
        with patch.dict("sys.modules", {"pytesseract": mock_pytesseract}):
            assert _tesseract_available() is False

    def test_import_error(self):
        assert _tesseract_available() is False


class TestOcrWithTesseract:
    def test_ocr_success(self):
        mock_img = MagicMock()
        mock_img.mode = "RGB"
        mock_pil = MagicMock()
        mock_pil.Image = MagicMock()
        mock_pil.Image.open.return_value = mock_img
        mock_ts_mod = MagicMock()
        mock_ts_mod.image_to_string.return_value = "Extracted text\n"
        with patch.dict("sys.modules", {"PIL": mock_pil, "pytesseract": mock_ts_mod}):
            result = _ocr_with_tesseract(b"image bytes")
            assert result == "Extracted text"

    def test_converts_non_rgb(self):
        mock_img = MagicMock()
        mock_img.mode = "CMYK"
        mock_pil = MagicMock()
        mock_pil.Image = MagicMock()
        mock_pil.Image.open.return_value = mock_img
        mock_ts_mod = MagicMock()
        mock_ts_mod.image_to_string.return_value = "Text"
        with patch.dict("sys.modules", {"PIL": mock_pil, "pytesseract": mock_ts_mod}):
            _ocr_with_tesseract(b"image bytes")
            mock_img.convert.assert_called_once_with("RGB")


class TestOcrWithGroq:
    def test_groq_ocr(self):
        mock_openai = MagicMock()
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Groq extracted text"
        mock_response.choices = [mock_choice]
        mock_openai.OpenAI.return_value.chat.completions.create.return_value = mock_response
        with patch.dict("sys.modules", {"openai": mock_openai}):
            result = _ocr_with_groq(b"image bytes", "test-key")
            assert result == "Groq extracted text"


class TestRenderPdfPagesAsImages:
    def test_renders_pages(self):
        mock_fitz = MagicMock()
        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_pix = MagicMock()
        mock_pix.tobytes.return_value = b"page image"
        mock_page.get_pixmap.return_value = mock_pix
        mock_doc.__iter__.return_value = [mock_page, mock_page, mock_page, mock_page, mock_page]
        mock_fitz.open.return_value = mock_doc
        with patch.dict("sys.modules", {"fitz": mock_fitz}):
            images = _render_pdf_pages_as_images(b"pdf bytes", max_pages=3)
            assert len(images) == 3
            mock_doc.close.assert_called_once()

    def test_respects_max_pages(self):
        mock_fitz = MagicMock()
        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_pix = MagicMock()
        mock_pix.tobytes.return_value = b"img"
        mock_page.get_pixmap.return_value = mock_pix
        mock_doc.__iter__.return_value = [mock_page] * 10
        mock_fitz.open.return_value = mock_doc
        with patch.dict("sys.modules", {"fitz": mock_fitz}):
            images = _render_pdf_pages_as_images(b"pdf bytes", max_pages=2)
            assert len(images) == 2


class TestExtractTextFromScannedPdf:
    @patch("app.resume_parser._render_pdf_pages_as_images")
    @patch("app.resume_parser._tesseract_available")
    @patch("app.resume_parser._ocr_with_tesseract")
    def test_uses_tesseract(self, mock_ocr, mock_avail, mock_render):
        mock_render.return_value = [b"img1", b"img2"]
        mock_avail.return_value = True
        mock_ocr.return_value = "Tesseract text"
        result = extract_text_from_scanned_pdf(b"pdf bytes")
        assert "Tesseract text" in result

    @patch("app.resume_parser._render_pdf_pages_as_images")
    @patch("app.resume_parser._tesseract_available")
    @patch("app.resume_parser._ocr_with_groq")
    def test_falls_back_to_groq(self, mock_groq, mock_avail, mock_render):
        mock_render.return_value = [b"img1"]
        mock_avail.return_value = False
        mock_groq.return_value = "Groq text"
        result = extract_text_from_scanned_pdf(b"pdf bytes", groq_api_key="key")
        assert "Groq text" in result

    @patch("app.resume_parser._render_pdf_pages_as_images")
    @patch("app.resume_parser._tesseract_available")
    def test_no_engine_available(self, mock_avail, mock_render):
        mock_render.return_value = [b"img1"]
        mock_avail.return_value = False
        result = extract_text_from_scanned_pdf(b"pdf bytes", groq_api_key="")
        assert result == ""

    @patch("app.resume_parser._render_pdf_pages_as_images")
    def test_no_pages(self, mock_render):
        mock_render.return_value = []
        result = extract_text_from_scanned_pdf(b"empty")
        assert result == ""


class TestExtractTextFromPdf:
    def test_extracts_text(self):
        mock_pypdf = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Page content " * 30
        mock_pypdf.PdfReader.return_value.pages = [mock_page, mock_page]
        with patch.dict("sys.modules", {"pypdf": mock_pypdf}):
            result = extract_text_from_pdf(b"pdf bytes")
            assert result

    def test_short_text_triggers_ocr(self):
        mock_pypdf = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "short"
        mock_pypdf.PdfReader.return_value.pages = [mock_page]
        with patch.dict("sys.modules", {"pypdf": mock_pypdf}):
            with patch("app.resume_parser.extract_text_from_scanned_pdf") as mock_ocr:
                mock_ocr.return_value = "OCR full text"
                result = extract_text_from_pdf(b"pdf bytes", "groq-key")
                assert result == "OCR full text"

    def test_short_text_triggers_ocr_returns_original(self):
        mock_pypdf = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "short"
        mock_pypdf.PdfReader.return_value.pages = [mock_page]
        with patch.dict("sys.modules", {"pypdf": mock_pypdf}):
            with patch("app.resume_parser.extract_text_from_scanned_pdf") as mock_ocr:
                mock_ocr.return_value = ""
                result = extract_text_from_pdf(b"pdf bytes", "groq-key")
                assert result == "short"

    def test_import_error(self):
        result = extract_text_from_pdf(b"bytes")
        assert result == ""

    def test_exception_handling(self):
        mock_pypdf = MagicMock()
        mock_pypdf.PdfReader.side_effect = Exception("read error")
        with patch.dict("sys.modules", {"pypdf": mock_pypdf}):
            result = extract_text_from_pdf(b"bytes")
            assert result == ""


class TestExtractTextFromDocx:
    def test_extracts_docx(self):
        mock_docx = MagicMock()
        mock_doc = MagicMock()
        para1 = MagicMock()
        para1.text = "Line 1"
        para2 = MagicMock()
        para2.text = "Line 2"
        mock_doc.paragraphs = [para1, para2]
        mock_docx.Document.return_value = mock_doc
        with patch.dict("sys.modules", {"docx": mock_docx}):
            result = extract_text_from_docx(b"docx bytes")
            assert result == "Line 1\nLine 2"

    def test_import_error(self):
        result = extract_text_from_docx(b"bytes")
        assert result == ""

    def test_exception(self):
        mock_docx = MagicMock()
        mock_docx.Document.side_effect = Exception("error")
        with patch.dict("sys.modules", {"docx": mock_docx}):
            result = extract_text_from_docx(b"bytes")
            assert result == ""


class TestExtractTextFromImage:
    @patch("app.resume_parser._tesseract_available")
    @patch("app.resume_parser._ocr_with_tesseract")
    def test_tesseract_success(self, mock_ocr, mock_avail):
        mock_avail.return_value = True
        mock_ocr.return_value = "Tesseract text"
        result = extract_text_from_image(b"img")
        assert result == "Tesseract text"

    @patch("app.resume_parser._tesseract_available")
    @patch("app.resume_parser._ocr_with_groq")
    def test_groq_fallback(self, mock_groq, mock_avail):
        mock_avail.return_value = False
        mock_groq.return_value = "Groq text"
        result = extract_text_from_image(b"img", "key")
        assert result == "Groq text"

    @patch("app.resume_parser._tesseract_available")
    def test_no_engine(self, mock_avail):
        mock_avail.return_value = False
        result = extract_text_from_image(b"img", "")
        assert result == ""


class TestExtractTextFromResume:
    def test_unknown_ext(self):
        result = extract_text_from_resume("file.xyz", b"content", "xyz")
        assert result["success"] is False
        assert "Unsupported" in result["error"]

    @patch("app.resume_parser.extract_text_from_image")
    def test_image_file_success(self, mock_extract):
        mock_extract.return_value = "Image text"
        result = extract_text_from_resume("file.png", b"img", "png")
        assert result["success"] is True
        assert result["ocr"] is True

    @patch("app.resume_parser.extract_text_from_image")
    def test_image_file_failure(self, mock_extract):
        mock_extract.return_value = ""
        result = extract_text_from_resume("file.png", b"img", "png")
        assert result["success"] is False

    @patch("app.resume_parser._validate_magic")
    @patch("app.resume_parser.extract_text_from_pdf")
    def test_pdf_success(self, mock_extract, mock_validate):
        mock_validate.return_value = (True, "pdf")
        mock_extract.return_value = "PDF content"
        result = extract_text_from_resume("file.pdf", b"pdf", "pdf")
        assert result["success"] is True
        assert result["text"] == "PDF content"

    @patch("app.resume_parser._validate_magic")
    def test_invalid_magic(self, mock_validate):
        mock_validate.return_value = (False, "Invalid header")
        result = extract_text_from_resume("file.pdf", b"bad", "pdf")
        assert result["success"] is False

    @patch("app.resume_parser._validate_magic")
    @patch("app.resume_parser.extract_text_from_pdf")
    def test_pdf_empty_text(self, mock_extract, mock_validate):
        mock_validate.return_value = (True, "pdf")
        mock_extract.return_value = ""
        result = extract_text_from_resume("file.pdf", b"pdf", "pdf")
        assert result["success"] is False

    @patch("app.resume_parser._validate_magic")
    @patch("app.resume_parser.extract_text_from_docx")
    def test_docx_success(self, mock_extract, mock_validate):
        mock_validate.return_value = (True, "docx")
        mock_extract.return_value = "DOCX content"
        result = extract_text_from_resume("file.docx", b"docx", "docx")
        assert result["success"] is True

    @patch("app.resume_parser._validate_magic")
    def test_unreachable_format(self, mock_validate):
        mock_validate.return_value = (True, "unknown")
        result = extract_text_from_resume("file.pdf", b"bytes", "pdf")
        assert result["success"] is False

    def test_no_ext_falls_back_to_filename(self):
        with patch("app.resume_parser._validate_magic") as mock_val:
            mock_val.return_value = (False, "bad")
            result = extract_text_from_resume("file.pdf", b"bytes", "")
            assert result["success"] is False
