# Modèle de Données — Plateforme GED

**PostgreSQL 16 · Extensions : uuid-ossp, pgcrypto**

---

## Diagramme relationnel

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│    users     │       │    documents     │       │ document_versions │
├──────────────┤       ├──────────────────┤       ├───────────────────┤
│ id (PK)      │◄──┐   │ id (PK)          │◄──┐   │ id (PK)           │
│ email        │   │   │ title            │   │   │ document_id (FK)  │──►documents
│ password_hash│   │   │ category         │   │   │ version_number    │
│ role         │   │   │ confidentiality  │   │   │ file_name         │
│ status       │   │   │ status           │   │   │ storage_key       │
│ mfa_enabled  │   │   │ uploaded_by (FK) │───┘   │ uploaded_by (FK)  │──►users
│ mfa_secret   │   │   │ storage_key      │       │ file_size         │
│ first_name   │   │   │ file_name        │       │ checksum          │
│ last_name    │   │   │ file_size        │       │ change_note       │
│ failed_login │   │   │ mime_type        │       └───────────────────┘
│ locked_until │   │   │ current_version  │
│ created_at   │   │   │ tags[]           │       ┌───────────────────┐
│ updated_at   │   │   │ checksum         │       │workflow_instances │
└──────────────┘   │   │ created_at       │       ├───────────────────┤
                   │   │ updated_at       │       │ id (PK)           │
                   │   └──────────────────┘       │ document_id (FK)  │──►documents
                   │                              │ initiated_by (FK) │──►users
                   │   ┌──────────────────┐       │ current_step      │
                   │   │   audit_logs     │       │ status            │
                   │   ├──────────────────┤       │ assigned_to (FK)  │──►users
                   │   │ id (PK)          │       │ created_at        │
                   └───│ user_id (FK)     │       │ updated_at        │
                       │ action           │       └───────────────────┘
                       │ resource_type    │
                       │ resource_id      │       ┌───────────────────┐
                       │ ip_address       │       │workflow_comments  │
                       │ user_agent       │       ├───────────────────┤
                       │ details (JSONB)  │       │ id (PK)           │
                       │ success          │       │ workflow_id (FK)  │──►workflow_instances
                       │ created_at       │       │ user_id (FK)      │──►users
                       └──────────────────┘       │ comment           │
                                                  │ step              │
                                                  │ action            │
                                                  │ created_at        │
                                                  └───────────────────┘
```

## Types énumérés

### `user_role`
```sql
ENUM ('ADMIN', 'CADRE', 'INSPECTEUR', 'RH', 'COMPTABLE', 'CONSULTANT')
```

### `user_status`
```sql
ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED')
```

### `document_category`
```sql
ENUM ('NOTE_SERVICE', 'RAPPORT_INSPECTION', 'DECISION', 'CIRCULAIRE',
      'CORRESPONDANCE', 'PROCES_VERBAL', 'BUDGET', 'FACTURE',
      'BON_COMMANDE', 'ATTESTATION', 'AUTRE')
```

### `confidentiality_level`
```sql
ENUM ('PUBLIC', 'INTERNE', 'CONFIDENTIEL', 'SECRET')
```

### `document_status`
```sql
ENUM ('BROUILLON', 'EN_ATTENTE', 'APPROUVE', 'REJETE', 'ARCHIVE')
```

### `workflow_step`
```sql
ENUM ('SOUMISSION', 'REVISION', 'VALIDATION_CHEF', 'VALIDATION_DIRECTEUR', 'APPROUVE', 'REJETE')
```

### `workflow_status`
```sql
ENUM ('EN_COURS', 'APPROUVE', 'REJETE', 'ANNULE')
```

### `audit_action`
```sql
ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_VERIFIED', 'PASSWORD_RESET',
      'DOC_CREATE', 'DOC_READ', 'DOC_UPDATE', 'DOC_DELETE', 'DOC_UPLOAD',
      'DOC_DOWNLOAD', 'DOC_SHARE', 'WORKFLOW_SUBMIT', 'WORKFLOW_APPROVE',
      'WORKFLOW_REJECT', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
      'USER_SUSPEND', 'UNAUTHORIZED_ACCESS')
```

## Tables détaillées

### `users`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email de connexion |
| password_hash | VARCHAR(255) | NOT NULL | Hash bcrypt (cost 12) |
| role | user_role | NOT NULL, DEFAULT 'CONSULTANT' | Rôle RBAC |
| status | user_status | NOT NULL, DEFAULT 'ACTIVE' | État du compte |
| first_name | VARCHAR(100) | | Prénom |
| last_name | VARCHAR(100) | | Nom de famille |
| mfa_enabled | BOOLEAN | DEFAULT FALSE | MFA activé |
| mfa_secret | VARCHAR(255) | | Secret TOTP (chiffré) |
| failed_login_attempts | INTEGER | DEFAULT 0 | Compteur d'échecs |
| locked_until | TIMESTAMPTZ | | Verrouillage temporaire |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Dernière modification |

**Index** : `idx_users_email` (UNIQUE), `idx_users_role`, `idx_users_status`

### `documents`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| title | VARCHAR(500) | NOT NULL | Titre du document |
| description | TEXT | | Description libre |
| category | document_category | NOT NULL | Catégorie ministérielle |
| confidentiality | confidentiality_level | DEFAULT 'INTERNE' | Niveau de confidentialité |
| status | document_status | DEFAULT 'BROUILLON' | État courant |
| uploaded_by | UUID | FK → users(id) | Auteur de l'upload |
| file_name | VARCHAR(500) | NOT NULL | Nom original du fichier |
| file_size | BIGINT | NOT NULL | Taille en octets |
| mime_type | VARCHAR(100) | NOT NULL | Type MIME |
| storage_key | VARCHAR(1000) | NOT NULL | Clé S3/MinIO |
| current_version | INTEGER | DEFAULT 1 | Version courante |
| tags | TEXT[] | | Tags libres (array PostgreSQL) |
| checksum | VARCHAR(64) | | SHA-256 du fichier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Dernière modification |

**Index** : `idx_documents_uploaded_by`, `idx_documents_category`, `idx_documents_status`, GIN sur `tags` et `to_tsvector(title || description)`

### `audit_logs`

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| user_id | UUID | FK → users(id) | Utilisateur (nullable si anonyme) |
| action | audit_action | NOT NULL | Type d'action |
| resource_type | VARCHAR(50) | | Type de ressource concernée |
| resource_id | UUID | | ID de la ressource |
| ip_address | INET | NOT NULL | Adresse IP |
| user_agent | TEXT | | User-Agent du navigateur |
| details | JSONB | DEFAULT '{}' | Détails libres (champs sensibles rédigés) |
| success | BOOLEAN | NOT NULL | Succès ou échec |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Horodatage |

**Index** : `idx_audit_user_id`, `idx_audit_action`, `idx_audit_created_at`

## Sécurité du modèle

- **Mots de passe** : jamais stockés en clair, uniquement hash bcrypt (cost 12)
- **Secret MFA** : chiffré avec AES-256-GCM avant stockage
- **Audit details** : les champs sensibles (password, token) sont remplacés par `[REDACTED]`
- **IP addresses** : stockées en type `INET` pour validation native PostgreSQL
- **JSONB details** : pas de données personnelles non nécessaires
- **Rétention** : audit logs conservés 7 ans (conformité RGPD/Loi 09-08)
