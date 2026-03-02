// document.validation.ts - schémas de validation pour les documents

import { AppError } from '../../shared/AppError';
import { HttpStatus, DocumentCategory, ConfidentialityLevel, DocumentStatus } from '../../shared/enums';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DocumentUploadInput {
  title: string;
  description?: string | null;
  category: DocumentCategory;
  confidentialityLevel: ConfidentialityLevel;
  tags: string[];
}

export interface DocumentUpdateInput {
  title?: string;
  description?: string | null;
  category?: DocumentCategory;
  confidentialityLevel?: ConfidentialityLevel;
  tags?: string[];
  status?: DocumentStatus;
}

export interface DocumentFilterInput {
  page: number;
  limit: number;
  category?: string;
  status?: string;
  confidentialityLevel?: string;
  search?: string;
  uploadedBy?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// Validation functions
// ─────────────────────────────────────────────

export function validateDocumentUploadInput(body: Record<string, unknown>): DocumentUploadInput {
  const errors: string[] = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('title est requis');
  }
  if (body.title && typeof body.title === 'string' && body.title.trim().length > 500) {
    errors.push('title ne peut pas dépasser 500 caractères');
  }

  if (!body.category || !Object.values(DocumentCategory).includes(body.category as DocumentCategory)) {
    errors.push(`category invalide. Valeurs acceptées : ${Object.values(DocumentCategory).join(', ')}`);
  }

  if (!body.confidentialityLevel || !Object.values(ConfidentialityLevel).includes(body.confidentialityLevel as ConfidentialityLevel)) {
    errors.push(`confidentialityLevel invalide. Valeurs acceptées : ${Object.values(ConfidentialityLevel).join(', ')}`);
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(' | '), HttpStatus.BAD_REQUEST, errors);
  }

  return {
    title: (body.title as string).trim(),
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    category: body.category as DocumentCategory,
    confidentialityLevel: body.confidentialityLevel as ConfidentialityLevel,
    tags: parseTags(body.tags),
  };
}

export function validateDocumentUpdateInput(body: Record<string, unknown>): DocumentUpdateInput {
  const result: DocumentUpdateInput = {};
  const errors: string[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('title doit être une chaîne non vide');
    } else if (body.title.trim().length > 500) {
      errors.push('title ne peut pas dépasser 500 caractères');
    } else {
      result.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    result.description = body.description === null ? null : String(body.description).trim() || null;
  }

  if (body.category !== undefined) {
    if (!Object.values(DocumentCategory).includes(body.category as DocumentCategory)) {
      errors.push(`category invalide. Valeurs acceptées : ${Object.values(DocumentCategory).join(', ')}`);
    } else {
      result.category = body.category as DocumentCategory;
    }
  }

  if (body.confidentialityLevel !== undefined) {
    if (!Object.values(ConfidentialityLevel).includes(body.confidentialityLevel as ConfidentialityLevel)) {
      errors.push(`confidentialityLevel invalide. Valeurs acceptées : ${Object.values(ConfidentialityLevel).join(', ')}`);
    } else {
      result.confidentialityLevel = body.confidentialityLevel as ConfidentialityLevel;
    }
  }

  if (body.status !== undefined) {
    if (!Object.values(DocumentStatus).includes(body.status as DocumentStatus)) {
      errors.push(`status invalide. Valeurs acceptées : ${Object.values(DocumentStatus).join(', ')}`);
    } else {
      result.status = body.status as DocumentStatus;
    }
  }

  if (body.tags !== undefined) {
    result.tags = parseTags(body.tags);
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(' | '), HttpStatus.BAD_REQUEST, errors);
  }
  if (Object.keys(result).length === 0) {
    throw new AppError('Aucune donnée valide à mettre à jour', HttpStatus.BAD_REQUEST);
  }

  return result;
}

export function validateDocumentFilters(query: Record<string, unknown>): DocumentFilterInput {
  const page = Math.max(1, parseInt(String(query['page'] ?? 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? 20), 10) || 20));

  return {
    page,
    limit,
    category: typeof query['category'] === 'string' ? query['category'] : undefined,
    status: typeof query['status'] === 'string' ? query['status'] : undefined,
    confidentialityLevel: typeof query['confidentialityLevel'] === 'string' ? query['confidentialityLevel'] : undefined,
    search: typeof query['search'] === 'string' ? query['search'] : undefined,
    uploadedBy: typeof query['uploadedBy'] === 'string' ? query['uploadedBy'] : undefined,
  };
}
