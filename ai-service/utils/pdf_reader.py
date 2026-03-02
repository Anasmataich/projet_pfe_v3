"""
pdf_reader.py — Lecture et extraction de contenu depuis des fichiers PDF.

Prend en charge l'extraction de texte via PyPDF2 et pdfplumber,
avec fallback automatique en cas d'échec.
"""

import io

from loguru import logger


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extrait le texte d'un fichier PDF.

    Tente d'abord pdfplumber (meilleure qualité pour les tableaux),
    puis PyPDF2 en fallback.

    Args:
        file_bytes: Contenu brut du fichier PDF.

    Returns:
        Texte extrait concaténé de toutes les pages.

    Raises:
        ValueError: Si aucune méthode n'a réussi à extraire du texte.
    """
    text = _try_pdfplumber(file_bytes)
    if text and text.strip():
        logger.debug(f"[PDF] Extraction via pdfplumber : {len(text)} caractères")
        return text

    text = _try_pypdf2(file_bytes)
    if text and text.strip():
        logger.debug(f"[PDF] Extraction via PyPDF2 : {len(text)} caractères")
        return text

    logger.warning("[PDF] Aucun texte extrait — le PDF est probablement un scan (OCR requis)")
    return ""


def get_pdf_page_count(file_bytes: bytes) -> int:
    """
    Retourne le nombre de pages d'un PDF.

    Args:
        file_bytes: Contenu brut du fichier PDF.

    Returns:
        Nombre de pages, ou 0 en cas d'erreur.
    """
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return len(reader.pages)
    except Exception:
        return 0


def is_scanned_pdf(file_bytes: bytes) -> bool:
    """
    Détecte si un PDF est un scan (pas de texte extractible).

    Args:
        file_bytes: Contenu brut du fichier PDF.

    Returns:
        True si le PDF semble être un scan sans texte machine.
    """
    text = extract_text_from_pdf(file_bytes)
    return len(text.strip()) < 50


# ── Implémentations internes ──────────────────


def _try_pdfplumber(file_bytes: bytes) -> str:
    """Extraction via pdfplumber (gère mieux les tableaux et mises en page complexes)."""
    try:
        import pdfplumber

        pages_text: list[str] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text)
        return "\n\n".join(pages_text)
    except Exception as exc:
        logger.debug(f"[PDF] pdfplumber échoué : {exc}")
        return ""


def _try_pypdf2(file_bytes: bytes) -> str:
    """Extraction via PyPDF2 (fallback plus robuste)."""
    try:
        import PyPDF2

        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages_text)
    except Exception as exc:
        logger.debug(f"[PDF] PyPDF2 échoué : {exc}")
        return ""
