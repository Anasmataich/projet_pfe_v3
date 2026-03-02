export type DocumentCategory =
  | 'DECISION'
  | 'CIRCULAIRE'
  | 'RAPPORT'
  | 'BUDGET'
  | 'RH'
  | 'CORRESPONDANCE'
  | 'PROJET_PEDAGOGIQUE'
  | 'INSPECTION'
  | 'ARCHIVE'
  | 'AUTRE';

export type ConfidentialityLevel = 'PUBLIC' | 'INTERNE' | 'CONFIDENTIEL' | 'SECRET';

export type DocumentStatus = 'BROUILLON' | 'EN_REVISION' | 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'ARCHIVE';

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  confidentialityLevel: ConfidentialityLevel;
  status: DocumentStatus;
  uploadedBy: string;
  uploaderName?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  currentVersion: number;
  tags: string[];
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  storageKey: string;
  uploadedBy: string;
  uploaderName?: string;
  changeNote?: string;
  checksum?: string;
  createdAt: string;
}

export interface DocumentUploadInput {
  file: File;
  title: string;
  category: DocumentCategory;
  confidentialityLevel?: ConfidentialityLevel;
  tags?: string;
  description?: string;
}

export interface DocumentUpdateInput {
  title?: string;
  category?: DocumentCategory;
  confidentialityLevel?: ConfidentialityLevel;
  tags?: string[];
  description?: string;
  status?: DocumentStatus;
}

export interface DocumentFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  confidentialityLevel?: ConfidentialityLevel;
}
