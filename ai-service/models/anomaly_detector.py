"""
anomaly_detector.py — Détection d'anomalies dans les documents.

Analyse le contenu et les métadonnées pour détecter des incohérences :
longueur anormale, contenu suspect, métadonnées manquantes, etc.
"""

import re

from loguru import logger

from schemas.ai_response_schema import AnomalyResult, AnomalySeverity

MIN_DOCUMENT_LENGTH = 50
MAX_DOCUMENT_LENGTH = 500_000
SPECIAL_CHAR_THRESHOLD = 0.3
UNIQUE_WORD_THRESHOLD = 0.2
MIN_WORDS_FOR_REPETITION_CHECK = 20


class AnomalyDetector:
    """Détecteur d'anomalies basé sur des règles heuristiques et scoring ML."""

    def __init__(self) -> None:
        self._is_mock: bool = True

    def load(self, mock: bool = True) -> None:
        self._is_mock = mock
        mode = "heuristiques" if mock else "ML"
        logger.info(f"[AnomalyDetector] Mode {mode} activé")

    def detect(self, text: str, metadata: dict | None = None) -> AnomalyResult:
        """
        Analyse un document pour détecter des anomalies.

        Args:
            text: Texte du document.
            metadata: Métadonnées optionnelles (file_size, mime_type, etc.).

        Returns:
            AnomalyResult avec le score, la sévérité et les raisons.
        """
        metadata = metadata or {}
        reasons: list[str] = []
        score: float = 0.0

        if len(text.strip()) < MIN_DOCUMENT_LENGTH:
            reasons.append(f"Document extrêmement court (< {MIN_DOCUMENT_LENGTH} caractères)")
            score += 0.4

        elif len(text) > MAX_DOCUMENT_LENGTH:
            reasons.append(f"Document anormalement long (> {MAX_DOCUMENT_LENGTH // 1000}k caractères)")
            score += 0.2

        text_len = len(text)
        if text_len > 0:
            special_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / text_len
            if special_ratio > SPECIAL_CHAR_THRESHOLD:
                reasons.append(f"Forte proportion de caractères spéciaux ({special_ratio:.0%})")
                score += 0.3

        words = text.lower().split()
        word_count = len(words)
        if word_count > MIN_WORDS_FOR_REPETITION_CHECK:
            unique_ratio = len(set(words)) / word_count
            if unique_ratio < UNIQUE_WORD_THRESHOLD:
                reasons.append(f"Texte très répétitif (ratio d'unicité : {unique_ratio:.0%})")
                score += 0.3

        sensitive_patterns = [
            r"\b(confidentiel|secret|classifié)\b",
            r"\b(mot\s+de\s+passe|password|mdp)\b",
            r"\b(numéro\s+de\s+carte|carte\s+bancaire)\b",
        ]
        for pattern in sensitive_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                reasons.append("Contenu potentiellement sensible détecté")
                score += 0.15

        if metadata.get("file_size", 0) == 0:
            reasons.append("Taille de fichier nulle dans les métadonnées")
            score += 0.2

        mime = metadata.get("mime_type", "")
        if isinstance(mime, str) and "executable" in mime:
            reasons.append("Type MIME suspect (exécutable)")
            score += 0.5

        score = min(score, 1.0)
        severity = self._score_to_severity(score)
        is_anomalous = score > 0.3

        if is_anomalous:
            logger.warning(f"[AnomalyDetector] Anomalie (score={score:.2f}, {severity.value})")

        return AnomalyResult(
            is_anomalous=is_anomalous,
            anomaly_score=round(score, 4),
            severity=severity,
            reasons=reasons,
        )

    @staticmethod
    def _score_to_severity(score: float) -> AnomalySeverity:
        if score >= 0.8:
            return AnomalySeverity.CRITICAL
        if score >= 0.6:
            return AnomalySeverity.HIGH
        if score >= 0.3:
            return AnomalySeverity.MEDIUM
        return AnomalySeverity.LOW
