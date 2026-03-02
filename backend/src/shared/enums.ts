// enums.ts - énumérations partagées de l'application backend (stub)

// ─────────────────────────────────────────────
// HTTP Status Codes
// ─────────────────────────────────────────────
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// ─────────────────────────────────────────────
// Rôles utilisateurs (RBAC)
// Alignés strictement sur les rôles ministériels
// ─────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',           // Administrateur système (accès total)
  CADRE = 'CADRE',           // Cadre ministériel
  INSPECTEUR = 'INSPECTEUR', // Inspecteur pédagogique
  RH = 'RH',                 // Ressources humaines
  COMPTABLE = 'COMPTABLE',   // Service financier
  CONSULTANT = 'CONSULTANT', // Accès lecture seule
}

// ─────────────────────────────────────────────
// Statut des utilisateurs
// ─────────────────────────────────────────────
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

// ─────────────────────────────────────────────
// Catégories de documents ministériels
// ─────────────────────────────────────────────
export enum DocumentCategory {
  DECISION = 'DECISION',
  CIRCULAIRE = 'CIRCULAIRE',
  RAPPORT = 'RAPPORT',
  BUDGET = 'BUDGET',
  RH = 'RH',
  CORRESPONDANCE = 'CORRESPONDANCE',
  PROJET_PEDAGOGIQUE = 'PROJET_PEDAGOGIQUE',
  INSPECTION = 'INSPECTION',
  ARCHIVE = 'ARCHIVE',
  AUTRE = 'AUTRE',
}

// ─────────────────────────────────────────────
// Niveau de confidentialité
// ─────────────────────────────────────────────
export enum ConfidentialityLevel {
  PUBLIC = 'PUBLIC',
  INTERNE = 'INTERNE',
  CONFIDENTIEL = 'CONFIDENTIEL',
  SECRET = 'SECRET',
}

// ─────────────────────────────────────────────
// Statut des documents
// ─────────────────────────────────────────────
export enum DocumentStatus {
  BROUILLON = 'BROUILLON',
  EN_REVISION = 'EN_REVISION',
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  ARCHIVE = 'ARCHIVE',
}

// ─────────────────────────────────────────────
// Étapes du workflow de validation
// ─────────────────────────────────────────────
export enum WorkflowStep {
  SOUMISSION = 'SOUMISSION',
  REVISION = 'REVISION',
  VALIDATION_N1 = 'VALIDATION_N1',
  VALIDATION_N2 = 'VALIDATION_N2',
  APPROBATION = 'APPROBATION',
  PUBLICATION = 'PUBLICATION',
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum WorkflowAction {
  SOUMETTRE = 'SOUMETTRE',
  APPROUVER = 'APPROUVER',
  REJETER = 'REJETER',
  RETOURNER = 'RETOURNER',
  ARCHIVER = 'ARCHIVER',
}

// ─────────────────────────────────────────────
// Types d'actions pour les logs d'audit
// ─────────────────────────────────────────────
export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Documents
  DOC_CREATE = 'DOC_CREATE',
  DOC_READ = 'DOC_READ',
  DOC_UPDATE = 'DOC_UPDATE',
  DOC_DELETE = 'DOC_DELETE',
  DOC_UPLOAD = 'DOC_UPLOAD',
  DOC_DOWNLOAD = 'DOC_DOWNLOAD',
  DOC_SHARE = 'DOC_SHARE',

  // Workflow
  WORKFLOW_SUBMIT = 'WORKFLOW_SUBMIT',
  WORKFLOW_APPROVE = 'WORKFLOW_APPROVE',
  WORKFLOW_REJECT = 'WORKFLOW_REJECT',

  // Utilisateurs
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_SUSPEND = 'USER_SUSPEND',

  // Sécurité
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
}

// ─────────────────────────────────────────────
// Niveau de sévérité des anomalies
// ─────────────────────────────────────────────
export enum AnomalySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─────────────────────────────────────────────
// Types de notifications
// ─────────────────────────────────────────────
export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}