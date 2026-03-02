"""
model_loader.py — Chargement centralisé et thread-safe de tous les modèles IA.

Principe SOLID — Single Responsibility : ce module ne fait que
charger/initialiser les modèles. L'orchestration est dans ``ai_pipeline.py``.
"""

import threading

from loguru import logger

from core.config import settings
from models.classifier import DocumentClassifier
from models.ner_extractor import NERExtractor
from models.summarizer import DocumentSummarizer
from models.semantic_search import SemanticSearchEngine
from models.ocr_engine import OCREngine
from models.anomaly_detector import AnomalyDetector

_lock = threading.Lock()
_loaded = False

classifier = DocumentClassifier()
ner_extractor = NERExtractor()
summarizer = DocumentSummarizer()
search_engine = SemanticSearchEngine()
ocr_engine = OCREngine()
anomaly_detector = AnomalyDetector()


def load_all_models(use_mock: bool = True) -> None:
    """
    Charge tous les modèles IA (thread-safe, idempotent).

    Args:
        use_mock: ``True`` pour la simulation, ``False`` pour les vrais modèles.
    """
    global _loaded
    with _lock:
        if _loaded:
            logger.debug("[ModelLoader] Modèles déjà chargés, skip")
            return

        logger.info(f"[ModelLoader] Chargement des modèles (mock={use_mock})")

        if use_mock:
            classifier.load(model_name=None)
            ner_extractor.load(model_name=None)
            summarizer.load(model_name=None)
            search_engine.load(model_name=None)
            ocr_engine.load(language=settings.OCR_LANGUAGE, mock=True)
            anomaly_detector.load(mock=True)
        else:
            classifier.load(model_name=settings.CLASSIFIER_MODEL)
            ner_extractor.load(model_name=settings.NER_SPACY_MODEL)
            summarizer.load(model_name=settings.SUMMARIZER_MODEL)
            search_engine.load(model_name=settings.EMBEDDINGS_MODEL)
            ocr_engine.load(language=settings.OCR_LANGUAGE, mock=False)
            anomaly_detector.load(mock=False)

        _loaded = True
        logger.info("[ModelLoader] Tous les modèles sont prêts")


def is_loaded() -> bool:
    """Indique si les modèles sont chargés (utilisé par le health check)."""
    return _loaded


def get_classifier() -> DocumentClassifier:
    return classifier

def get_ner_extractor() -> NERExtractor:
    return ner_extractor

def get_summarizer() -> DocumentSummarizer:
    return summarizer

def get_search_engine() -> SemanticSearchEngine:
    return search_engine

def get_ocr_engine() -> OCREngine:
    return ocr_engine

def get_anomaly_detector() -> AnomalyDetector:
    return anomaly_detector
