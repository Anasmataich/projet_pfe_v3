# Plan de test QA — Plateforme GED

**Émetteur :** Ingénieur QA / Full-Stack Senior  
**Date :** 27 février 2025  
**Objectif :** Tester rigoureusement la plateforme GED (Backend, AI-Service, Frontend) pour garantir stabilité et fiabilité.

---

## ÉTAPE 1 — AUDIT ET PLAN DE TEST (Analyse uniquement)

### 1.1 État des lieux — Frameworks de test existants

| Composant | Technologies | Framework de test | Fichiers de test | Script `test` |
|-----------|--------------|-------------------|------------------|---------------|
| **Backend** | Node.js, Express, TypeScript | ❌ Aucun | ❌ Aucun | ❌ Non |
| **AI-Service** | FastAPI, Python | ❌ Aucun (PyTest non configuré) | ❌ Aucun | ❌ Non |
| **Frontend** | React, Vite, TypeScript | ❌ Aucun (RTL/Cypress absents) | ❌ Aucun | ❌ Non |

**Conclusion :** Aucun framework de test n’est configuré. Les trois modules doivent être instrumentés from scratch.

---

### 1.2 Architecture à tester

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  AI-Service │
│  (React)    │     │  (Express)  │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────┴─────┐
                    │ PostgreSQL│
                    │ MinIO     │
                    │ Redis     │
                    └───────────┘
```

---

### 1.3 Plan de test priorisé — Flux critiques

#### Priorité 1 — BACKEND

| Flux | Description | Type de tests | Risques |
|------|-------------|---------------|---------|
| **Auth JWT / MFA** | Login, refresh, MFA setup/verify/enable/disable, logout | Unitaires + Intégration API | Sécurité, blocage utilisateurs |
| **RBAC** | `authenticate`, `requirePermission`, `adminOnly` | Unitaires | Accès non autorisés |
| **PostgreSQL** | Connexion, healthCheck, transactions | Intégration (ou unitaires avec mock) | Erreurs 500, downtime |
| **MinIO / Storage** | Upload, download, signed URLs | Intégration (mocking possible) | Perte de fichiers |
| **Upload de fichiers** | Multer, validation MIME, magic bytes, taille max | Unitaires + Intégration | Injection, corruption |

**Dépendances Backend :** `config/jwt.ts`, `config/database.ts`, `config/storage.ts`, `config/redis.ts`, middlewares `authenticate` et `authorize`.

---

#### Priorité 2 — AI-SERVICE

| Flux | Description | Type de tests | Risques |
|------|-------------|---------------|---------|
| **Health check** | `/health` — modèles chargés, service opérationnel | Intégration | Détection de panne |
| **Endpoints IA** | `/ai/classify`, `/ai/extract`, `/ai/summarize`, `/ai/ocr`, `/ai/search`, `/ai/anomaly` | Unitaires + Intégration | Erreurs 500, latence |
| **Pipeline `/analyze`** | Analyse complète document | Intégration | Blocage du flux document |
| **Clé API** | `verify_api_key` (X-API-Key) | Unitaires | Accès non autorisés |
| **Charge** | Requêtes concurrentes, timeout | Tests de charge (optionnel) | Dégradation sous charge |

**Note :** Le mode mock (`use_mock=True` en non-production) permet des tests sans modèles ML.

---

#### Priorité 3 — FRONTEND

| Flux | Description | Type de tests | Risques |
|------|-------------|---------------|---------|
| **Login / MFA** | Soumission formulaires, gestion erreurs, redirection | E2E ou tests composants | Connexion impossible |
| **Upload** | Soumission fichier, payload aligné avec le backend | Tests composants + mock API | Upload échoué |
| **Routes protégées** | Redirection si non authentifié | Tests de routing | Accès non autorisé |
| **Gestion erreurs** | Toast sur erreurs API | Tests composants | UX dégradée |
| **Dashboard / Documents** | Appels API, affichage données | Tests composants + mock | Données incorrectes |

---

## Ordre d’exécution

1. **Backend** → configurer Jest + Supertest, puis tests unitaires et d’intégration pour auth, RBAC, upload, health.
2. **AI-Service** → configurer PyTest + TestClient HTTP, puis tests pour health, endpoints IA, clé API.
3. **Frontend** → configurer Vitest + React Testing Library (ou Cypress pour E2E), puis tests pour formulaires et routes.

---

## Prochaines étapes (ÉTAPE 2)

- **Backend :**  
  - Installation de Jest, Supertest, ts-jest.  
  - Création des premiers tests pour :  
    - `auth.routes` (login, MFA verify, refresh).  
    - `authenticate` middleware.  
    - `documentUpload` (validation MIME, magic bytes).  
    - Health/santé des services (optionnel si dépendances externes).

- Fourniture des **commandes exactes** pour lancer les tests dans le terminal.

---

## Références utiles

- `backend/src/modules/auth/` — auth.service, auth.controller, auth.routes, auth.validation
- `backend/src/middlewares/authenticate.ts`, `authorize.ts`
- `backend/src/middlewares/uploadMiddleware.ts`
- `backend/src/config/database.ts`, `storage.ts`, `jwt.ts`
- `ai-service/main.py`, `api/routes.py`, `core/security.py`
- `frontend/` — à explorer pour formulaires et services API
