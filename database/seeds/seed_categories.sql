-- seed_categories.sql - Données de référence et utilisateurs de test
-- À utiliser UNIQUEMENT en environnement de développement
-- ─────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────
-- Utilisateurs de test (développement uniquement)
-- Mot de passe commun : Test@1234
-- Hash bcrypt (rounds=12)
-- ─────────────────────────────────────────────

-- Hash bcrypt correct pour le mot de passe : Test@1234 (rounds=12, généré via bcryptjs)
INSERT INTO users (id, email, password_hash, role, status, first_name, last_name) VALUES
  (uuid_generate_v4(), 'cadre@ged.gov.ma',      '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y', 'CADRE',       'ACTIVE', 'Ahmed',   'Benali'),
  (uuid_generate_v4(), 'inspecteur@ged.gov.ma', '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y', 'INSPECTEUR',  'ACTIVE', 'Fatima',  'Zahra'),
  (uuid_generate_v4(), 'rh@ged.gov.ma',         '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y', 'RH',          'ACTIVE', 'Hassan',  'Moussaoui'),
  (uuid_generate_v4(), 'comptable@ged.gov.ma',  '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y', 'COMPTABLE',   'ACTIVE', 'Karima',  'El Idrissi'),
  (uuid_generate_v4(), 'consultant@ged.gov.ma', '$2a$12$VzWbgJoRfBKokxIWqpn9r.WODXlMOhS64gxMNVTZogQTv/2/cIf4y', 'CONSULTANT',  'ACTIVE', 'Youssef', 'Amine')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────
-- Préférences de notification pour tous les utilisateurs
-- ─────────────────────────────────────────────

INSERT INTO notification_preferences (user_id, email_enabled, in_app_enabled)
SELECT id, TRUE, TRUE FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- Notifications de bienvenue pour les utilisateurs de test
-- ─────────────────────────────────────────────

INSERT INTO notifications (user_id, type, title, message)
SELECT
  id,
  'INFO',
  'Bienvenue sur la Plateforme GED',
  'Votre compte a été créé. Vous pouvez dès maintenant accéder à vos documents et utiliser toutes les fonctionnalités de la plateforme.'
FROM users
WHERE email != 'admin@ged.gov.ma'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- Commentaire : les catégories de documents sont des ENUMs PostgreSQL
-- définis dans 002_create_documents.sql (document_category) :
-- DECISION, CIRCULAIRE, RAPPORT, BUDGET, RH, CORRESPONDANCE,
-- PROJET_PEDAGOGIQUE, INSPECTION, ARCHIVE, AUTRE
--
-- Niveaux de confidentialité (confidentiality_level) :
-- PUBLIC, INTERNE, CONFIDENTIEL, SECRET
-- ─────────────────────────────────────────────

COMMIT;
