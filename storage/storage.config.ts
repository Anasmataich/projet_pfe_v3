/**
 * storage.config.ts — Configuration globale du stockage sécurisé.
 *
 * Définit les politiques de stockage, les limites de fichiers,
 * les règles de chiffrement au repos, la gestion de versions
 * et le contrôle d'accès RBAC appliqué au niveau stockage.
 *
 * Ce fichier est consommé par le backend (mirrored dans
 * backend/src/config/storage.ts) et sert de référence centrale.
 *
 * @module storage/config
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StorageConfig {
  provider: 'minio' | 's3';
  bucket: string;
  region: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  encryption: EncryptionConfig;
  versioning: VersioningConfig;
  retention: RetentionConfig;
  rbac: StorageRbacConfig;
  paths: StoragePathConfig;
}

export interface EncryptionConfig {
  atRest: boolean;
  algorithm: 'AES256' | 'aws:kms';
  serverSideEncryption: boolean;
  clientSideEncryption: boolean;
  clientAlgorithm: 'aes-256-gcm';
  keyDerivation: 'env' | 'kms';
}

export interface VersioningConfig {
  enabled: boolean;
  maxVersions: number;
  keepDeletedVersions: boolean;
  deleteRetentionDays: number;
}

export interface RetentionConfig {
  enabled: boolean;
  defaultDays: number;
  auditLogDays: number;
  tempFileTTLHours: number;
}

export interface StorageRbacConfig {
  enforceAtStorageLevel: boolean;
  roles: Record<string, StoragePermissions>;
}

export interface StoragePermissions {
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canListAll: boolean;
  maxUploadSizeMB: number;
  allowedCategories: string[] | '*';
  confidentialityLevels: string[];
}

export interface StoragePathConfig {
  documents: string;
  versions: string;
  temp: string;
  exports: string;
}

// ─────────────────────────────────────────────
// Allowed MIME types and signatures
// ─────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
] as const;

export const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.vbs', '.js', '.msi',
  '.ps1', '.sh', '.dll', '.sys', '.scr', '.pif', '.hta',
  '.cpl', '.msp', '.mst', '.wsf', '.wsh', '.ws',
]);

export const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf':  [0x25, 0x50, 0x44, 0x46],
  'image/png':        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/jpeg':       [0xFF, 0xD8, 0xFF],
  'image/gif':        [0x47, 0x49, 0x46, 0x38],
  'application/zip':  [0x50, 0x4B, 0x03, 0x04],
  'application/ole2': [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],
};

// ─────────────────────────────────────────────
// Storage configuration
// ─────────────────────────────────────────────

export const storageConfig: StorageConfig = {
  provider: 'minio',
  bucket: 'ged-documents',
  region: 'us-east-1',
  maxFileSize: 50 * 1024 * 1024, // 50 MB

  allowedMimeTypes: [...ALLOWED_MIME_TYPES],

  encryption: {
    atRest: true,
    algorithm: 'AES256',
    serverSideEncryption: true,
    clientSideEncryption: false,
    clientAlgorithm: 'aes-256-gcm',
    keyDerivation: 'env',
  },

  versioning: {
    enabled: true,
    maxVersions: 10,
    keepDeletedVersions: true,
    deleteRetentionDays: 90,
  },

  retention: {
    enabled: true,
    defaultDays: 365 * 5,     // 5 ans
    auditLogDays: 365 * 7,    // 7 ans (conformité)
    tempFileTTLHours: 24,
  },

  rbac: {
    enforceAtStorageLevel: true,
    roles: {
      ADMIN: {
        canUpload: true,
        canDownload: true,
        canDelete: true,
        canListAll: true,
        maxUploadSizeMB: 50,
        allowedCategories: '*',
        confidentialityLevels: ['PUBLIC', 'INTERNE', 'CONFIDENTIEL', 'SECRET'],
      },
      CADRE: {
        canUpload: true,
        canDownload: true,
        canDelete: false,
        canListAll: false,
        maxUploadSizeMB: 50,
        allowedCategories: '*',
        confidentialityLevels: ['PUBLIC', 'INTERNE', 'CONFIDENTIEL'],
      },
      INSPECTEUR: {
        canUpload: true,
        canDownload: true,
        canDelete: false,
        canListAll: false,
        maxUploadSizeMB: 30,
        allowedCategories: ['RAPPORT_INSPECTION', 'NOTE_SERVICE', 'CORRESPONDANCE'],
        confidentialityLevels: ['PUBLIC', 'INTERNE', 'CONFIDENTIEL'],
      },
      RH: {
        canUpload: true,
        canDownload: true,
        canDelete: false,
        canListAll: false,
        maxUploadSizeMB: 30,
        allowedCategories: ['DECISION', 'ATTESTATION', 'CORRESPONDANCE'],
        confidentialityLevels: ['PUBLIC', 'INTERNE', 'CONFIDENTIEL'],
      },
      COMPTABLE: {
        canUpload: true,
        canDownload: true,
        canDelete: false,
        canListAll: false,
        maxUploadSizeMB: 20,
        allowedCategories: ['FACTURE', 'BON_COMMANDE', 'BUDGET'],
        confidentialityLevels: ['PUBLIC', 'INTERNE'],
      },
      CONSULTANT: {
        canUpload: false,
        canDownload: true,
        canDelete: false,
        canListAll: false,
        maxUploadSizeMB: 0,
        allowedCategories: '*',
        confidentialityLevels: ['PUBLIC'],
      },
    },
  },

  paths: {
    documents: 'documents/{userId}/{documentId}/{version}',
    versions:  'documents/{userId}/{documentId}',
    temp:      'temp/{sessionId}',
    exports:   'exports/{userId}/{timestamp}',
  },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Build the full storage key for a document file.
 */
