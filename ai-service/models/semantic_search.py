"""
semantic_search.py — Recherche sémantique par embeddings vectoriels.

Encode les requêtes et les documents via sentence-transformers,
puis calcule la similarité cosinus pour le classement.
"""

import numpy as np
from loguru import logger

from schemas.ai_response_schema import SearchResult, SemanticSearchResult


class SemanticSearchEngine:
    """
    Moteur de recherche sémantique basé sur les embeddings.

    Attributes:
        _model: Modèle sentence-transformers (``None`` si mock).
        _is_mock: Mode simulation actif.
    """

    def __init__(self) -> None:
        self._model = None
        self._is_mock: bool = True

    def load(self, model_name: str | None = None) -> None:
        """
        Charge le modèle d'embeddings.

        Args:
            model_name: Nom HuggingFace du modèle sentence-transformers.
                        Si ``None``, reste en mode mock.
        """
        if model_name is None:
            logger.info("[SemanticSearch] Mode mock activé")
            self._is_mock = True
            return

        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(model_name)
            self._is_mock = False
            logger.info(f"[SemanticSearch] Modèle chargé : {model_name}")
        except Exception as exc:
            logger.warning(f"[SemanticSearch] Échec de chargement ({exc}), fallback mock")
            self._is_mock = True

    def search(
        self,
        query: str,
        documents: list[dict],
        top_k: int = 5,
    ) -> SemanticSearchResult:
        """
        Recherche les documents les plus pertinents pour une requête.

        Args:
            query: Requête de recherche en langage naturel.
            documents: Liste de ``{"id": str, "text": str}``.
            top_k: Nombre de résultats à retourner.

        Returns:
            SemanticSearchResult trié par pertinence décroissante.
        """
        if not documents:
            return SemanticSearchResult(query=query, results=[], total=0)

        if self._is_mock or self._model is None:
            return self._mock_search(query, documents, top_k)

        texts = [doc.get("text", "") for doc in documents]
        query_embedding = self._model.encode([query], normalize_embeddings=True)
        doc_embeddings = self._model.encode(texts, normalize_embeddings=True)

        similarities = np.dot(doc_embeddings, query_embedding.T).flatten()

        ranked_indices = np.argsort(similarities)[::-1][:top_k]

        results = [
            SearchResult(
                document_id=documents[idx]["id"],
                score=round(float(similarities[idx]), 4),
                snippet=texts[idx][:200],
            )
            for idx in ranked_indices
            if similarities[idx] > 0.0
        ]

        return SemanticSearchResult(query=query, results=results, total=len(results))

    @staticmethod
    def _mock_search(
        query: str,
        documents: list[dict],
        top_k: int,
    ) -> SemanticSearchResult:
        """Recherche simulée basée sur le chevauchement lexical (Jaccard)."""
        query_words = set(query.lower().split())

        scored: list[tuple[int, float]] = []
        for idx, doc in enumerate(documents):
            doc_text = doc.get("text", "")
            doc_words = set(doc_text.lower().split())
            if not doc_words:
                scored.append((idx, 0.0))
                continue
            intersection = query_words & doc_words
            union = query_words | doc_words
            jaccard = len(intersection) / len(union) if union else 0.0
            scored.append((idx, jaccard))

        scored.sort(key=lambda x: x[1], reverse=True)
        top_results = scored[:top_k]

        results = [
            SearchResult(
                document_id=documents[idx]["id"],
                score=round(score, 4),
                snippet=documents[idx].get("text", "")[:200],
            )
            for idx, score in top_results
            if score > 0.0
        ]

        return SemanticSearchResult(query=query, results=results, total=len(results))
