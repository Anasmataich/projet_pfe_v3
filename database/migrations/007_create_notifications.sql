-- Migration 007 : Création de la table des notifications
-- Dépend de : 001_create_users.sql
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Type ENUM
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- Table : notifications
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type  NOT NULL DEFAULT 'INFO',
  title       VARCHAR(255)       NOT NULL,
  message     TEXT,
  action_url  VARCHAR(1000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table : notification_preferences (opt-in/out par canal)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
  in_app_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  doc_approved_notif   BOOLEAN     NOT NULL DEFAULT TRUE,
  doc_rejected_notif   BOOLEAN     NOT NULL DEFAULT TRUE,
  workflow_notif       BOOLEAN     NOT NULL DEFAULT TRUE,
  security_notif       BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at    ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMIT;
