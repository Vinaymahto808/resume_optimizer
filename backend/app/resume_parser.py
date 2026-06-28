import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"
DOCX_MAGIC = b"PK\x03\x04"
DOC_MAGIC = b"\xD0\xCF\x11\xE0"

OCR_MIN_CHARS = 50


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


def _tesseract_available() -> bool:
    try:
        from pytesseract import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def _ocr_with_tesseract(image_bytes: bytes) -> str:
    from PIL import Image
    import pytesseract
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    text = pytesseract.image_to_string(img, config="--psm 6 --oem 3")
    return text.strip()


def _ocr_with_groq(image_bytes: bytes, api_key: str) -> str:
    import base64
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = (
        "Extract all text from this resume image. Preserve structure, sections, "
        "bullet points, and formatting as much as possible. Return only the raw text."
    )
    response = client.chat.completions.create(
        model="llama-3.2-90b-vision-preview",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            ],
        }],
        max_tokens=2000,
    )
    return response.choices[0].message.content.strip() if response.choices else ""


def _render_pdf_pages_as_images(file_bytes: bytes, max_pages: int = 3) -> list[bytes]:
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    images = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        images.append(img_bytes)
    doc.close()
    return images


def extract_text_from_scanned_pdf(file_bytes: bytes, groq_api_key: str = "") -> str:
    """Try OCR on scanned/image-based PDFs. Uses Tesseract first, falls back to Groq Vision."""
    texts = []
    pages = _render_pdf_pages_as_images(file_bytes)
    if not pages:
        return ""

    if _tesseract_available():
        for img_bytes in pages:
            text = _ocr_with_tesseract(img_bytes)
            if text:
                texts.append(text)
    elif groq_api_key:
        for img_bytes in pages:
            text = _ocr_with_groq(img_bytes, groq_api_key)
            if text:
                texts.append(text)
    else:
        logger.warning("No OCR engine available. Install tesseract or set GROQ_API_KEY.")
        return ""

    return "\n".join(texts).strip()


def extract_text_from_pdf(file_bytes: bytes, groq_api_key: str = "") -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        text = text.strip()
        if len(text) < OCR_MIN_CHARS:
            logger.info(f"PDF returned only {len(text)} chars — trying OCR fallback")
            ocr_text = extract_text_from_scanned_pdf(file_bytes, groq_api_key)
            return ocr_text or text
        return text
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


def extract_text_from_image(file_bytes: bytes, groq_api_key: str = "") -> str:
    """Extract text directly from image files (PNG, JPG, etc.) using OCR."""
    if _tesseract_available():
        text = _ocr_with_tesseract(file_bytes)
        if text:
            return text
    if groq_api_key:
        text = _ocr_with_groq(file_bytes, groq_api_key)
        if text:
            return text
    return ""


def extract_text_from_resume(filename: str, file_bytes: bytes, ext: str = "", groq_api_key: str = "") -> dict:
    if not ext:
        ext = filename.lower().split(".")[-1] if "." in filename else ""

    image_exts = {"png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"}

    if ext in image_exts:
        text = extract_text_from_image(file_bytes, groq_api_key)
        if not text:
            return {"success": False, "error": "Could not extract text from image. Please upload a clear scan."}
        return {"success": True, "text": text, "char_count": len(text), "word_count": len(text.split()), "ocr": True}

    if ext not in ("pdf", "doc", "docx"):
        return {"success": False, "error": f"Unsupported format: .{ext}. Please upload a PDF, DOC/DOCX, or image file."}

    valid, resolved = _validate_magic(file_bytes, ext)
    if not valid:
        return {"success": False, "error": resolved}

    if resolved == "pdf":
        text = extract_text_from_pdf(file_bytes, groq_api_key)
    elif resolved in ("doc", "docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        return {"success": False, "error": "Unrecognized file format."}

    if not text:
        return {"success": False, "error": "Could not extract text from the file. The file may be empty, protected, or a scanned image without OCR configured."}

    return {"success": True, "text": text, "char_count": len(text), "word_count": len(text.split())}
