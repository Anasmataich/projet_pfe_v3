-- fix_admin_password.sql — Corriger le mot de passe admin (à exécuter dans le conteneur Postgres)
-- Usage: docker exec -i ged-postgres psql -U ged_user -d ged_db < database/seeds/fix_admin_password.sql
-- Ou: psql -U ged_user -d ged_db -f fix_admin_password.sql

BEGIN;

-- Mettre à jour le hash pour admin@ged.gov.ma
-- Mot de passe: Admin@GED2024 (hash bcrypt rounds=12)
UPDATE users
SET password_hash = '$2a$12$Nkfz7v94ubVRuTQpr/MyJOLi0Mee3vFFD99xvnUo9YXUQmyqIQbrG',
    updated_at   = NOW()
WHERE email = 'admin@ged.gov.ma';

-- Si vous préférez un mot de passe de test simple (12345678), décommentez la ligne suivante
-- et commentez le UPDATE ci-dessus:
-- UPDATE users SET password_hash = '$2a$12$sN7kD.hJrTXCbORiWLoT9eFx5DkMSwiaLcupT8RiVbi5vK6JY8hCm', updated_at = NOW() WHERE email = 'admin@ged.gov.ma';

COMMIT;
