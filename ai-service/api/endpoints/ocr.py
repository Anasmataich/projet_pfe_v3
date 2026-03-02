"""
ocr.py — Endpoint OCR pour la numérisation de documents scannés.

Accepte un fichier (image ou PDF scanné) et retourne le texte
extrait par reconnaissance optique de caractères.
"""

import asyncio
import time

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status

from core.security import verify_api_key
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_ocr_engine

router = APIRouter()

_ALLOWED_IMAGE_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/tiff", "image/bmp",
}
_ALLOWED_PDF_TYPE = "application/pdf"
_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
_STREAM_CHUNK_SIZE = 64 * 1024     # 64 KB


@router.post(
    "/ocr",
    response_model=AIResponse,
    summary="Extraire du texte par OCR",
    description="Applique l'OCR sur un fichier image ou un PDF scanné.",
)
async def perform_ocr(
    file: UploadFile = File(..., description="Fichier image ou PDF scanné"),
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    """
    Extrait le texte d'un fichier image ou PDF scanné via OCR.

    Validates size BEFORE reading the entire payload into memory.
    Runs the blocking OCR engine in a thread pool.
    """
    content_type = (file.content_type or "").lower()
    if not content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="En-tête Content-Type manquant.",
        )

    if content_type not in _ALLOWED_IMAGE_TYPES and content_type != _ALLOWED_PDF_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté : {content_type}. "
                   f"Acceptés : images (PNG, JPEG, TIFF) ou PDF.",
        )

    start = time.time()

    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(_STREAM_CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fichier trop volumineux (> {_MAX_FILE_SIZE // (1024 * 1024)} MB).",
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    engine = get_ocr_engine()

    if content_type == _ALLOWED_PDF_TYPE:
        result = await asyncio.to_thread(engine.process_pdf, file_bytes)
    else:
        result = await asyncio.to_thread(engine.process_image, file_bytes)

    elapsed = (time.time() - start) * 1000

    return AIResponse(
        success=True,
        message=f"OCR terminé — {result.pages} page(s), confiance {result.confidence:.0%}",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
