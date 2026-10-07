"""
OCR microservice.
POST /ocr  (multipart field "file" = PDF / JPG / PNG)
    -> {"text": "...", "method": "...", "language": "..."}

Strategy:
  * PDF with an embedded text layer -> read text directly (fast, exact)
  * Scanned PDF -> render pages to images using Poppler -> Tesseract
  * Image -> grayscale + autocontrast -> Tesseract

Language strategy:
  * English document -> eng
  * Devanagari document -> compare mar+eng and hin+eng
  * Choose the Devanagari OCR result with the higher confidence

Environment variables:
  TESSERACT_CMD   full path to tesseract.exe
  POPPLER_PATH    folder containing Poppler binaries
  OCR_LANG        optional fixed language override
                  e.g. "eng", "mar+eng", "hin+eng"

If OCR_LANG is not set, automatic language detection is used.
"""

import io
import os
from dotenv import load_dotenv
load_dotenv()
from statistics import mean

import pdfplumber
import pytesseract

from fastapi import FastAPI, File, HTTPException, UploadFile
from pdf2image import convert_from_bytes

from PIL import Image, ImageOps


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]

POPPLER_PATH = os.getenv("POPPLER_PATH") or None

# If OCR_LANG is explicitly provided, automatic detection
# will be bypassed.
OCR_LANG = os.getenv("OCR_LANG")


app = FastAPI(title="Farmer Platform OCR Service")


# ---------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------

def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Convert image to grayscale and improve contrast.
    """

    gray = ImageOps.grayscale(img)
    enhanced = ImageOps.autocontrast(gray)

    return enhanced


# ---------------------------------------------------------
# OCR confidence
# ---------------------------------------------------------

def calculate_confidence(img: Image.Image, lang: str):
    """
    Run Tesseract and calculate average confidence.

    Returns:
        text, confidence
    """

    data = pytesseract.image_to_data(
        img,
        lang=lang,
        output_type=pytesseract.Output.DICT
    )

    text_parts = []
    confidences = []

    for text, conf in zip(data["text"], data["conf"]):

        text = text.strip()

        if text:
            text_parts.append(text)

        try:
            confidence = float(conf)

            if confidence >= 0:
                confidences.append(confidence)

        except (ValueError, TypeError):
            pass

    text = " ".join(text_parts)

    confidence = mean(confidences) if confidences else 0.0

    return text, confidence


# ---------------------------------------------------------
# Detect whether text/image is likely Devanagari
# ---------------------------------------------------------

def detect_script(img: Image.Image) -> str:
    """
    Use Tesseract OSD to detect the script.

    Note:
    Marathi and Hindi both use Devanagari.
    Therefore OSD cannot reliably distinguish Marathi
    from Hindi. It is only used to determine whether
    Devanagari processing should be attempted.
    """

    try:
        osd = pytesseract.image_to_osd(img)

        if "Devanagari" in osd:
            return "devanagari"

    except Exception:
        pass

    return "unknown"


# ---------------------------------------------------------
# Automatic language detection
# ---------------------------------------------------------

def detect_language_and_ocr(img: Image.Image):
    """
    Detect the likely OCR language.

    Strategy:

        1. Detect Devanagari script.
        2. If Devanagari:
              run Marathi + English
              run Hindi + English
              compare confidence
        3. Otherwise:
              use English OCR

    Returns:
        text, language, confidence
    """

    processed = preprocess_image(img)

    # -----------------------------------------------------
    # If user explicitly configured OCR_LANG,
    # use it and skip automatic detection.
    # -----------------------------------------------------

    if OCR_LANG:
        text, confidence = calculate_confidence(
            processed,
            OCR_LANG
        )

        return text, OCR_LANG, confidence

    # -----------------------------------------------------
    # Detect script
    # -----------------------------------------------------

    script = detect_script(processed)

    # -----------------------------------------------------
    # Devanagari document
    # -----------------------------------------------------

    if script == "devanagari":

        # Marathi OCR
        mar_text, mar_confidence = calculate_confidence(
            processed,
            "mar+eng"
        )

        # Hindi OCR
        hin_text, hin_confidence = calculate_confidence(
            processed,
            "hin+eng"
        )

        # Select the result with better confidence
        if mar_confidence >= hin_confidence:

            return (
                mar_text,
                "mar+eng",
                mar_confidence
            )

        return (
            hin_text,
            "hin+eng",
            hin_confidence
        )

    # -----------------------------------------------------
    # Default English
    # -----------------------------------------------------

    eng_text, eng_confidence = calculate_confidence(
        processed,
        "eng"
    )

    return (
        eng_text,
        "eng",
        eng_confidence
    )


# ---------------------------------------------------------
# OCR image
# ---------------------------------------------------------

def ocr_image(img: Image.Image):

    return detect_language_and_ocr(img)


# ---------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------

@app.get("/health")
def health():

    try:
        version = str(
            pytesseract.get_tesseract_version()
        )

    except Exception:
        version = None

    try:
        languages = pytesseract.get_languages(
            config=""
        )

    except Exception:
        languages = []

    return {
        "status": "ok",
        "tesseract": version,
        "languages": languages
    }


# ---------------------------------------------------------
# OCR endpoint
# ---------------------------------------------------------

@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):

    data = await file.read()

    name = (file.filename or "").lower()

    try:

        # =================================================
        # PDF
        # =================================================

        if (
            file.content_type == "application/pdf"
            or name.endswith(".pdf")
        ):

            # ---------------------------------------------
            # First try extracting embedded PDF text
            # ---------------------------------------------

            with pdfplumber.open(
                io.BytesIO(data)
            ) as pdf:

                text = "\n".join(
                    (
                        page.extract_text() or ""
                    )
                    for page in pdf.pages
                )

            method = "pdf-text"

            # ---------------------------------------------
            # If very little text was found, assume scanned
            # PDF and use OCR.
            # ---------------------------------------------

            if len(text.strip()) < 20:

                pages = convert_from_bytes(
                    data,
                    dpi=300,
                    poppler_path=POPPLER_PATH
                )

                page_results = []
                detected_languages = []
                confidences = []

                for page in pages:

                    (
                        page_text,
                        language,
                        confidence
                    ) = ocr_image(page)

                    page_results.append(page_text)

                    detected_languages.append(language)

                    confidences.append(confidence)

                text = "\n".join(page_results)

                method = "pdf-ocr"

                # Use the most common detected language
                if detected_languages:

                    language = max(
                        set(detected_languages),
                        key=detected_languages.count
                    )

                else:
                    language = "unknown"

                confidence = (
                    mean(confidences)
                    if confidences
                    else 0.0
                )

            else:

                language = "pdf-text"
                confidence = None

        # =================================================
        # Image
        # =================================================

        else:

            image = Image.open(
                io.BytesIO(data)
            )

            (
                text,
                language,
                confidence
            ) = ocr_image(image)

            method = "image-ocr"

        # =================================================
        # Response
        # =================================================

        return {
            "text": text,
            "method": method,
            "language": language,
            "confidence": confidence,
            "chars": len(text)
        }

    # =====================================================
    # Tesseract missing
    # =====================================================

    except pytesseract.TesseractNotFoundError as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Tesseract is not installed or not found "
                "(set TESSERACT_CMD)."
            )
        ) from exc

    # =====================================================
    # General error
    # =====================================================

    except Exception as exc:

        raise HTTPException(
            status_code=422,
            detail=f"Could not read file: {exc}"
        ) from exc