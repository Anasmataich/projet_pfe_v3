-- seed_roles.sql - Permissions par défaut pour chaque rôle RBAC
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Permissions — ADMIN (accès total)
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('ADMIN', 'user:read',            TRUE),
  ('ADMIN', 'user:create',          TRUE),
  ('ADMIN', 'user:update',          TRUE),
  ('ADMIN', 'user:delete',          TRUE),
  ('ADMIN', 'doc:read',             TRUE),
  ('ADMIN', 'doc:upload',           TRUE),
  ('ADMIN', 'doc:update',           TRUE),
  ('ADMIN', 'doc:delete',           TRUE),
  ('ADMIN', 'doc:download',         TRUE),
  ('ADMIN', 'doc:share',            TRUE),
  ('ADMIN', 'workflow:submit',      TRUE),
  ('ADMIN', 'workflow:approve',     TRUE),
  ('ADMIN', 'workflow:reject',      TRUE),
  ('ADMIN', 'audit:read',           TRUE),
  ('ADMIN', 'notification:read',    TRUE),
  ('ADMIN', 'report:generate',      TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- ─────────────────────────────────────────────
-- Permissions — CADRE (gestionnaire de contenu)
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('CADRE', 'doc:read',             TRUE),
  ('CADRE', 'doc:upload',           TRUE),
  ('CADRE', 'doc:update',           TRUE),
  ('CADRE', 'doc:delete',           FALSE),
  ('CADRE', 'doc:download',         TRUE),
  ('CADRE', 'doc:share',            TRUE),
  ('CADRE', 'workflow:submit',      TRUE),
  ('CADRE', 'workflow:approve',     TRUE),
  ('CADRE', 'workflow:reject',      TRUE),
  ('CADRE', 'audit:read',           FALSE),
  ('CADRE', 'notification:read',    TRUE),
  ('CADRE', 'report:generate',      TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- ─────────────────────────────────────────────
-- Permissions — INSPECTEUR
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('INSPECTEUR', 'doc:read',        TRUE),
  ('INSPECTEUR', 'doc:upload',      TRUE),
  ('INSPECTEUR', 'doc:update',      TRUE),
  ('INSPECTEUR', 'doc:delete',      FALSE),
  ('INSPECTEUR', 'doc:download',    TRUE),
  ('INSPECTEUR', 'doc:share',       FALSE),
  ('INSPECTEUR', 'workflow:submit', TRUE),
  ('INSPECTEUR', 'workflow:approve',FALSE),
  ('INSPECTEUR', 'workflow:reject', FALSE),
  ('INSPECTEUR', 'audit:read',      FALSE),
  ('INSPECTEUR', 'notification:read', TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- ─────────────────────────────────────────────
-- Permissions — RH
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('RH', 'doc:read',                TRUE),
  ('RH', 'doc:upload',              TRUE),
  ('RH', 'doc:update',              TRUE),
  ('RH', 'doc:delete',              FALSE),
  ('RH', 'doc:download',            TRUE),
  ('RH', 'doc:share',               FALSE),
  ('RH', 'workflow:submit',         TRUE),
  ('RH', 'workflow:approve',        FALSE),
  ('RH', 'workflow:reject',         FALSE),
  ('RH', 'audit:read',              FALSE),
  ('RH', 'notification:read',       TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- ─────────────────────────────────────────────
-- Permissions — COMPTABLE
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('COMPTABLE', 'doc:read',         TRUE),
  ('COMPTABLE', 'doc:upload',       TRUE),
  ('COMPTABLE', 'doc:update',       TRUE),
  ('COMPTABLE', 'doc:delete',       FALSE),
  ('COMPTABLE', 'doc:download',     TRUE),
  ('COMPTABLE', 'doc:share',        FALSE),
  ('COMPTABLE', 'workflow:submit',  TRUE),
  ('COMPTABLE', 'workflow:approve', FALSE),
  ('COMPTABLE', 'workflow:reject',  FALSE),
  ('COMPTABLE', 'audit:read',       FALSE),
  ('COMPTABLE', 'notification:read',TRUE),
  ('COMPTABLE', 'report:generate',  TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- ─────────────────────────────────────────────
-- Permissions — CONSULTANT (lecture seule)
-- ─────────────────────────────────────────────
INSERT INTO role_permissions (role, permission, granted) VALUES
  ('CONSULTANT', 'doc:read',        TRUE),
  ('CONSULTANT', 'doc:upload',      FALSE),
  ('CONSULTANT', 'doc:update',      FALSE),
  ('CONSULTANT', 'doc:delete',      FALSE),
  ('CONSULTANT', 'doc:download',    TRUE),
  ('CONSULTANT', 'doc:share',       FALSE),
  ('CONSULTANT', 'workflow:submit', FALSE),
  ('CONSULTANT', 'workflow:approve',FALSE),
  ('CONSULTANT', 'workflow:reject', FALSE),
  ('CONSULTANT', 'audit:read',      FALSE),
  ('CONSULTANT', 'notification:read', TRUE)
ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted;

COMMIT;
