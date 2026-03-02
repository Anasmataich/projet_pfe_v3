-- Migration 003 : Création de la table des versions de documents
-- Dépend de : 001_create_users.sql, 002_create_documents.sql
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Table : document_versions
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_versions (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID          NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version         VARCHAR(20)   NOT NULL,
  storage_key     VARCHAR(1000) NOT NULL,
  original_filename VARCHAR(500),
  mime_type       VARCHAR(100),
  file_size       BIGINT        DEFAULT 0,
  file_hash       VARCHAR(64),
  change_summary  TEXT,
  created_by      UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at  ON document_versions(created_at DESC);

COMMIT;
