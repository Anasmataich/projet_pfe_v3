"""
anomaly.py — Endpoint de détection d'anomalies dans les documents.

Analyse le contenu et les métadonnées pour identifier des
incohérences, du contenu suspect ou des problèmes de qualité.
"""

import asyncio
import time

from fastapi import APIRouter, Depends

from core.security import verify_api_key
from schemas.document_schema import AnomalyDetectionRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import get_anomaly_detector
from utils.text_preprocessor import clean_text

router = APIRouter()


@router.post(
    "/anomaly",
    response_model=AIResponse,
    summary="Détecter les anomalies",
    description="Analyse un document pour détecter des anomalies de contenu ou de structure.",
)
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    start = time.time()

    def _work():
        cleaned = clean_text(request.text)
        return get_anomaly_detector().detect(cleaned, request.metadata)

    result = await asyncio.to_thread(_work)
    elapsed = (time.time() - start) * 1000

    status_msg = "Anomalie détectée" if result.is_anomalous else "Aucune anomalie"

    return AIResponse(
        success=True,
        message=f"{status_msg} (score={result.anomaly_score:.2f})",
        data=result,
        processing_time_ms=round(elapsed, 2),
    )
