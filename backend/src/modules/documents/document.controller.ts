// document.controller.ts - contrôleur des documents

import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/ApiResponse';
import { documentService } from './document.service';
import type { DocumentUpdate } from './document.model';
import { HttpStatus } from '../../shared/enums';
import { DocumentCategory, ConfidentialityLevel, DocumentStatus } from '../../shared/enums';

const parseQueryInt = (val: unknown, defaultVal: number): number => {
  if (val == null) return defaultVal;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? defaultVal : Math.max(1, n);
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const page = parseQueryInt(req.query['page'], 1);
  const limit = Math.min(parseQueryInt(req.query['limit'], 20), 100);
  const filters = {
    category: req.query['category'] as string | undefined,
    status: req.query['status'] as string | undefined,
    confidentialityLevel: req.query['confidentialityLevel'] as string | undefined,
    search: req.query['search'] as string | undefined,
    uploadedBy: req.query['uploadedBy'] as string | undefined,
  };

  const { documents, pagination } = await documentService.findAll(page, limit, filters, userId, userRole);
  ApiResponse.paginated(res, documents, { page, limit, total: pagination.total });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const doc = await documentService.findById(req.params['id']!, userId, userRole);
  ApiResponse.success(res, doc);
};

export const upload = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      ApiResponse.error(res, 'Fichier requis', HttpStatus.BAD_REQUEST);
      return;
    }



    const body = req.body as { title?: string; description?: string; category?: string; confidentialityLevel?: string; tags?: string };
    if (!body.title || !body.category || !body.confidentialityLevel) {
      ApiResponse.error(res, 'title, category et confidentialityLevel requis', HttpStatus.BAD_REQUEST);
      return;
    }

    const category = body.category as DocumentCategory;
    const confidentialityLevel = body.confidentialityLevel as ConfidentialityLevel;
    if (!Object.values(DocumentCategory).includes(category) || !Object.values(ConfidentialityLevel).includes(confidentialityLevel)) {
      ApiResponse.error(res, 'category ou confidentialityLevel invalide', HttpStatus.BAD_REQUEST);
      return;
    }

    const tags = body.tags ? (Array.isArray(body.tags) ? body.tags : JSON.parse(body.tags || '[]')) : [];
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const doc = await documentService.upload(
      file,
      {
        title: body.title,
        description: body.description ?? null,
        category,
        confidentialityLevel,
        tags,
      },
      req.user!.userId,
      ipAddress
    );
    ApiResponse.created(res, doc);
  } catch (error) {

    throw error;
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const data: DocumentUpdate = {};
  if (body.title != null) data.title = body.title as string;
  if (body.description !== undefined) data.description = body.description as string | null;
  if (body.category != null) data.category = body.category as DocumentCategory;
  if (body.confidentialityLevel != null) data.confidentialityLevel = body.confidentialityLevel as ConfidentialityLevel;
  if (body.tags != null) data.tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  if (body.status != null) data.status = body.status as DocumentStatus;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const doc = await documentService.update(req.params['id']!, data, req.user!.userId, ipAddress);
  ApiResponse.success(res, doc, 'Document mis à jour');
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await documentService.delete(req.params['id']!, req.user!.userId, ipAddress);
  ApiResponse.noContent(res);
};

export const listVersions = async (req: Request, res: Response): Promise<void> => {
  const { versionService } = await import('./version.service');
  const versions = await versionService.findByDocumentId(req.params['id']!);
  ApiResponse.success(res, versions, 'Versions du document');
};

export const getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const url = await documentService.getDownloadUrl(req.params['id']!, userId, userRole);
  ApiResponse.success(res, { url }, 'URL de téléchargement générée');
};
