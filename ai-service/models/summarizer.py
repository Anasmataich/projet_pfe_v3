"""
summarizer.py — Résumé automatique de documents via Transformers.

Utilise un modèle seq2seq (BART/mBART) pour générer des résumés
concis de textes longs. Fallback extractif en mode mock.
"""

from loguru import logger

from schemas.ai_response_schema import SummarizationResult
from utils.text_preprocessor import split_into_sentences


class DocumentSummarizer:
    """
    Génère un résumé automatique d'un texte.

    Attributes:
        _pipeline: Pipeline Transformers summarization (``None`` si mock).
        _is_mock: Mode simulation actif.
    """

    def __init__(self) -> None:
        self._pipeline = None
        self._is_mock: bool = True

    def load(self, model_name: str | None = None) -> None:
        """
        Charge le modèle de résumé automatique.

        Args:
            model_name: Nom HuggingFace du modèle (ex: ``moussaKam/barthez``).
                        Si ``None``, reste en mode mock extractif.
        """
        if model_name is None:
            logger.info("[Summarizer] Mode mock (extractif) activé")
            self._is_mock = True
            return

        try:
            from transformers import pipeline as hf_pipeline
            self._pipeline = hf_pipeline(
                "summarization",
                model=model_name,
                device=-1,
            )
            self._is_mock = False
            logger.info(f"[Summarizer] Modèle chargé : {model_name}")
        except Exception as exc:
            logger.warning(f"[Summarizer] Échec de chargement ({exc}), fallback mock")
            self._is_mock = True

    def summarize(
        self,
        text: str,
        max_length: int = 300,
        min_length: int = 50,
    ) -> SummarizationResult:
        """
        Génère un résumé du texte.

        Args:
            text: Texte source nettoyé.
            max_length: Nombre maximal de tokens dans le résumé.
            min_length: Nombre minimal de tokens dans le résumé.

        Returns:
            SummarizationResult avec le résumé et les statistiques.
        """
        original_length = len(text)

        if self._is_mock or self._pipeline is None:
            summary = self._extractive_summary(text, max_length)
        else:
            input_text = text[:4096]
            result = self._pipeline(
                input_text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
            )
            summary = result[0]["summary_text"]

        summary_length = len(summary)
        compression = round(summary_length / original_length, 4) if original_length > 0 else 0.0

        return SummarizationResult(
            summary=summary,
            original_length=original_length,
            summary_length=summary_length,
            compression_ratio=compression,
        )

    @staticmethod
    def _extractive_summary(text: str, max_length: int) -> str:
        """
        Résumé extractif simple : sélectionne les N premières phrases
        jusqu'à atteindre la longueur cible.
        """
        sentences = split_into_sentences(text)
        if not sentences:
            return text[:max_length]

        summary_parts: list[str] = []
        current_length = 0
        for sentence in sentences:
            if current_length + len(sentence) > max_length * 4:
                break
            summary_parts.append(sentence)
            current_length += len(sentence)

        return " ".join(summary_parts) if summary_parts else sentences[0]
