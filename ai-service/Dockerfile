# ─────────────────────────────────────────────
# Dockerfile — Microservice IA (FastAPI)
# Plateforme GED — DSI Ministère Éducation Nationale
# ─────────────────────────────────────────────

FROM python:3.11-slim AS base

LABEL maintainer="DSI — Ministère de l'Éducation Nationale"
LABEL description="GED AI-Service — Microservice Intelligence Artificielle"

# Dépendances système pour Tesseract OCR et compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-ara \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Utilisateur non-root
RUN groupadd -r ged && useradd -r -g ged -m ged

WORKDIR /app

# Installation des dépendances Python
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY --chown=ged:ged . .

USER ged

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV ENV=production
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health'); assert r.status_code == 200"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
