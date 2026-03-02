"""
config.py — Configuration centralisée du microservice IA.

Charge les variables d'environnement via pydantic-settings et
expose un singleton ``settings`` réutilisable dans tout le service.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables d'environnement du microservice IA."""

    # ── Général ───────────────────────────────
    APP_NAME: str = "GED AI-Service"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── Serveur ───────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Sécurité (clé API partagée avec le backend) ──
    API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── Stockage S3 / MinIO ───────────────────
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "ged-documents"
    S3_REGION: str = "us-east-1"

    # ── Modèles IA ────────────────────────────
    MODEL_CACHE_DIR: str = "./model_cache"
    CLASSIFIER_MODEL: str = "cmarkea/distilcamembert-base-nli"
    SUMMARIZER_MODEL: str = "moussaKam/barthez-orangesum-abstract"
    EMBEDDINGS_MODEL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    NER_SPACY_MODEL: str = "fr_core_news_md"
    OCR_LANGUAGE: str = "fra"

    # ── Limites ───────────────────────────────
    MAX_FILE_SIZE_MB: int = 50
    MAX_TEXT_LENGTH: int = 100_000
    SUMMARY_MAX_LENGTH: int = 300
    SUMMARY_MIN_LENGTH: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Retourne le singleton de configuration (mis en cache)."""
    return Settings()


settings = get_settings()
