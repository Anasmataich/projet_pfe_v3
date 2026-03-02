// shared/index.ts - export centralisé des utilitaires partagés

export { ApiResponse, buildPagination, type ApiResponsePayload, type ResponseMeta, type PaginationMeta } from './ApiResponse';
export { AppError } from './AppError';
export {
  HttpStatus,
  UserRole,
  UserStatus,
  DocumentCategory,
  ConfidentialityLevel,
  DocumentStatus,
  WorkflowStep,
  WorkflowStatus,
  WorkflowAction,
  AuditAction,
  AnomalySeverity,
  NotificationType,
} from './enums';
