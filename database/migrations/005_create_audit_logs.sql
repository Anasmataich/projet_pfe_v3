-- Migration 005 : Création de la table des journaux d'audit
-- Dépend de : 001_create_users.sql
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Type ENUM
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    -- Authentification
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'MFA_VERIFIED',
    'PASSWORD_RESET',
    -- Documents
    'DOC_CREATE',
    'DOC_READ',
    'DOC_UPDATE',
    'DOC_DELETE',
    'DOC_UPLOAD',
    'DOC_DOWNLOAD',
    'DOC_SHARE',
    -- Workflow
    'WORKFLOW_SUBMIT',
    'WORKFLOW_APPROVE',
    'WORKFLOW_REJECT',
    -- Utilisateurs
    'USER_CREATE',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_SUSPEND',
    -- Sécurité
    'UNAUTHORIZED_ACCESS',
    'PERMISSION_DENIED',
    'ANOMALY_DETECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- Table : audit_logs
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
  action        audit_action  NOT NULL,
  resource_type VARCHAR(100),
  resource_id   UUID,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  details       JSONB         NOT NULL DEFAULT '{}',
  success       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id  ON audit_logs(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_success      ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details      ON audit_logs USING GIN(details);

-- ─────────────────────────────────────────────
-- Politique de rétention (données > 2 ans → archive)
-- Note : à exécuter via un job pg_cron en production
-- ─────────────────────────────────────────────
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0',
--   'DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL ''2 years''');

COMMIT;
