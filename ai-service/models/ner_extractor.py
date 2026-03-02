"""
ner_extractor.py — Extraction d'entités nommées (NER) via spaCy.

Identifie les personnes, organisations, lieux, dates et montants
mentionnés dans les documents ministériels.
"""

import re

from loguru import logger

from schemas.ai_response_schema import Entity, ExtractionResult


class NERExtractor:
    """
    Extracteur d'entités nommées basé sur spaCy.

    Attributes:
        _nlp: Pipeline spaCy chargé (``None`` si mock).
        _is_mock: Mode simulation actif.
    """

    def __init__(self) -> None:
        self._nlp = None
        self._is_mock: bool = True

    def load(self, model_name: str | None = None) -> None:
        """
        Charge le modèle spaCy pour le NER.

        Args:
            model_name: Nom du modèle spaCy (ex: ``fr_core_news_md``).
                        Si ``None``, reste en mode mock.
        """
        if model_name is None:
            logger.info("[NER] Mode mock activé")
            self._is_mock = True
            return

        try:
            import spacy
            self._nlp = spacy.load(model_name)
            self._is_mock = False
            logger.info(f"[NER] Modèle spaCy chargé : {model_name}")
        except Exception as exc:
            logger.warning(f"[NER] Échec de chargement ({exc}), fallback mock")
            self._is_mock = True

    def extract(self, text: str, language: str = "fr") -> ExtractionResult:
        """
        Extrait les entités nommées d'un texte.

        Args:
            text: Texte source nettoyé.
            language: Code langue du texte.

        Returns:
            ExtractionResult contenant la liste des entités trouvées.
        """
        if self._is_mock or self._nlp is None:
            return self._mock_extract(text, language)

        doc = self._nlp(text[:50_000])
        entities = [
            Entity(
                text=ent.text,
                label=ent.label_,
                start=ent.start_char,
                end=ent.end_char,
                confidence=0.85,
            )
            for ent in doc.ents
        ]

        return ExtractionResult(
            entities=entities,
            entity_count=len(entities),
            language=language,
        )

    @staticmethod
    def _mock_extract(text: str, language: str) -> ExtractionResult:
        """Extraction simulée par expressions régulières basiques."""
        entities: list[Entity] = []

        # Dates (jj/mm/aaaa ou jj-mm-aaaa)
        for match in re.finditer(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text):
            entities.append(Entity(
                text=match.group(), label="DATE",
                start=match.start(), end=match.end(), confidence=0.9,
            ))

        # Montants (chiffres + DH/MAD/€/USD)
        for match in re.finditer(
            r"\b([\d\s.,]+)\s*(DH|MAD|dirhams?|€|EUR|USD|\$)\b", text, re.IGNORECASE
        ):
            entities.append(Entity(
                text=match.group().strip(), label="MONEY",
                start=match.start(), end=match.end(), confidence=0.85,
            ))

        # Emails
        for match in re.finditer(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", text):
            entities.append(Entity(
                text=match.group(), label="EMAIL",
                start=match.start(), end=match.end(), confidence=0.95,
            ))

        # N° de référence (N° xxx ou Réf. xxx)
        for match in re.finditer(r"(?:N°|Réf\.?|Référence)\s*:?\s*([\w/-]+)", text, re.IGNORECASE):
            entities.append(Entity(
                text=match.group(), label="REFERENCE",
                start=match.start(), end=match.end(), confidence=0.8,
            ))

        return ExtractionResult(
            entities=entities,
            entity_count=len(entities),
            language=language,
        )
