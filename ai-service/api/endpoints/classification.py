"""
classification.py — Endpoint de classification automatique de documents.

Attribue une catégorie ministérielle à un texte via le classifieur
zero-shot (Transformers NLI).
"""

import asyncio
import time

from fastapi import APIRouter, Depends

from core.security import verify_api_key
from schemas.document_schema import ClassifyRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_classifier
from utils.text_preprocessor import clean_text

router = APIRouter()


@router.post(
    "/classify",
    response_model=AIResponse,
    summary="Classifier un texte",
    description="Attribue une catégorie ministérielle à un texte donné.",
)
async def classify_text(
    request: ClassifyRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    start = time.time()

    def _work():
        cleaned = clean_text(request.text)
        return get_classifier().classify(cleaned)

    result = await asyncio.to_thread(_work)
    elapsed = (time.time() - start) * 1000

    return AIResponse(
        success=True,
        message=f"Classification effectuée : {result.category}",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
