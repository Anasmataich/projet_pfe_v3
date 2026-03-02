-- Migration 006 : Création des tables de permissions et rôles
-- Dépend de : 001_create_users.sql
-- Note : La logique RBAC principale est gérée côté applicatif (roles.config.ts)
--        Cette migration stocke les overrides de permissions personnalisées
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Table : role_permissions (configuration RBAC persistée)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        user_role     NOT NULL,
  permission  VARCHAR(100)  NOT NULL,
  granted     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- ─────────────────────────────────────────────
-- Table : user_permissions (overrides par utilisateur)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_permissions (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  VARCHAR(100)  NOT NULL,
  granted     BOOLEAN       NOT NULL DEFAULT TRUE,
  granted_by  UUID          REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- ─────────────────────────────────────────────
-- Table : document_access (accès partagé par document)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_access (
  id          UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID                  NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     UUID                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_read    BOOLEAN               NOT NULL DEFAULT TRUE,
  can_update  BOOLEAN               NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN               NOT NULL DEFAULT FALSE,
  can_share   BOOLEAN               NOT NULL DEFAULT FALSE,
  granted_by  UUID                  REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_role_permissions_role     ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id  ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_doc_id   ON document_access(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_user_id  ON document_access(user_id);

-- ─────────────────────────────────────────────
-- Trigger updated_at
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
