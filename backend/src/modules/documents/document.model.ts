// document.model.ts - modèle de document

import { DocumentCategory, ConfidentialityLevel, DocumentStatus } from '../../shared/enums';

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  confidentialityLevel: ConfidentialityLevel;
  status: DocumentStatus;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  version: string;
  tags: string[];
  aiSummary: string | null;
  aiCategory: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DocumentCreate {
  title: string;
  description?: string | null;
  category: DocumentCategory;
  confidentialityLevel: ConfidentialityLevel;
  storageKey?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  fileHash?: string;
  tags?: string[];
}

export interface DocumentUpdate {
  title?: string;
  description?: string | null;
  category?: DocumentCategory;
  confidentialityLevel?: ConfidentialityLevel;
  tags?: string[];
  status?: DocumentStatus;
}

// ─────────────────────────────────────────────
// Mapping BDD → Document
// ─────────────────────────────────────────────

export function mapRowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row['id'] as string,
    title: row['title'] as string,
    description: (row['description'] as string | null) ?? null,
    category: row['category'] as DocumentCategory,
    confidentialityLevel: row['confidentiality_level'] as ConfidentialityLevel,
    status: row['status'] as DocumentStatus,
    storageKey: row['storage_key'] as string,
    originalFilename: row['original_filename'] as string,
    mimeType: row['mime_type'] as string,
    fileSize: Number(row['file_size']),
    fileHash: row['file_hash'] as string,
    version: (row['version'] as string) ?? 'v1.0',
    tags: Array.isArray(row['tags']) ? (row['tags'] as string[]) : JSON.parse((row['tags'] as string) ?? '[]'),
    aiSummary: (row['ai_summary'] as string | null) ?? null,
    aiCategory: (row['ai_category'] as string | null) ?? null,
    uploadedBy: row['uploaded_by'] as string,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
    deletedAt: row['deleted_at'] ? new Date(row['deleted_at'] as string) : null,
  };
}
