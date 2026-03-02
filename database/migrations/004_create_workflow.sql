-- Migration 004 : Création des tables de workflow
-- Dépend de : 001_create_users.sql, 002_create_documents.sql
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Types ENUM
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE workflow_step AS ENUM (
    'SOUMISSION',
    'REVISION',
    'VALIDATION_N1',
    'VALIDATION_N2',
    'APPROBATION',
    'PUBLICATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- Table : workflow_instances
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_instances (
  id               UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID             NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  current_step     workflow_step    NOT NULL DEFAULT 'SOUMISSION',
  status           workflow_status  NOT NULL DEFAULT 'PENDING',
  submitted_by     UUID             REFERENCES users(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ,
  reviewed_by      UUID             REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  approved_by      UUID             REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejected_by      UUID             REFERENCES users(id) ON DELETE SET NULL,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  comments         TEXT,
  deadline         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table : workflow_comments (commentaires / historique)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_comments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID        NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content      TEXT        NOT NULL,
  step         workflow_step,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workflow_instances_document_id ON workflow_instances(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status      ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_submitted   ON workflow_instances(submitted_by);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_workflow_id  ON workflow_comments(workflow_id);

-- ─────────────────────────────────────────────
-- Trigger updated_at
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_workflow_updated_at ON workflow_instances;
CREATE TRIGGER trg_workflow_updated_at
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
