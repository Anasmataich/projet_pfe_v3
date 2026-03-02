-- Migration 002 : Création de la table des documents
-- Dépend de : 001_create_users.sql
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Types ENUM
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE document_category AS ENUM (
    'DECISION',
    'CIRCULAIRE',
    'RAPPORT',
    'BUDGET',
    'RH',
    'CORRESPONDANCE',
    'PROJET_PEDAGOGIQUE',
    'INSPECTION',
    'ARCHIVE',
    'AUTRE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE confidentiality_level AS ENUM (
    'PUBLIC',
    'INTERNE',
    'CONFIDENTIEL',
    'SECRET'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'BROUILLON',
    'EN_REVISION',
    'EN_ATTENTE',
    'APPROUVE',
    'REJETE',
    'ARCHIVE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- Table : documents
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id                    UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 VARCHAR(500)         NOT NULL,
  description           TEXT,
  category              document_category    NOT NULL,
  confidentiality_level confidentiality_level NOT NULL DEFAULT 'INTERNE',
  status                document_status      NOT NULL DEFAULT 'BROUILLON',
  storage_key           VARCHAR(1000)        NOT NULL,
  original_filename     VARCHAR(500)         NOT NULL,
  mime_type             VARCHAR(100)         NOT NULL,
  file_size             BIGINT               NOT NULL DEFAULT 0,
  file_hash             VARCHAR(64),
  version               VARCHAR(20)          NOT NULL DEFAULT 'v1.0',
  tags                  TEXT[]               DEFAULT '{}',
  ai_summary            TEXT,
  ai_category           VARCHAR(100),
  ai_confidence         NUMERIC(5, 4),
  ai_anomaly_score      NUMERIC(5, 4),
  uploaded_by           UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by         ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status              ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category            ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality     ON documents(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at          ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_created_at          ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags                ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_title_search        ON documents USING GIN(to_tsvector('french', title));

-- ─────────────────────────────────────────────
-- Trigger updated_at
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
