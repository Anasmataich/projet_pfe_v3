// encryption.ts - utilitaires de chiffrement (AES-256) (stub)

import crypto from 'crypto';
import env from '../config/env';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = env.ENCRYPTION_IV_LENGTH; // 16 octets
const TAG_LENGTH = 16; // GCM auth tag (octets)
const KEY_BUFFER = Buffer.from(env.ENCRYPTION_KEY, 'hex');

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────
interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

// ─────────────────────────────────────────────
// Chiffrement AES-256-GCM
// ─────────────────────────────────────────────

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM
 * @returns Objet contenant iv, encryptedData, authTag (tous en hex)
 */
export const encrypt = (plaintext: string): EncryptedData => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex'),
  };
};

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM
 */
export const decrypt = (encrypted: EncryptedData): string => {
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Chiffre et sérialise en string base64 (pour stockage en BDD)
 */
export const encryptToString = (plaintext: string): string => {
  const encrypted = encrypt(plaintext);
  return Buffer.from(JSON.stringify(encrypted)).toString('base64');
};

/**
 * Déserialise et déchiffre depuis base64
 */
export const decryptFromString = (encryptedString: string): string => {
  const encrypted = JSON.parse(
    Buffer.from(encryptedString, 'base64').toString('utf8')
  ) as EncryptedData;
  return decrypt(encrypted);
};

// ─────────────────────────────────────────────
// Hachage sécurisé
// ─────────────────────────────────────────────

/**
 * Génère un hash SHA-256 d'un fichier (pour vérification d'intégrité)
 */
export const hashFile = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Génère un token sécurisé aléatoire
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Génère un UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Comparer deux chaînes de manière sécurisée (contre timing attacks)
 */
export const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Sanitise un nom de fichier pour éviter les injections et caractères dangereux
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return 'unnamed';
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255) || 'unnamed';
};