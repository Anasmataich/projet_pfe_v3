import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './constants';

export function validateEmail(email: string): string | null {
  if (!email) return 'L\'email est requis';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format d\'email invalide';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Le mot de passe est requis';
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir une majuscule';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir un chiffre';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir un caractère spécial';
  return null;
}

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Type de fichier non autorisé';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE / 1024 / 1024} Mo`;
  }
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  if (!value?.trim()) return `${label} est requis`;
  return null;
}
