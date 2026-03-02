# Politique d'Audit et de Journalisation

**Plateforme GED — DSI Ministère de l'Éducation Nationale du Maroc**
*Version 1.0 — Février 2026*

---

## 1. Objectif

Cette politique définit les règles de journalisation et d'audit
applicables à la Plateforme de Gestion Électronique de Documents (GED).
Elle garantit la **traçabilité**, la **conformité réglementaire** et
la **détection des incidents de sécurité**.

---

## 2. Périmètre

| Composant         | Couvert | Mécanisme                                 |
|-------------------|---------|-------------------------------------------|
| Backend API       | ✅       | `auditLogger.ts` middleware + `createAuditLog()` |
| Authentification  | ✅       | Logs dans `auth.service.ts`               |
| Documents         | ✅       | Logs dans `document.service.ts`           |
| Workflow          | ✅       | Logs dans `workflow.service.ts`           |
| Utilisateurs      | ✅       | Logs dans `user.routes.ts` via middleware |
| AI-Service        | ✅       | Logging Loguru dans `ai_pipeline.py`      |
| Frontend          | ⬜       | À implémenter (analytics côté client)     |

---

## 3. Actions Auditées

### 3.1 Authentification & Accès

| Code Audit          | Description                           | Sévérité  |
|---------------------|---------------------------------------|-----------|
| `LOGIN`             | Connexion réussie                     | INFO      |
| `LOGOUT`            | Déconnexion                           | INFO      |
| `LOGIN_FAILED`      | Tentative de connexion échouée        | WARNING   |
| `MFA_VERIFIED`      | Code MFA vérifié avec succès          | INFO      |
| `PASSWORD_RESET`    | Réinitialisation de mot de passe      | WARNING   |
| `UNAUTHORIZED_ACCESS` | Accès non autorisé détecté          | CRITICAL  |
| `PERMISSION_DENIED` | Permission insuffisante               | WARNING   |

### 3.2 Gestion des Documents

| Code Audit       | Description                              | Sévérité  |
|------------------|------------------------------------------|-----------|
| `DOC_CREATE`     | Création d'un document                   | INFO      |
| `DOC_READ`       | Consultation d'un document               | DEBUG     |
| `DOC_UPDATE`     | Modification de métadonnées              | INFO      |
| `DOC_DELETE`     | Suppression (soft delete)                | WARNING   |
| `DOC_UPLOAD`     | Upload d'un fichier                      | INFO      |
| `DOC_DOWNLOAD`   | Téléchargement d'un document             | INFO      |
| `DOC_SHARE`      | Partage d'un document                    | INFO      |

### 3.3 Workflow

| Code Audit          | Description                          | Sévérité  |
|---------------------|--------------------------------------|-----------|
| `WORKFLOW_SUBMIT`   | Soumission pour validation           | INFO      |
| `WORKFLOW_APPROVE`  | Approbation d'un document            | INFO      |
| `WORKFLOW_REJECT`   | Rejet d'un document                  | INFO      |

### 3.4 Administration

| Code Audit       | Description                              | Sévérité  |
|------------------|------------------------------------------|-----------|
| `USER_CREATE`    | Création d'un compte utilisateur         | INFO      |
| `USER_UPDATE`    | Modification de profil/rôle              | INFO      |
| `USER_DELETE`    | Suppression d'un compte                  | WARNING   |
| `USER_SUSPEND`   | Suspension d'un compte                   | WARNING   |

### 3.5 Sécurité & IA

| Code Audit          | Description                          | Sévérité  |
|---------------------|--------------------------------------|-----------|
| `ANOMALY_DETECTED`  | Anomalie détectée par l'IA           | HIGH      |

---

## 4. Structure d'un Log d'Audit

