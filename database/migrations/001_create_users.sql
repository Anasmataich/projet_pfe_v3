-- Migration 001 : Création de la table des utilisateurs
-- Plateforme GED — DSI Ministère Éducation Nationale
-- ─────────────────────────────────────────────

BEGIN;

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Types ENUM
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'CADRE',
    'INSPECTEUR',
    'RH',
    'COMPTABLE',
    'CONSULTANT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- Table : users
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(255)  NOT NULL UNIQUE,
  password_hash         VARCHAR(255)  NOT NULL,
  role                  user_role     NOT NULL DEFAULT 'CONSULTANT',
  status                user_status   NOT NULL DEFAULT 'PENDING',
  first_name            VARCHAR(100),
  last_name             VARCHAR(100),
  mfa_enabled           BOOLEAN       NOT NULL DEFAULT FALSE,
  mfa_secret            VARCHAR(64),
  failed_login_attempts INT           NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ─────────────────────────────────────────────
-- Trigger : mise à jour automatique de updated_at
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
