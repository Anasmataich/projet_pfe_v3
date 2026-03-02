"""
classifier.py — Classification automatique de documents ministériels.

Utilise un modèle Transformers zero-shot (NLI) pour attribuer une catégorie
à un texte. En mode mock, retourne des prédictions simulées.
"""

import random

from loguru import logger

from schemas.document_schema import DocumentCategory
from schemas.ai_response_schema import ClassificationResult

# Mapping label → catégorie GED
_CATEGORY_LABELS: dict[str, DocumentCategory] = {
    "décision administrative": DocumentCategory.DECISION,
    "circulaire ministérielle": DocumentCategory.CIRCULAIRE,
    "rapport d'activité": DocumentCategory.RAPPORT,
    "budget et finance": DocumentCategory.BUDGET,
    "ressources humaines": DocumentCategory.RH,
    "correspondance officielle": DocumentCategory.CORRESPONDANCE,
    "projet pédagogique": DocumentCategory.PROJET_PEDAGOGIQUE,
    "inspection et évaluation": DocumentCategory.INSPECTION,
    "document archivé": DocumentCategory.ARCHIVE,
    "autre document": DocumentCategory.AUTRE,
}


class DocumentClassifier:
    """
    Classifie un texte parmi les catégories de documents ministériels.

    Attributes:
        _pipeline: Pipeline zero-shot Transformers (``None`` si mock).
        _is_mock: Indique si le modèle est en mode simulation.
    """

    def __init__(self) -> None:
        self._pipeline = None
        self._is_mock: bool = True

    def load(self, model_name: str | None = None) -> None:
        """
        Charge le pipeline de classification zero-shot.

        Args:
            model_name: Nom ou chemin du modèle HuggingFace.
                        Si ``None``, le modèle reste en mode mock.
        """
        if model_name is None:
            logger.info("[Classifier] Mode mock activé")
            self._is_mock = True
            return

        try:
            from transformers import pipeline as hf_pipeline
            self._pipeline = hf_pipeline(
                "zero-shot-classification",
                model=model_name,
                device=-1,
            )
            self._is_mock = False
            logger.info(f"[Classifier] Modèle chargé : {model_name}")
        except Exception as exc:
            logger.warning(f"[Classifier] Échec de chargement ({exc}), fallback mock")
            self._is_mock = True

    def classify(self, text: str) -> ClassificationResult:
        """
        Classifie un texte et retourne la catégorie prédite.

        Args:
            text: Texte nettoyé du document.

        Returns:
            ClassificationResult avec la catégorie, le score et les scores détaillés.
        """
        labels = list(_CATEGORY_LABELS.keys())

        if self._is_mock or self._pipeline is None:
            return self._mock_classify(labels)

        result = self._pipeline(text[:2048], candidate_labels=labels, multi_label=False)

        top_label: str = result["labels"][0]
        top_score: float = round(result["scores"][0], 4)
        all_scores = {
            _CATEGORY_LABELS[label].value: round(score, 4)
            for label, score in zip(result["labels"], result["scores"])
        }

        category = _CATEGORY_LABELS.get(top_label, DocumentCategory.AUTRE)
        return ClassificationResult(
            category=category.value,
            confidence=top_score,
            all_scores=all_scores,
        )

    @staticmethod
    def _mock_classify(labels: list[str]) -> ClassificationResult:
        """Génère un résultat de classification simulé."""
        scores = [random.uniform(0.05, 0.95) for _ in labels]
        total = sum(scores)
        scores = [s / total for s in scores]
        scores.sort(reverse=True)

        top_idx = 0
        top_label = labels[top_idx]
        category = _CATEGORY_LABELS.get(top_label, DocumentCategory.AUTRE)

        all_scores = {
            _CATEGORY_LABELS[label].value: round(score, 4)
            for label, score in zip(labels, scores)
        }

        return ClassificationResult(
            category=category.value,
            confidence=round(scores[top_idx], 4),
            all_scores=all_scores,
        )
