// workflow.model.ts - modèle de workflow

import { WorkflowStep, WorkflowStatus } from '../../shared/enums';

export interface WorkflowInstance {
  id: string;
  documentId: string;
  currentStep: WorkflowStep;
  status: WorkflowStatus;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowSubmitInput {
  comment?: string;
}

export interface WorkflowRejectInput {
  reason: string;
}
