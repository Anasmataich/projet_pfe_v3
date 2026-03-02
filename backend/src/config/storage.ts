// storage.ts - configuration du stockage S3 / MinIO (stub)

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommandInput,
  type _Object,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import env from './env';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Client S3 (compatible MinIO)
// ─────────────────────────────────────────────
export const s3Client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  forcePathStyle: true, // Requis pour MinIO
  // Utiliser https:// dans STORAGE_ENDPOINT pour TLS
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified?: Date;
  contentType?: string;
}

// ─────────────────────────────────────────────
// Service de stockage
// ─────────────────────────────────────────────
export const storageService = {
  /**
   * Uploader un fichier chiffré dans le bucket
   */
  uploadFile: async (
    key: string,
    body: Buffer | Readable,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> => {
    const params: PutObjectCommandInput = {
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      // ServerSideEncryption retiré : MinIO ne supporte pas SSE sans KMS,
      // et le fichier est déjà chiffré côté application (AES-256-GCM).
    };

    await s3Client.send(new PutObjectCommand(params));

    const size = body instanceof Buffer ? body.length : 0;
    logger.info(`[Storage] Fichier uploadé : ${key}`);

    return {
      key,
      bucket: env.STORAGE_BUCKET,
      url: `${env.STORAGE_ENDPOINT}/${env.STORAGE_BUCKET}/${key}`,
      size,
      contentType,
    };
  },

  /**
   * Télécharger un fichier depuis le bucket
   */
  downloadFile: async (key: string): Promise<Buffer> => {
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error(`[Storage] Fichier introuvable : ${key}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    logger.debug(`[Storage] Fichier téléchargé : ${key}`);
    return Buffer.concat(chunks);
  },

  /**
   * Générer une URL signée temporaire (accès sécurisé)
   */
  getSignedDownloadUrl: async (key: string, expiresInSeconds = 3600): Promise<string> => {
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    logger.debug(`[Storage] URL signée générée pour : ${key}`);
    return url;
  },

  /**
   * Supprimer un fichier du bucket
   */
  deleteFile: async (key: string): Promise<void> => {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
    }));
    logger.info(`[Storage] Fichier supprimé : ${key}`);
  },

  /**
   * Vérifier si un fichier existe
   */
  fileExists: async (key: string): Promise<boolean> => {
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Lister les fichiers d'un préfixe (dossier virtuel)
   */
  listFiles: async (prefix: string): Promise<StorageObject[]> => {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: env.STORAGE_BUCKET,
      Prefix: prefix,
    }));

    return (response.Contents ?? []).map((obj: _Object) => ({
      key: obj.Key ?? '',
      size: obj.Size ?? 0,
      lastModified: obj.LastModified,
    }));
  },

  /**
   * Construire la clé de stockage pour un document
   * Format : documents/{userId}/{documentId}/{version}/{filename}
   */
  buildDocumentKey: (
    userId: string,
    documentId: string,
    version: string,
    filename: string
  ): string => {
    return `documents/${userId}/${documentId}/${version}/${filename}`;
  },
};

export default storageService;