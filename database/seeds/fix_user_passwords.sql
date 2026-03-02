-- fix_user_passwords.sql
-- Corrige le password_hash des utilisateurs non-admin
-- dont le hash ne correspondait pas au mot de passe documenté (Test@1234).
--
-- Hash bcrypt (rounds=12) généré via bcryptjs pour : Test@1234
-- Vérifié : bcrypt.compare('Test@1234', hash) === true
-- ─────────────────────────────────────────────

BEGIN;

UPDATE users
SET password_hash = '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y',
    updated_at = NOW()
WHERE email IN (
  'cadre@ged.gov.ma',
  'inspecteur@ged.gov.ma',
  'rh@ged.gov.ma',
  'comptable@ged.gov.ma',
  'consultant@ged.gov.ma'
);

COMMIT;
