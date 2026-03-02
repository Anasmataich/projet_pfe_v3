// document.service.ts - service de gestion des documents

import db from '../../config/database';
import { createAuditLog } from '../../middlewares/auditLogger';
import { AuditAction } from '../../shared/enums';
import { storageService } from '../../config/storage';
import { encrypt } from '../../utils/encryption';
import { hashFile, generateUUID, sanitizeFilename as sanitize } from '../../utils/encryption';
import { Document, DocumentCreate, DocumentUpdate, mapRowToDocument } from './document.model';
import { AppError } from '../../shared/AppError';
import { DocumentStatus, ConfidentialityLevel } from '../../shared/enums';
import { buildPagination, PaginationMeta } from '../../shared/ApiResponse';
import logger from '../../utils/logger';
import env from '../../config/env';
import axios from 'axios';

export const documentService = {
  /**
   * Uploader et enregistrer un document
   */
  upload: async (
    file: Express.Multer.File,
    data: Omit<DocumentCreate, 'storageKey' | 'originalFilename' | 'mimeType' | 'fileSize' | 'fileHash'>,
    userId: string,
    ipAddress = 'unknown'
  ): Promise<Document> => {
    logger.info(`[Documents:Upload] Début — fichier: "${file.originalname}", taille: ${file.size}, mime: ${file.mimetype}, user: ${userId}`);

    let documentId: string;
    let storageKey: string;
    let fileHash: string;

    try {
      // 1. Calculer le hash du fichier (intégrité)
      fileHash = hashFile(file.buffer);
      logger.info(`[Documents:Upload] Step 1 — Hash SHA-256 calculé: ${fileHash.substring(0, 16)}…`);

      // 2. Chiffrer le fichier (AES-256)
      const encryptedData = encrypt(file.buffer.toString('base64'));
      const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData));
      logger.info(`[Documents:Upload] Step 2 — Fichier chiffré (AES-256-GCM), taille chiffrée: ${encryptedBuffer.length}`);

      // 3. Construire la clé de stockage
      documentId = generateUUID();
      const safeFilename = sanitize(file.originalname);
      storageKey = storageService.buildDocumentKey(userId, documentId, 'v1.0', safeFilename);
      logger.info(`[Documents:Upload] Step 3 — Clé de stockage: ${storageKey}`);

      // 4. Uploader vers MinIO
      logger.info(`[Documents:Upload] Step 4 — Upload vers MinIO en cours…`);
      await storageService.uploadFile(storageKey, encryptedBuffer, file.mimetype, {
        uploadedBy: userId,
        originalFilename: file.originalname,
      });
      logger.info(`[Documents:Upload] Step 4 — Upload MinIO réussi ✓`);
    } catch (err) {
      const error = err as Error & { code?: string; $metadata?: unknown };
      logger.error(`[Documents:Upload] ERREUR lors de l'upload vers MinIO — message: ${error.message}`);
      logger.error(`[Documents:Upload] Code erreur S3: ${error.code ?? 'N/A'}`);
      logger.error(`[Documents:Upload] Stack: ${error.stack}`);

      throw AppError.internal(`Impossible d'uploader le fichier : ${error.message}`);
    }

    try {
      // 5. Enregistrer en base de données
      logger.info(`[Documents:Upload] Step 5 — Insertion en BDD…`);
      const result = await db.query(
        `INSERT INTO documents 
         (id, title, description, category, confidentiality_level, status, storage_key,
          original_filename, mime_type, file_size, file_hash, version, tags, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          documentId, data.title, data.description ?? null, data.category,
          data.confidentialityLevel, DocumentStatus.BROUILLON, storageKey,
          file.originalname, file.mimetype, file.size, fileHash,
          'v1.0', data.tags ?? [], userId,
        ]
      );

      const document = mapRowToDocument(result.rows[0]);
      logger.info(`[Documents:Upload] Step 5 — Document inséré en BDD ✓ (id: ${documentId})`);

      // 6. Audit
      await createAuditLog({
        userId,
        action: AuditAction.DOC_UPLOAD,
        resourceType: 'document',
        resourceId: documentId,
        ipAddress,
        details: { title: data.title, storageKey },
        success: true,
      });

      // 7. Déclencher l'analyse IA en arrière-plan (async)
      void documentService.triggerAIAnalysis(documentId, storageKey);

      logger.info(`[Documents:Upload] Document uploadé avec succès : ${documentId} par ${userId}`);
      return document;
    } catch (err) {
      const error = err as Error;
      logger.error(`[Documents:Upload] ERREUR lors de l'insertion en BDD — message: ${error.message}`);
      logger.error(`[Documents:Upload] Stack: ${error.stack}`);

      throw AppError.internal(`Erreur lors de l'enregistrement du document : ${error.message}`);
    }
  },

  /**
   * Récupérer un document par ID (avec vérification des droits)
   */
  findById: async (id: string, userId: string, userRole: string): Promise<Document> => {
    const result = await db.query('SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!result.rows[0]) throw AppError.notFound('Document');

    const doc = mapRowToDocument(result.rows[0]);

    // Vérification d'accès selon la confidentialité
    if (doc.confidentialityLevel === ConfidentialityLevel.SECRET && userRole !== 'ADMIN') {
      throw AppError.forbidden('Document classifié SECRET — accès réservé aux administrateurs');
    }

    return doc;
  },

  /**
   * Lister les documents (paginé + filtres)
   */
  findAll: async (
    page: number,
    limit: number,
    filters: {
      category?: string;
      status?: string;
      confidentialityLevel?: string;
      search?: string;
      uploadedBy?: string;
    },
    userId: string,
    userRole: string
  ): Promise<{ documents: Document[]; pagination: PaginationMeta }> => {
    const offset = (page - 1) * limit;
    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    // Les non-admins ne voient pas les documents SECRET
    if (userRole !== 'ADMIN') {
      conditions.push(`confidentiality_level != 'SECRET'`);
    }

    if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.confidentialityLevel) { conditions.push(`confidentiality_level = $${idx++}`); params.push(filters.confidentialityLevel); }
    if (filters.uploadedBy) { conditions.push(`uploaded_by = $${idx++}`); params.push(filters.uploadedBy); }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR ai_summary ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM documents ${where}`, params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const docsResult = await db.query(
      `SELECT * FROM documents ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      documents: docsResult.rows.map(mapRowToDocument),
      pagination: buildPagination(page, limit, total),
    };
  },

  /**
   * Télécharger un document (déchiffrement + URL signée)
   */
  getDownloadUrl: async (id: string, userId: string, userRole: string): Promise<string> => {
    const doc = await documentService.findById(id, userId, userRole);
    return storageService.getSignedDownloadUrl(doc.storageKey, 3600);
  },

  /**
   * Mettre à jour les métadonnées d'un document
   */
  update: async (id: string, data: DocumentUpdate, userId: string, ipAddress = 'unknown'): Promise<Document> => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.category) { fields.push(`category = $${idx++}`); values.push(data.category); }
    if (data.confidentialityLevel) { fields.push(`confidentiality_level = $${idx++}`); values.push(data.confidentialityLevel); }
    if (data.tags) { fields.push(`tags = $${idx++}`); values.push(data.tags); }
    if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }

    if (fields.length === 0) throw AppError.badRequest('Aucune donnée à modifier');
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (!result.rows[0]) throw AppError.notFound('Document');
    const doc = mapRowToDocument(result.rows[0]);
    await createAuditLog({
      userId,
      action: AuditAction.DOC_UPDATE,
      resourceType: 'document',
      resourceId: id,
      ipAddress,
      details: { fields: Object.keys(data) },
      success: true,
    });
    return doc;
  },

  /**
   * Supprimer un document (soft delete)
   */
  delete: async (id: string, userId: string, ipAddress = 'unknown'): Promise<void> => {
    const result = await db.query(
      `UPDATE documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (result.rowCount === 0) throw AppError.notFound('Document');
    await createAuditLog({
      userId,
      action: AuditAction.DOC_DELETE,
      resourceType: 'document',
      resourceId: id,
      ipAddress,
      details: {},
      success: true,
    });
    logger.info(`[Documents] Document supprimé (soft) : ${id} par ${userId}`);
  },

  /**
   * Déclencher l'analyse IA (appel au microservice FastAPI)
   */
  triggerAIAnalysis: async (documentId: string, storageKey: string): Promise<void> => {
    try {
      await axios.post(
        `${env.AI_SERVICE_URL}/analyze`,
        { documentId, storageKey },
        { headers: { 'X-API-Key': env.AI_SERVICE_API_KEY }, timeout: 60_000 }
      );
      logger.info(`[AI] Analyse IA déclenchée pour le document : ${documentId}`);
    } catch (err) {
      logger.warn(`[AI] Impossible de déclencher l'analyse IA pour ${documentId} : ${(err as Error).message}`);
    }
  },
};

export default documentService;
