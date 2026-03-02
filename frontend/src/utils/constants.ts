import type { DocumentCategory, ConfidentialityLevel, DocumentStatus } from '@/types/document.types';
import type { UserRole } from '@/types/auth.types';
import type { WorkflowStatus, WorkflowStep } from '@/types/workflow.types';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  DECISION: 'Décision',
  CIRCULAIRE: 'Circulaire',
  RAPPORT: 'Rapport',
  BUDGET: 'Budget',
  RH: 'Ressources Humaines',
  CORRESPONDANCE: 'Correspondance',
  PROJET_PEDAGOGIQUE: 'Projet pédagogique',
  INSPECTION: 'Inspection',
  ARCHIVE: 'Archive',
  AUTRE: 'Autre',
};

export const CONFIDENTIALITY_LABELS: Record<ConfidentialityLevel, string> = {
  PUBLIC: 'Public',
  INTERNE: 'Interne',
  CONFIDENTIEL: 'Confidentiel',
  SECRET: 'Secret',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_REVISION: 'En révision',
  EN_ATTENTE: 'En attente',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
  ARCHIVE: 'Archivé',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  CADRE: 'Cadre',
  INSPECTEUR: 'Inspecteur',
  RH: 'Ressources Humaines',
  COMPTABLE: 'Comptable',
  CONSULTANT: 'Consultant',
  DOCUMENT_MANAGER: 'Gestionnaire documentaire',
  STANDARD_USER: 'Utilisateur standard',
  SECURITY_OFFICER: 'Responsable sécurité (RSSI)',
};

export const STATUS_COLORS: Record<DocumentStatus, string> = {
  BROUILLON: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/25',
  EN_REVISION: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25',
  EN_ATTENTE: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  APPROUVE: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  REJETE: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25',
  ARCHIVE: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
};

export const CONFIDENTIALITY_COLORS: Record<ConfidentialityLevel, string> = {
  PUBLIC: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
  INTERNE: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25',
  CONFIDENTIEL: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25',
  SECRET: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25',
};

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
};

export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  SOUMISSION: 'Soumission',
  REVISION: 'Révision',
  VALIDATION_N1: 'Validation N1',
  VALIDATION_N2: 'Validation N2',
  APPROBATION: 'Approbation',
  PUBLICATION: 'Publication',
};

export const ALLOWED_MIME_TYPES = [
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

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
