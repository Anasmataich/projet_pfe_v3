"""
main.py — Point d'entrée du microservice IA (FastAPI).

Plateforme GED — DSI Ministère de l'Éducation Nationale du Maroc.
"""

import asyncio
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from core.config import settings
from core.security import verify_api_key
from api.routes import api_router
from schemas.document_schema import AnalyzeRequest
from schemas.ai_response_schema import AIResponse
from services.model_loader import load_all_models, is_loaded as models_ready
from services.ai_pipeline import analyze_document


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge les modèles IA au démarrage et les libère à l'arrêt."""
    logger.info("═" * 55)
    logger.info("  GED AI-Service — Microservice Intelligence Artificielle")
    logger.info("  DSI — Ministère de l'Éducation Nationale du Maroc")
    logger.info("═" * 55)

    use_mock = not settings.is_production
    load_all_models(use_mock=use_mock)

    logger.info(f"[Boot] Serveur prêt — http://{settings.HOST}:{settings.PORT}")
    yield
    logger.info("[Shutdown] Arrêt du microservice IA")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Microservice d'intelligence artificielle pour la Plateforme GED.\n\n"
        "Fournit : classification, extraction NER, résumé automatique, "
        "OCR, recherche sémantique et détection d'anomalies."
    ),
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["X-API-Key", "Content-Type", "Accept"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Injecte un request-id unique et mesure le temps de traitement."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start = time.time()
    response = await call_next(request)
    elapsed = (time.time() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        f"[{request_id[:8]}] {request.method} {request.url.path} → {response.status_code} ({elapsed:.0f}ms)"
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Capture les exceptions non gérées — ne divulgue jamais les détails internes."""
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{req_id}] Erreur non gérée sur {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=AIResponse(
            success=False,
            message="Erreur interne du service IA. Contactez l'administrateur.",
        ).model_dump(mode="json"),
    )


app.include_router(api_router)


@app.post(
    "/analyze",
    response_model=AIResponse,
    summary="Analyse complète d'un document",
    description="Pipeline complet : extraction → classification → NER → résumé → anomalies.",
    tags=["Pipeline"],
)
async def analyze(
    request: AnalyzeRequest,
    _api_key: str = Depends(verify_api_key),
) -> AIResponse:
    """
    Endpoint principal consommé par le backend Node.js.

    Exécute le pipeline dans un thread pool pour ne pas bloquer l'event loop.
    """
    return await asyncio.to_thread(
        analyze_document, request.documentId, request.storageKey
    )


@app.get("/health", summary="Health Check", tags=["Système"])
async def health_check() -> dict:
    """Vérifie que le service et les modèles sont opérationnels."""
    return {
        "status": "ok" if models_ready() else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENV,
        "models_loaded": models_ready(),
    }
