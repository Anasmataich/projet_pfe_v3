"""
ai_pipeline.py — Orchestration du pipeline d'analyse IA complet.

Toutes les fonctions sont synchrones ; l'async est géré au niveau
de l'endpoint via ``asyncio.to_thread()``.
"""

import re
import time

from loguru import logger

from core.dependencies import download_file_from_s3
from schemas.ai_response_schema import AIResponse, FullAnalysisResult
from services.model_loader import (
    get_classifier,
    get_ner_extractor,
    get_summarizer,
    get_anomaly_detector,
    get_ocr_engine,
)
from utils.text_preprocessor import clean_text
from utils.pdf_reader import extract_text_from_pdf, is_scanned_pdf
from utils.language_detector import detect_language

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)
_STORAGE_KEY_RE = re.compile(r"^[\w./-]{1,1000}$")


def analyze_document(document_id: str, storage_key: str) -> AIResponse:
    """
    Pipeline d'analyse complète d'un document.

    Args:
        document_id: UUID du document (validé).
        storage_key: Clé S3 (validée contre la traversal).

    Returns:
        AIResponse enveloppant un FullAnalysisResult.
    """
    start = time.time()

    if not _UUID_RE.match(document_id):
        return AIResponse(success=False, message="documentId invalide (UUID attendu)")

    if not _STORAGE_KEY_RE.match(storage_key) or ".." in storage_key:
        return AIResponse(success=False, message="storageKey invalide ou suspect")

    logger.info(f"[Pipeline] Début — document={document_id}")

    try:
        file_bytes = download_file_from_s3(storage_key)
        logger.info(f"[Pipeline] Fichier téléchargé ({len(file_bytes)} octets)")

        text, ocr_text = _extract_text(file_bytes, storage_key)

        if not text.strip():
            elapsed = (time.time() - start) * 1000
            logger.warning(f"[Pipeline] Aucun texte extractible pour {document_id}")
            return AIResponse(
                success=True,
                message="Aucun texte extractible du document",
                data=FullAnalysisResult(ocr_text=ocr_text),
                processing_time_ms=round(elapsed, 2),
            )

        language = detect_language(text)
        cleaned = clean_text(text)

        classification = get_classifier().classify(cleaned)
        extraction = get_ner_extractor().extract(cleaned, language)

        summarization = None
        if len(cleaned) >= 100:
            summarization = get_summarizer().summarize(cleaned)

        metadata = {
            "file_size": len(file_bytes),
            "mime_type": _guess_mime(storage_key),
            "document_id": document_id,
        }
        anomaly = get_anomaly_detector().detect(cleaned, metadata)

        result = FullAnalysisResult(
            classification=classification,
            extraction=extraction,
            summarization=summarization,
            anomaly=anomaly,
            ocr_text=ocr_text if ocr_text else None,
        )

        elapsed = (time.time() - start) * 1000
        logger.info(f"[Pipeline] Terminé en {elapsed:.0f}ms — document={document_id}")

        return AIResponse(
            success=True,
            message="Analyse complète effectuée",
            data=result,
            processing_time_ms=round(elapsed, 2),
        )

    except Exception as exc:
        elapsed = (time.time() - start) * 1000
        logger.error(f"[Pipeline] Erreur — document={document_id} : {exc}")
        return AIResponse(
            success=False,
            message="Erreur lors de l'analyse du document",
            data=None,
            processing_time_ms=round(elapsed, 2),
        )


def _extract_text(file_bytes: bytes, storage_key: str) -> tuple[str, str | None]:
    """Extrait le texte d'un fichier (PDF, image ou texte brut)."""
    key_lower = storage_key.lower()
    ocr_text: str | None = None

    if key_lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
        if not text.strip() or is_scanned_pdf(file_bytes):
            logger.info("[Pipeline] PDF scanné détecté, lancement OCR")
            ocr_result = get_ocr_engine().process_pdf(file_bytes)
            ocr_text = ocr_result.text
            text = ocr_text if ocr_text else text
        return text, ocr_text

    if any(key_lower.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
        ocr_result = get_ocr_engine().process_image(file_bytes)
        return ocr_result.text, ocr_result.text

    for encoding in ("utf-8", "latin-1"):
        try:
            return file_bytes.decode(encoding), None
        except (UnicodeDecodeError, ValueError):
            continue
    return "", None


def _guess_mime(key: str) -> str:
    """Devine le type MIME à partir de l'extension."""
    ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    return {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "tiff": "image/tiff",
        "txt": "text/plain",
        "csv": "text/csv",
    }.get(ext, "application/octet-stream")
