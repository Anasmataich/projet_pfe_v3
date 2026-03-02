"""
text_preprocessor.py — Pré-traitement et nettoyage de texte.

Fournit des fonctions de normalisation utilisées en amont de
tous les pipelines NLP (classification, extraction, résumé…).
"""

import re
import unicodedata


def normalize_whitespace(text: str) -> str:
    """Remplace les séquences d'espaces/tabulations/sauts de ligne multiples par un seul espace."""
    return re.sub(r"\s+", " ", text).strip()


def remove_control_characters(text: str) -> str:
    """Supprime les caractères de contrôle Unicode (hors retours chariot et nouvelles lignes)."""
    return "".join(
        ch for ch in text
        if unicodedata.category(ch)[0] != "C" or ch in ("\n", "\r", "\t")
    )


def normalize_unicode(text: str) -> str:
    """Normalise en NFC (composition canonique) pour homogénéiser les accents."""
    return unicodedata.normalize("NFC", text)


def remove_urls(text: str) -> str:
    """Supprime les URLs HTTP(S)."""
    return re.sub(r"https?://\S+", "", text)


def remove_emails(text: str) -> str:
    """Supprime les adresses email."""
    return re.sub(r"\S+@\S+\.\S+", "", text)


def truncate(text: str, max_length: int = 100_000) -> str:
    """Tronque le texte à ``max_length`` caractères en coupant au dernier espace."""
    if len(text) <= max_length:
        return text
    truncated = text[:max_length]
    last_space = truncated.rfind(" ")
    return truncated[:last_space] if last_space > 0 else truncated


def clean_text(text: str, max_length: int = 100_000) -> str:
    """
    Pipeline complet de nettoyage de texte.

    Applique séquentiellement : suppression des caractères de contrôle,
    normalisation Unicode, suppression des URLs/emails, normalisation
    des espaces et troncature.

    Args:
        text: Texte brut à nettoyer.
        max_length: Longueur maximale autorisée.

    Returns:
        Texte nettoyé prêt pour l'analyse NLP.
    """
    text = remove_control_characters(text)
    text = normalize_unicode(text)
    text = remove_urls(text)
    text = remove_emails(text)
    text = normalize_whitespace(text)
    text = truncate(text, max_length)
    return text


def split_into_sentences(text: str) -> list[str]:
    """
    Découpe un texte en phrases (heuristique basée sur la ponctuation française).

    Args:
        text: Texte à découper.

    Returns:
        Liste de phrases non vides.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def extract_paragraphs(text: str) -> list[str]:
    """Découpe un texte en paragraphes (séparés par des doubles sauts de ligne)."""
    paragraphs = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragraphs if p.strip()]
