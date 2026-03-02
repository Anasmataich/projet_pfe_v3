-- fix_admin_password_simple.sql — Définir le mot de passe admin à 12345678 (test uniquement)
-- Usage: docker exec -i ged-postgres psql -U ged_user -d ged_db < database/seeds/fix_admin_password_simple.sql

BEGIN;

UPDATE users
SET password_hash = '$2a$12$sN7kD.hJrTXCbORiWLoT9eFx5DkMSwiaLcupT8RiVbi5vK6JY8hCm',
    updated_at   = NOW()
WHERE email = 'admin@ged.gov.ma';

COMMIT;
