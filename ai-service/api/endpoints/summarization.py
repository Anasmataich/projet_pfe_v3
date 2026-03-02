"""
summarization.py — Endpoint de résumé automatique de documents.

Génère un résumé concis d'un texte long via un modèle
seq2seq (Transformers) ou un fallback extractif.
"""

import asyncio
import time

from fastapi import APIRouter, Depends

from core.security import verify_api_key
from schemas.document_schema import SummarizationRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_summarizer
from utils.text_preprocessor import clean_text

router = APIRouter()


@router.post(
    "/summarize",
    response_model=AIResponse,
    summary="Résumer un texte",
    description="Génère un résumé automatique d'un texte long.",
)
async def summarize_text(
    request: SummarizationRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    start = time.time()

    def _work():
        cleaned = clean_text(request.text)
        return get_summarizer().summarize(
            cleaned,
            max_length=request.max_length,
            min_length=request.min_length,
        )

    result = await asyncio.to_thread(_work)
    elapsed = (time.time() - start) * 1000

    return AIResponse(
        success=True,
        message=f"Résumé généré ({result.compression_ratio:.0%} de compression)",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