export function buildDocumentKey(
  userId: string,
  documentId: string,
  version: string,
  filename: string,
): string {
  return `documents/${userId}/${documentId}/${version}/${sanitizeFilename(filename)}`;
}

/**
 * Build the prefix to list all versions of a document.
 */
export function buildVersionPrefix(userId: string, documentId: string): string {
  return `documents/${userId}/${documentId}/`;
}

/**
 * Validate a file before upload. Returns null if valid, error message otherwise.
 */
export function validateFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  role: string,
): string | null {
  const ext = filename.lastIndexOf('.') >= 0
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : '';

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return `Extension de fichier interdite : ${ext}`;
  }

  if (!storageConfig.allowedMimeTypes.includes(mimeType)) {
    return `Type MIME non autorisé : ${mimeType}`;
  }

  if (sizeBytes > storageConfig.maxFileSize) {
    return `Fichier trop volumineux (${(sizeBytes / 1024 / 1024).toFixed(1)} MB > ${storageConfig.maxFileSize / 1024 / 1024} MB)`;
  }

  const perms = storageConfig.rbac.roles[role];
  if (!perms) {
    return `Rôle inconnu : ${role}`;
  }

  if (!perms.canUpload) {
    return 'Votre rôle ne permet pas l\'upload de fichiers';
  }

  const maxRoleSize = perms.maxUploadSizeMB * 1024 * 1024;
  if (sizeBytes > maxRoleSize) {
    return `Fichier trop volumineux pour votre rôle (max ${perms.maxUploadSizeMB} MB)`;
  }

  return null;
}

/**
 * Check if a role can access a document with the given confidentiality level.
 */
export function canAccessConfidentiality(
  role: string,
  confidentialityLevel: string,
): boolean {
  const perms = storageConfig.rbac.roles[role];
  if (!perms) return false;
  return perms.confidentialityLevels.includes(confidentialityLevel);
}

/**
 * Check if a role can access a document category.
 */
export function canAccessCategory(
  role: string,
  category: string,
): boolean {
  const perms = storageConfig.rbac.roles[role];
  if (!perms) return false;
  if (perms.allowedCategories === '*') return true;
  return perms.allowedCategories.includes(category);
}

/**
 * Sanitize a filename by removing dangerous characters.
 */
function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'unnamed';
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255) || 'unnamed';
}

export default storageConfig;
