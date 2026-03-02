-- schema.sql - Schéma complet de la base de données GED
-- Plateforme Documentaire — DSI Ministère de l'Éducation Nationale
-- À appliquer via les migrations individuelles (database/migrations/)
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Trigger helper : mise à jour automatique de updated_at
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- 1. UTILISATEURS
-- ═══════════════════════════════════════════════

CREATE TYPE user_role AS ENUM (
  'ADMIN', 'CADRE', 'INSPECTEUR', 'RH', 'COMPTABLE', 'CONSULTANT'
);

CREATE TYPE user_status AS ENUM (
  'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'
);

CREATE TABLE users (
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

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════
-- 2. DOCUMENTS
-- ═══════════════════════════════════════════════

CREATE TYPE document_category AS ENUM (
  'DECISION', 'CIRCULAIRE', 'RAPPORT', 'BUDGET', 'RH',
  'CORRESPONDANCE', 'PROJET_PEDAGOGIQUE', 'INSPECTION', 'ARCHIVE', 'AUTRE'
);

CREATE TYPE confidentiality_level AS ENUM (
  'PUBLIC', 'INTERNE', 'CONFIDENTIEL', 'SECRET'
);

CREATE TYPE document_status AS ENUM (
  'BROUILLON', 'EN_REVISION', 'EN_ATTENTE', 'APPROUVE', 'REJETE', 'ARCHIVE'
);

CREATE TABLE documents (
  id                    UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 VARCHAR(500)          NOT NULL,
  description           TEXT,
  category              document_category     NOT NULL,
  confidentiality_level confidentiality_level NOT NULL DEFAULT 'INTERNE',
  status                document_status       NOT NULL DEFAULT 'BROUILLON',
  storage_key           VARCHAR(1000)         NOT NULL,
  original_filename     VARCHAR(500)          NOT NULL,
  mime_type             VARCHAR(100)          NOT NULL,
  file_size             BIGINT                NOT NULL DEFAULT 0,
  file_hash             VARCHAR(64),
  version               VARCHAR(20)           NOT NULL DEFAULT 'v1.0',
  tags                  TEXT[]                DEFAULT '{}',
  ai_summary            TEXT,
  ai_category           VARCHAR(100),
  ai_confidence         NUMERIC(5, 4),
  ai_anomaly_score      NUMERIC(5, 4),
  uploaded_by           UUID                  NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_documents_uploaded_by     ON documents(uploaded_by);
CREATE INDEX idx_documents_status          ON documents(status);
CREATE INDEX idx_documents_category        ON documents(category);
CREATE INDEX idx_documents_confidentiality ON documents(confidentiality_level);
CREATE INDEX idx_documents_deleted_at      ON documents(deleted_at);
CREATE INDEX idx_documents_created_at      ON documents(created_at DESC);
CREATE INDEX idx_documents_tags            ON documents USING GIN(tags);
CREATE INDEX idx_documents_title_search    ON documents USING GIN(to_tsvector('french', title));

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════
-- 3. VERSIONS DE DOCUMENTS
-- ═══════════════════════════════════════════════

CREATE TABLE document_versions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id       UUID          NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version           VARCHAR(20)   NOT NULL,
  storage_key       VARCHAR(1000) NOT NULL,
  original_filename VARCHAR(500),
  mime_type         VARCHAR(100),
  file_size         BIGINT        DEFAULT 0,
  file_hash         VARCHAR(64),
  change_summary    TEXT,
  created_by        UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, version)
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at  ON document_versions(created_at DESC);

-- ═══════════════════════════════════════════════
-- 4. WORKFLOW
-- ═══════════════════════════════════════════════

CREATE TYPE workflow_step AS ENUM (
  'SOUMISSION', 'REVISION', 'VALIDATION_N1', 'VALIDATION_N2', 'APPROBATION', 'PUBLICATION'
);

CREATE TYPE workflow_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'
);

CREATE TABLE workflow_instances (
  id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID            NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  current_step     workflow_step   NOT NULL DEFAULT 'SOUMISSION',
  status           workflow_status NOT NULL DEFAULT 'PENDING',
  submitted_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ,
  reviewed_by      UUID            REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  approved_by      UUID            REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejected_by      UUID            REFERENCES users(id) ON DELETE SET NULL,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  comments         TEXT,
  deadline         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_comments (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID          NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content      TEXT          NOT NULL,
  step         workflow_step,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_instances_document_id ON workflow_instances(document_id);
CREATE INDEX idx_workflow_instances_status      ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_submitted   ON workflow_instances(submitted_by);
CREATE INDEX idx_workflow_comments_workflow_id  ON workflow_comments(workflow_id);

CREATE TRIGGER trg_workflow_updated_at
  BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════
-- 5. JOURNAUX D'AUDIT
-- ═══════════════════════════════════════════════

CREATE TYPE audit_action AS ENUM (
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_VERIFIED', 'PASSWORD_RESET',
  'DOC_CREATE', 'DOC_READ', 'DOC_UPDATE', 'DOC_DELETE', 'DOC_UPLOAD', 'DOC_DOWNLOAD', 'DOC_SHARE',
  'WORKFLOW_SUBMIT', 'WORKFLOW_APPROVE', 'WORKFLOW_REJECT',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_SUSPEND',
  'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'ANOMALY_DETECTED'
);

CREATE TABLE audit_logs (
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

CREATE INDEX idx_audit_logs_user_id     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_audit_logs_success     ON audit_logs(success);
CREATE INDEX idx_audit_logs_details     ON audit_logs USING GIN(details);

-- ═══════════════════════════════════════════════
-- 6. PERMISSIONS & ACCÈS
-- ═══════════════════════════════════════════════

CREATE TABLE role_permissions (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        user_role    NOT NULL,
  permission  VARCHAR(100) NOT NULL,
  granted     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission)
);

CREATE TABLE user_permissions (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  VARCHAR(100) NOT NULL,
  granted     BOOLEAN      NOT NULL DEFAULT TRUE,
  granted_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

CREATE TABLE document_access (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_read    BOOLEAN     NOT NULL DEFAULT TRUE,
  can_update  BOOLEAN     NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN     NOT NULL DEFAULT FALSE,
  can_share   BOOLEAN     NOT NULL DEFAULT FALSE,
  granted_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX idx_role_permissions_role    ON role_permissions(role);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_document_access_doc_id   ON document_access(document_id);
CREATE INDEX idx_document_access_user_id  ON document_access(user_id);

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════
-- 7. NOTIFICATIONS
-- ═══════════════════════════════════════════════

CREATE TYPE notification_type AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

CREATE TABLE notifications (
  id          UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type  NOT NULL DEFAULT 'INFO',
  title       VARCHAR(255)       NOT NULL,
  message     TEXT,
  action_url  VARCHAR(1000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  in_app_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  doc_approved_notif BOOLEAN     NOT NULL DEFAULT TRUE,
  doc_rejected_notif BOOLEAN     NOT NULL DEFAULT TRUE,
  workflow_notif     BOOLEAN     NOT NULL DEFAULT TRUE,
  security_notif     BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_read_at    ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
