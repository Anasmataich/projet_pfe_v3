// version.service.ts - service de gestion des versions de documents

import db from '../../config/database';
import { AppError } from '../../shared/AppError';
import type { Document } from './document.model';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  storageKey: string;
  fileHash: string | null;
  createdBy: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

function mapRowToVersion(row: Record<string, unknown>): DocumentVersion {
  return {
    id: row['id'] as string,
    documentId: row['document_id'] as string,
    version: row['version'] as string,
    storageKey: row['storage_key'] as string,
    fileHash: (row['file_hash'] as string | null) ?? null,
    createdBy: row['created_by'] as string,
    createdAt: new Date(row['created_at'] as string),
  };
}

/**
 * Génère le numéro de version suivant (v1.0, v1.1, v2.0, ...)
 */
function getNextVersion(currentVersion: string): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)$/i);
  if (!match) return 'v1.0';
  const major = parseInt(match[1]!, 10);
  const minor = parseInt(match[2]!, 10);
  return `v${major}.${minor + 1}`;
}

export const versionService = {
  /**
   * Liste les versions d'un document
   */
  findByDocumentId: async (documentId: string): Promise<DocumentVersion[]> => {
    const result = await db.query(
      `SELECT id, document_id, version, storage_key, file_hash, created_by, created_at
       FROM document_versions WHERE document_id = $1 ORDER BY created_at DESC`,
      [documentId]
    );
    return result.rows.map(mapRowToVersion);
  },

  /**
   * Crée une nouvelle version lors d'un nouvel upload de fichier
   */
  createVersion: async (
    documentId: string,
    version: string,
    storageKey: string,
    fileHash: string,
    createdBy: string
  ): Promise<DocumentVersion> => {
    const result = await db.query(
      `INSERT INTO document_versions (document_id, version, storage_key, file_hash, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [documentId, version, storageKey, fileHash, createdBy]
    );
    return mapRowToVersion(result.rows[0]);
  },

  /**
   * Récupère le numéro de version suivant pour un document
   */
  getNextVersion: async (documentId: string): Promise<string> => {
    const docResult = await db.query<{ version: string }>(
      'SELECT version FROM documents WHERE id = $1',
      [documentId]
    );
    if (!docResult.rows[0]) throw AppError.notFound('Document');
    return getNextVersion(docResult.rows[0].version);
  },

  /**
   * Récupère une version spécifique
   */
  findById: async (id: string): Promise<DocumentVersion> => {
    const result = await db.query(
      'SELECT * FROM document_versions WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) throw AppError.notFound('Version');
    return mapRowToVersion(result.rows[0]);
  },
};
