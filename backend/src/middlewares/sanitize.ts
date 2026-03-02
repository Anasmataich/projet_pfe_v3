import { Request, Response, NextFunction } from 'express';

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#96;',
};
const HTML_ESCAPE_RE = /[&<>"'/`]/g;

const DANGEROUS_PATTERNS = [
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=/gi,
  /<\s*script/gi,
  /<\s*iframe/gi,
  /<\s*object/gi,
  /<\s*embed/gi,
  /<\s*svg[\s>]/gi,
  /<\s*math[\s>]/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /-moz-binding\s*:/gi,
];

const escapeHtml = (str: unknown): string => {
  if (str == null || typeof str !== 'string') return String(str ?? '');
  let escaped = str.replace(HTML_ESCAPE_RE, (char) => HTML_ENTITY_MAP[char] ?? char);
  for (const pattern of DANGEROUS_PATTERNS) {
    escaped = escaped.replace(pattern, '');
  }
  return escaped;
};

// Champs sensibles à NE PAS sanitizer (mots de passe, etc.)
// car l'échappement HTML modifie les caractères spéciaux et casse bcrypt.compare()
const SKIP_SANITIZE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
]);

const sanitizeObject = (obj: unknown, depth = 0, parentKey?: string): unknown => {
  if (depth > 20) return obj;
  if (obj == null) return obj;
  if (typeof obj === 'string') {
    // Ne pas échapper les mots de passe — bcrypt a besoin de la valeur brute
    if (parentKey && SKIP_SANITIZE_KEYS.has(parentKey)) return obj;
    return escapeHtml(obj);
  }
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, depth + 1, parentKey));
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const safeKey = SKIP_SANITIZE_KEYS.has(k) ? k : escapeHtml(k);
      sanitized[safeKey] = sanitizeObject(v, depth + 1, k);
    }
    return sanitized;
  }
  return obj;
};

export const sanitize = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body) as Request['body'];
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as Request['query'];
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as Request['params'];
  }
  next();
};
