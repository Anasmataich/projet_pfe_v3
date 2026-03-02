export type WorkflowStep =
  | 'SOUMISSION'
  | 'REVISION'
  | 'VALIDATION_N1'
  | 'VALIDATION_N2'
  | 'APPROBATION'
  | 'PUBLICATION';

export type WorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';

export interface WorkflowInstance {
  id: string;
  documentId: string;
  documentTitle?: string;
  initiatedBy: string;
  initiatorName?: string;
  currentStep: WorkflowStep;
  status: WorkflowStatus;
  assignedTo?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowComment {
  id: string;
  workflowId: string;
  userId: string;
  userName?: string;
  comment: string;
  step: WorkflowStep;
  action: string;
  createdAt: string;
}
