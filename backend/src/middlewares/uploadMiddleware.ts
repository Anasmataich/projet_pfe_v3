import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/AppError';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo

const ALLOWED_MIMES = [
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
];

interface MagicSignature {
  mime: string;
  bytes: number[];
  offset?: number;
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46] },                                         // %PDF
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },                 // PNG
  { mime: 'image/jpeg',       bytes: [0xFF, 0xD8, 0xFF] },                                                // JPEG
  { mime: 'image/gif',        bytes: [0x47, 0x49, 0x46, 0x38] },                                          // GIF8
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                               bytes: [0x50, 0x4B, 0x03, 0x04] },                                         // DOCX (ZIP)
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                               bytes: [0x50, 0x4B, 0x03, 0x04] },                                         // XLSX (ZIP)
  { mime: 'application/msword', bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },               // DOC (OLE2)
  { mime: 'application/vnd.ms-excel', bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },         // XLS (OLE2)
];

const TEXT_MIMES = new Set(['text/plain', 'text/csv']);

const validateMagicBytes = (buffer: Buffer, declaredMime: string): boolean => {
  if (TEXT_MIMES.has(declaredMime)) return true;

  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (matches) return true;
  }
  return false;
};

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Type de fichier non autorisé : ${file.mimetype}`, 400));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('file');

export const documentUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }

    if (req.file?.buffer) {
      if (!validateMagicBytes(req.file.buffer, req.file.mimetype)) {
        next(new AppError('Le contenu du fichier ne correspond pas au type MIME déclaré', 400));
        return;
      }
    }

    next();
  });
};
