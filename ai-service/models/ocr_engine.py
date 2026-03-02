"""
ocr_engine.py — Moteur OCR pour la numérisation de documents scannés.

Utilise Tesseract (via pytesseract) pour extraire le texte
des images et PDFs scannés.
"""

import io

from loguru import logger

from schemas.ai_response_schema import OCRResult


class OCREngine:
    """
    Moteur de reconnaissance optique de caractères (OCR).

    Attributes:
        _is_available: Indique si Tesseract est installé.
        _is_mock: Mode simulation actif.
        _language: Code langue Tesseract (ex: ``fra``).
    """

    def __init__(self) -> None:
        self._is_available: bool = False
        self._is_mock: bool = True
        self._language: str = "fra"

    def load(self, language: str = "fra", mock: bool = True) -> None:
        """
        Initialise le moteur OCR.

        Args:
            language: Code langue Tesseract (``fra``, ``eng``, ``ara``…).
            mock: Si ``True``, utilise le mode simulation.
        """
        self._language = language

        if mock:
            logger.info("[OCR] Mode mock activé")
            self._is_mock = True
            return

        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self._is_available = True
            self._is_mock = False
            logger.info(f"[OCR] Tesseract disponible, langue : {language}")
        except Exception as exc:
            logger.warning(f"[OCR] Tesseract non disponible ({exc}), fallback mock")
            self._is_mock = True

    def process_image(self, image_bytes: bytes) -> OCRResult:
        """
        Applique l'OCR sur une image.

        Args:
            image_bytes: Contenu brut de l'image (PNG, JPEG…).

        Returns:
            OCRResult avec le texte extrait et le score de confiance.
        """
        if self._is_mock:
            return self._mock_ocr_image()

        try:
            import pytesseract
            from PIL import Image

            image = Image.open(io.BytesIO(image_bytes))
            data = pytesseract.image_to_data(
                image, lang=self._language, output_type=pytesseract.Output.DICT
            )

            text = pytesseract.image_to_string(image, lang=self._language)
            confidences = [int(c) for c in data["conf"] if int(c) > 0]
            avg_conf = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0

            return OCRResult(
                text=text.strip(),
                pages=1,
                confidence=round(avg_conf, 4),
                language=self._language[:2],
            )
        except Exception as exc:
            logger.error(f"[OCR] Erreur image : {exc}")
            return OCRResult(text="", pages=1, confidence=0.0, language=self._language[:2])

    def process_pdf(self, pdf_bytes: bytes) -> OCRResult:
        """
        Applique l'OCR sur un PDF scanné (conversion page par page en image).

        Args:
            pdf_bytes: Contenu brut du fichier PDF.

        Returns:
            OCRResult avec le texte de toutes les pages et la confiance moyenne.
        """
        if self._is_mock:
            return self._mock_ocr_pdf()

        try:
            from pdf2image import convert_from_bytes
            import pytesseract

            images = convert_from_bytes(pdf_bytes, dpi=300)
            all_text: list[str] = []
            total_confidence: float = 0.0

            for page_img in images:
                text = pytesseract.image_to_string(page_img, lang=self._language)
                all_text.append(text.strip())

                data = pytesseract.image_to_data(
                    page_img, lang=self._language, output_type=pytesseract.Output.DICT
                )
                confs = [int(c) for c in data["conf"] if int(c) > 0]
                if confs:
                    total_confidence += sum(confs) / len(confs) / 100.0

            page_count = len(images)
            avg_conf = total_confidence / page_count if page_count > 0 else 0.0

            return OCRResult(
                text="\n\n".join(all_text),
                pages=page_count,
                confidence=round(avg_conf, 4),
                language=self._language[:2],
            )
        except Exception as exc:
            logger.error(f"[OCR] Erreur PDF : {exc}")
            return OCRResult(text="", pages=0, confidence=0.0, language=self._language[:2])

    @staticmethod
    def _mock_ocr_image() -> OCRResult:
        """Résultat OCR simulé pour une image."""
        return OCRResult(
            text=(
                "ROYAUME DU MAROC\n"
                "Ministère de l'Éducation Nationale\n"
                "Direction des Affaires Générales\n\n"
                "Objet : Document scanné — traitement OCR simulé.\n"
                "Le contenu de ce document a été extrait en mode mock.\n"
            ),
            pages=1,
            confidence=0.92,
            language="fr",
        )

    @staticmethod
    def _mock_ocr_pdf() -> OCRResult:
        """Résultat OCR simulé pour un PDF scanné."""
        return OCRResult(
            text=(
                "Page 1 — En-tête du document ministériel.\n"
                "Objet : Simulation OCR pour PDF scanné.\n\n"
                "Page 2 — Corps du document.\n"
                "Les données ont été extraites en mode mock pour les tests.\n"
            ),
            pages=2,
            confidence=0.88,
            language="fr",
        )
