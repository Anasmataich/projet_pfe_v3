"""
extraction.py — Endpoint d'extraction d'entités nommées (NER).

Identifie les personnes, organisations, dates, montants et
références dans un texte de document ministériel.
"""

import asyncio
import time

from fastapi import APIRouter, Depends

from core.security import verify_api_key
from schemas.document_schema import ExtractionRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_ner_extractor
from utils.text_preprocessor import clean_text

router = APIRouter()


@router.post(
    "/extract",
    response_model=AIResponse,
    summary="Extraire les entités nommées",
    description="Extrait les entités (personnes, lieux, dates…) d'un texte.",
)
async def extract_entities(
    request: ExtractionRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    start = time.time()

    def _work():
        cleaned = clean_text(request.text)
        return get_ner_extractor().extract(cleaned, request.language)

    result = await asyncio.to_thread(_work)
    elapsed = (time.time() - start) * 1000

    return AIResponse(
        success=True,
        message=f"{result.entity_count} entité(s) extraite(s)",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
