"""
ai_response_schema.py — Schémas Pydantic pour les réponses IA.

Définit une enveloppe standardisée ``AIResponse`` qui encapsule
toutes les réponses du microservice, garantissant un format
uniforme consommé par le backend Node.js.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Énumérations de réponse ────────────────────


class AnomalySeverity(str, Enum):
    """Sévérité d'une anomalie détectée (alignée sur le backend)."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ── Modèles de résultat spécialisés ───────────


class ClassificationResult(BaseModel):
    """Résultat de classification automatique d'un document."""

    category: str = Field(..., description="Catégorie prédite")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score de confiance [0,1]")
    all_scores: dict[str, float] = Field(
        default_factory=dict,
        description="Scores de confiance pour toutes les catégories",
    )


class Entity(BaseModel):
    """Entité nommée extraite d'un texte."""

    text: str = Field(..., description="Texte de l'entité")
    label: str = Field(..., description="Type d'entité (PER, ORG, LOC, DATE…)")
    start: int = Field(..., ge=0, description="Position de début dans le texte")
    end: int = Field(..., ge=0, description="Position de fin dans le texte")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class ExtractionResult(BaseModel):
    """Résultat de l'extraction d'entités nommées."""

    entities: list[Entity] = Field(default_factory=list)
    entity_count: int = Field(default=0)
    language: str = Field(default="fr")


class SummarizationResult(BaseModel):
    """Résultat du résumé automatique."""

    summary: str = Field(..., description="Texte du résumé généré")
    original_length: int = Field(..., description="Nombre de caractères du texte source")
    summary_length: int = Field(..., description="Nombre de caractères du résumé")
    compression_ratio: float = Field(..., description="Ratio de compression")


class OCRResult(BaseModel):
    """Résultat de l'OCR (reconnaissance de texte)."""

    text: str = Field(..., description="Texte extrait de l'image/PDF scanné")
    pages: int = Field(default=1, description="Nombre de pages traitées")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Confiance moyenne")
    language: str = Field(default="fr")


class SearchResult(BaseModel):
    """Résultat individuel de recherche sémantique."""

    document_id: str = Field(..., description="Identifiant du document")
    score: float = Field(..., ge=0.0, le=1.0, description="Score de similarité [0,1]")
    snippet: str = Field(default="", description="Extrait pertinent du document")


class SemanticSearchResult(BaseModel):
    """Résultat global de la recherche sémantique."""

    query: str = Field(..., description="Requête originale")
    results: list[SearchResult] = Field(default_factory=list)
    total: int = Field(default=0)


class AnomalyResult(BaseModel):
    """Résultat de la détection d'anomalies."""

    is_anomalous: bool = Field(default=False, description="Anomalie détectée ?")
    anomaly_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Score d'anomalie")
    severity: AnomalySeverity = Field(default=AnomalySeverity.LOW)
    reasons: list[str] = Field(default_factory=list, description="Raisons de l'anomalie")


class FullAnalysisResult(BaseModel):
    """
    Résultat d'une analyse complète (pipeline complet).

    Contient classification, extraction, résumé et détection d'anomalies.
    Retourné par ``POST /analyze`` et consommé par le backend.
    """

    classification: ClassificationResult | None = None
    extraction: ExtractionResult | None = None
    summarization: SummarizationResult | None = None
    anomaly: AnomalyResult | None = None
    ocr_text: str | None = Field(default=None, description="Texte OCR si applicable")


# ── Enveloppe de réponse standardisée ──────────


class AIResponse(BaseModel):
    """
    Enveloppe standardisée pour toutes les réponses du microservice IA.

    Garantit un format uniforme quel que soit l'endpoint appelé.
    """

    success: bool = Field(default=True, description="Succès de l'opération")
    message: str = Field(default="Opération réussie", description="Message descriptif")
    data: Any = Field(default=None, description="Données de résultat")
    processing_time_ms: float = Field(default=0.0, description="Temps de traitement en ms")
    model_version: str = Field(default="1.0.0", description="Version du modèle utilisé")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