Chaque entrée est stockée dans la table `audit_logs` (PostgreSQL) :

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),    -- Utilisateur concerné (nullable pour les actions anonymes)
  action        audit_action NOT NULL,         -- Code d'action (enum PostgreSQL)
  resource_type VARCHAR(100),                  -- Type de ressource (document, user, workflow…)
  resource_id   UUID,                          -- ID de la ressource concernée
  ip_address    VARCHAR(45),                   -- Adresse IP source (IPv4/IPv6)
  user_agent    TEXT,                          -- User-Agent du navigateur
  details       JSONB DEFAULT '{}',            -- Détails supplémentaires (flexible)
  success       BOOLEAN DEFAULT TRUE,          -- Succès ou échec de l'action
  created_at    TIMESTAMPTZ DEFAULT NOW()      -- Horodatage
);
```

### 4.1 Champ `details` (JSONB)

Le champ `details` contient des informations contextuelles variables :

```json
{
  "method": "POST",
  "url": "/api/v1/documents",
  "statusCode": 201,
  "email": "user@ged.gov.ma",
  "reason": "wrong_password",
  "workflowId": "uuid-xxx",
  "event": "mfa_enabled"
}
```

---

## 5. Implémentation Technique

### 5.1 Middleware `auditLogger`

Le middleware `auditLogger.ts` intercepte automatiquement les
réponses HTTP et enregistre un log avec :

- **userId** : extrait de `req.user` (JWT décodé)
- **action** : passé en paramètre du middleware
- **ipAddress** : `req.ip` ou `req.socket.remoteAddress`
- **userAgent** : header `User-Agent`
- **success** : déterminé par le code HTTP (2xx = succès)

```typescript
// Exemple d'utilisation dans les routes
router.post('/',
  authenticate,
  requirePermission(Permission.DOC_UPLOAD),
  auditLogger(AuditAction.DOC_UPLOAD, 'document'),
  documentController.upload
);
```

### 5.2 Fonction `createAuditLog`

Pour les actions métier complexes (login, MFA, workflow), la
fonction `createAuditLog()` est appelée directement dans les
services :

```typescript
await createAuditLog({
  userId: user.id,
  action: AuditAction.LOGIN,
  ipAddress,
  details: { email },
  success: true,
});
```

### 5.3 Résilience

Les erreurs d'écriture dans les logs d'audit **ne bloquent jamais**
l'opération principale. Le `catch` dans `createAuditLog()` :
- Log l'erreur dans la console (via `logger.error`)
- Ne propage pas l'exception au caller

---

## 6. Rétention & Archivage

| Type de log         | Durée de rétention | Action après expiration |
|---------------------|-------------------|------------------------|
| Logs de sécurité    | 5 ans             | Archivage chiffré      |
| Logs d'accès        | 2 ans             | Suppression            |
| Logs d'audit métier | 3 ans             | Archivage              |
| Notifications       | 30 jours (lues)   | Suppression auto       |

Un job planifié (pg_cron) peut être configuré pour la purge automatique :

```sql
SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0',
  $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years'$$
);
```

---

## 7. Accès aux Logs d'Audit

### 7.1 API REST

| Endpoint                | Accès        | Description                          |
|-------------------------|-------------|--------------------------------------|
| `GET /api/v1/audit`     | `AUDIT_READ` | Lister les logs (paginé, filtrable)  |
| `GET /api/v1/audit/:id` | `AUDIT_READ` | Détail d'un log                      |
| `GET /api/v1/audit/summary` | `ADMIN`  | Résumé statistique par action        |

### 7.2 Filtres disponibles

- `userId` — Filtrer par utilisateur
- `action` — Filtrer par type d'action
- `resourceType` — Filtrer par type de ressource
- `resourceId` — Filtrer par ressource spécifique
- `success` — `true` / `false`
- `dateFrom` / `dateTo` — Plage de dates

---

## 8. Alertes de Sécurité

Les événements suivants déclenchent des alertes immédiates :

| Événement                              | Action                     |
|----------------------------------------|----------------------------|
| 5+ tentatives de login échouées        | Verrouillage du compte (30 min) |
| Accès non autorisé (`UNAUTHORIZED_ACCESS`) | Notification admin       |
| Anomalie IA détectée (`ANOMALY_DETECTED`)  | Log critique + notification |
| Élévation de privilèges suspecte       | Notification admin         |

---

## 9. Conformité

Cette politique est alignée sur :

- **RGPD** (Règlement Général sur la Protection des Données)
- **Loi 09-08** (Protection des données personnelles au Maroc)
- **ISO 27001** (Gestion de la sécurité de l'information)
- **OWASP Logging Cheat Sheet**

---

## 10. Révision

Cette politique est révisée :
- **Annuellement** par le RSSI
- **À chaque incident de sécurité** majeur
- **Lors de changements architecturaux** significatifs

| Version | Date       | Auteur   | Changements                 |
|---------|------------|----------|-----------------------------|
| 1.0     | 2026-02    | DSI      | Version initiale            |
