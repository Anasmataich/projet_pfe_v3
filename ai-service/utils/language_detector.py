"""
language_detector.py — Détection automatique de la langue d'un texte.

Utilise ``langdetect`` pour identifier la langue principale d'un document.
Fournit un fallback vers le français (``fr``) en cas d'incertitude.
"""

from loguru import logger


def detect_language(text: str, default: str = "fr") -> str:
    """
    Détecte la langue dominante d'un texte.

    Args:
        text: Texte à analyser (au moins ~20 caractères pour la fiabilité).
        default: Code ISO 639-1 retourné en cas d'échec.

    Returns:
        Code ISO 639-1 de la langue détectée (ex: ``"fr"``, ``"en"``, ``"ar"``).
    """
    if not text or len(text.strip()) < 20:
        return default

    try:
        from langdetect import detect
        lang = detect(text)
        logger.debug(f"[Lang] Langue détectée : {lang}")
        return lang
    except Exception as exc:
        logger.debug(f"[Lang] Détection échouée ({exc}), fallback → {default}")
        return default


def detect_language_probabilities(text: str) -> list[dict[str, float]]:
    """
    Retourne les probabilités pour chaque langue détectée.

    Args:
        text: Texte à analyser.

    Returns:
        Liste de ``{lang: str, prob: float}`` triée par probabilité décroissante.
    """
    if not text or len(text.strip()) < 20:
        return [{"lang": "fr", "prob": 1.0}]

    try:
        from langdetect import detect_langs
        results = detect_langs(text)
        return [{"lang": r.lang, "prob": round(r.prob, 4)} for r in results]
    except Exception:
        return [{"lang": "fr", "prob": 1.0}]


def is_french(text: str) -> bool:
    """Vérifie si le texte est en français."""
    return detect_language(text) == "fr"


def is_arabic(text: str) -> bool:
    """Vérifie si le texte est en arabe."""
    return detect_language(text) == "ar"
