"""
search.py — Endpoint de recherche sémantique.

Recherche les documents les plus pertinents pour une requête
en langage naturel via des embeddings vectoriels.
"""

import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import verify_api_key
from schemas.document_schema import SemanticSearchRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_search_engine

router = APIRouter()

MAX_SEARCH_DOCUMENTS = 500


@router.post(
    "/search",
    response_model=AIResponse,
    summary="Recherche sémantique",
    description="Recherche les documents les plus pertinents par similarité sémantique.",
)
async def semantic_search(
    request: SemanticSearchRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    if len(request.documents) > MAX_SEARCH_DOCUMENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nombre maximum de documents : {MAX_SEARCH_DOCUMENTS}.",
        )

    start = time.time()

    def _work():
        return get_search_engine().search(
            query=request.query,
            documents=request.documents,
            top_k=request.top_k,
        )

    result = await asyncio.to_thread(_work)
    elapsed = (time.time() - start) * 1000

    return AIResponse(
        success=True,
        message=f"{result.total} résultat(s) trouvé(s)",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
