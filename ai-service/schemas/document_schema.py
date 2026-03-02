"""
document_schema.py — Schémas Pydantic pour les entrées liées aux documents.

Ces schémas valident les données reçues par les endpoints IA.
Ils reflètent les catégories et niveaux de confidentialité définis
côté backend dans ``shared/enums.ts``.
"""

from enum import Enum

from pydantic import BaseModel, Field


# ── Énumérations (alignées sur le backend) ────


class DocumentCategory(str, Enum):
    """Catégories de documents ministériels."""

    DECISION = "DECISION"
    CIRCULAIRE = "CIRCULAIRE"
    RAPPORT = "RAPPORT"
    BUDGET = "BUDGET"
    RH = "RH"
    CORRESPONDANCE = "CORRESPONDANCE"
    PROJET_PEDAGOGIQUE = "PROJET_PEDAGOGIQUE"
    INSPECTION = "INSPECTION"
    ARCHIVE = "ARCHIVE"
    AUTRE = "AUTRE"


class ConfidentialityLevel(str, Enum):
    """Niveaux de confidentialité."""

    PUBLIC = "PUBLIC"
    INTERNE = "INTERNE"
    CONFIDENTIEL = "CONFIDENTIEL"
    SECRET = "SECRET"


# ── Schémas d'entrée ──────────────────────────


class AnalyzeRequest(BaseModel):
    """
    Requête d'analyse complète d'un document.

    Correspond au payload envoyé par le backend Node.js
    via ``POST /analyze``.
    """

    documentId: str = Field(..., description="UUID du document dans la base GED")
    storageKey: str = Field(..., description="Clé de stockage S3/MinIO du fichier")


class ClassifyRequest(BaseModel):
    """Requête de classification de texte."""

    text: str = Field(..., min_length=1, max_length=100_000, description="Texte brut à classifier")
    language: str = Field(default="fr", description="Code ISO 639-1 de la langue")


class ExtractionRequest(BaseModel):
    """Requête d'extraction d'entités nommées."""

    text: str = Field(..., min_length=1, max_length=100_000, description="Texte à analyser")
    language: str = Field(default="fr", description="Code ISO 639-1 de la langue")


class SummarizationRequest(BaseModel):
    """Requête de résumé automatique."""

    text: str = Field(..., min_length=50, max_length=100_000, description="Texte à résumer")
    max_length: int = Field(default=300, ge=50, le=1000, description="Longueur maximale du résumé")
    min_length: int = Field(default=50, ge=20, le=500, description="Longueur minimale du résumé")
    language: str = Field(default="fr", description="Code ISO 639-1 de la langue")


class SemanticSearchRequest(BaseModel):
    """Requête de recherche sémantique."""

    query: str = Field(..., min_length=1, max_length=1000, description="Requête de recherche")
    documents: list[dict] = Field(
        ...,
        description="Liste de documents {id, text} dans lesquels chercher",
    )
    top_k: int = Field(default=5, ge=1, le=50, description="Nombre de résultats à retourner")


class AnomalyDetectionRequest(BaseModel):
    """Requête de détection d'anomalies."""

    text: str = Field(..., min_length=1, max_length=100_000, description="Texte à analyser")
    metadata: dict = Field(default_factory=dict, description="Métadonnées du document")
