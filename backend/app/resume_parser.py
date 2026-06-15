import io
import logging

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"
DOCX_MAGIC = b"PK\x03\x04"
DOC_MAGIC = b"\xD0\xCF\x11\xE0"


def _validate_magic(file_bytes: bytes, ext: str) -> tuple[bool, str]:
    if ext == "pdf":
        if not file_bytes.startswith(PDF_MAGIC):
            return False, "File header does not match PDF format"
    elif ext in ("doc", "docx"):
        if file_bytes.startswith(DOCX_MAGIC):
            return True, "docx"
        if file_bytes.startswith(DOC_MAGIC):
            return True, "doc"
        return False, "File header does not match DOC/DOCX format"
    return True, ext


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except ImportError:
        logger.error("pypdf not installed")
        return ""
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return text.strip()
    except ImportError:
        logger.error("python-docx not installed")
        return ""
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def extract_text_from_resume(filename: str, file_bytes: bytes, ext: str = "") -> dict:
    if not ext:
        ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext not in ("pdf", "doc", "docx"):
        return {"success": False, "error": f"Unsupported format: .{ext}. Please upload a PDF or DOC/DOCX file."}

    valid, resolved = _validate_magic(file_bytes, ext)
    if not valid:
        return {"success": False, "error": resolved}

    if resolved == "pdf":
        text = extract_text_from_pdf(file_bytes)
    elif resolved in ("doc", "docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        return {"success": False, "error": "Unrecognized file format."}

    if not text:
        return {"success": False, "error": "Could not extract text from the file. The file may be empty or protected."}

    return {"success": True, "text": text, "char_count": len(text), "word_count": len(text.split())}
