# AI Microservice (FastAPI)

This folder contains the **GED AI Microservice**, built with **FastAPI**. It provides the platform with document intelligence features such as:

- **Document classification** (ministry document categories)
- **OCR** for scanned PDFs/images (currently **Tesseract** via `pytesseract`; designed to support alternatives like **PaddleOCR** later)
- **Semantic search** (embeddings-based similarity)
- **Named Entity Recognition (NER)** (spaCy)
- **Summarization** (Transformers / fallback extractive)
- **Anomaly detection** (heuristics now; ML-ready)

## Links

- **Main project README**: [`../README.md`](../README.md)
- **Security & compliance configuration**: [`../security/README.md`](../security/README.md)

---

## Technical Stack

- **Python 3.11+**
- **FastAPI** + **Uvicorn**
- **Pydantic v2** (schemas & validation)
- **spaCy** (NER)
- **Transformers** (classification/summarization, mock-ready)
- **Tesseract OCR** (`pytesseract`) for OCR
- **Sentence-Transformers** (semantic search, mock-ready)
- **MinIO / S3** access via **boto3**

---

## How it fits in the GED architecture

The backend triggers AI analysis asynchronously after a document upload. The integration is:

- Backend calls `POST {AI_SERVICE_URL}/analyze` with payload `{ documentId, storageKey }`
- The AI-service fetches the file from **S3/MinIO**, extracts text (PDF text extraction and OCR fallback), then runs the pipeline:
  - language detection → text cleaning → classification → NER → summarization → anomaly detection
- Responses are **always wrapped** in the unified envelope defined in `schemas/ai_response_schema.py` (`AIResponse`).

---

## Setup (Local Development)

### 1) Create a virtual environment

From the repository root:

```bash
cd ai-service
python -m venv .venv
```

Activate it:

- Windows (PowerShell):

```bash
.\.venv\Scripts\Activate.ps1
```

- Linux/macOS:

```bash
source .venv/bin/activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) (Optional) Install spaCy language model

If you want real NER in non-mock mode:

```bash
python -m spacy download fr_core_news_md
```

### 4) Configure environment variables

Create `ai-service/.env`:

```env
# Runtime
ENV=development
DEBUG=true
LOG_LEVEL=INFO

# Security (shared with backend)
API_KEY=             # set this and also set backend AI_SERVICE_API_KEY

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=ged-documents
S3_REGION=us-east-1

# Models (production mode loads real models)
CLASSIFIER_MODEL=cmarkea/distilcamembert-base-nli
SUMMARIZER_MODEL=moussaKam/barthez-orangesum-abstract
EMBEDDINGS_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
NER_SPACY_MODEL=fr_core_news_md
OCR_LANGUAGE=fra
```

### 5) Run the service

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

- `GET /health`

Swagger UI (enabled in non-production):

- `GET /docs`

---

## API Endpoints

### Routes from `api/routes.py`

All routes below require the `X-API-Key` header **when** `API_KEY` is set (dev mode allows empty `API_KEY`).

| Method | Route | Description |
|---|---|---|
| POST | `/ai/classify` | Text classification (ministry document category) |
| POST | `/ai/extract` | Named entity extraction (NER) |
| POST | `/ai/summarize` | Text summarization |
| POST | `/ai/ocr` | OCR for uploaded image/PDF |
| POST | `/ai/search` | Semantic search over a corpus |
| POST | `/ai/anomaly` | Anomaly detection |

### Integration route (used by the backend)

| Method | Route | Description |
|---|---|---|
| POST | `/analyze` | Full pipeline: S3 download → extraction/OCR → NLP pipeline |

---

## Response Format (AIResponse)

All endpoints respond with the envelope defined in `schemas/ai_response_schema.py`:

```json
{
  "success": true,
  "message": "Analyse complète effectuée",
  "data": { },
  "processing_time_ms": 123.45,
  "model_version": "1.0.0",
  "timestamp": "2026-02-21T12:34:56.000000"
}
```

---

## Docker

Build and run:

```bash
docker build -t ged-ai-service .
docker run --rm -p 8000:8000 --env-file .env ged-ai-service
```

Notes:

- The image installs **Tesseract OCR** and language packs (**French** + **Arabic**) in the container.
- In production (`ENV=production`), the service loads real models by default (see `services/model_loader.py`).

