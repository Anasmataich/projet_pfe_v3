"""
routes.py — Agrégation de toutes les routes de l'API.

Monte chaque endpoint sur le routeur principal avec le préfixe
et les tags OpenAPI appropriés.
"""

from fastapi import APIRouter

from api.endpoints import (
    classification,
    extraction,
    summarization,
    ocr,
    search,
    anomaly,
)

api_router = APIRouter()

api_router.include_router(
    classification.router,
    prefix="/ai",
    tags=["Classification"],
)
api_router.include_router(
    extraction.router,
    prefix="/ai",
    tags=["Extraction NER"],
)
api_router.include_router(
    summarization.router,
    prefix="/ai",
    tags=["Résumé automatique"],
)
api_router.include_router(
    ocr.router,
    prefix="/ai",
    tags=["OCR"],
)
api_router.include_router(
    search.router,
    prefix="/ai",
    tags=["Recherche sémantique"],
)
api_router.include_router(
    anomaly.router,
    prefix="/ai",
    tags=["Détection d'anomalies"],
)
