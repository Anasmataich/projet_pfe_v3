// workflow.service.ts - service de gestion des workflows

import db from '../../config/database';
import { AppError } from '../../shared/AppError';
import { DocumentStatus, WorkflowStep, WorkflowStatus, AuditAction } from '../../shared/enums';
import { createAuditLog } from '../../middlewares/auditLogger';
import type { WorkflowInstance } from './workflow.model';

// ─────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────

function mapRowToWorkflow(row: Record<string, unknown>): WorkflowInstance {
  return {
    id: row['id'] as string,
    documentId: row['document_id'] as string,
    currentStep: row['current_step'] as WorkflowStep,
    status: row['status'] as WorkflowStatus,
    submittedBy: (row['submitted_by'] as string | null) ?? null,
    submittedAt: row['submitted_at'] ? new Date(row['submitted_at'] as string) : null,
    approvedBy: (row['approved_by'] as string | null) ?? null,
    approvedAt: row['approved_at'] ? new Date(row['approved_at'] as string) : null,
    rejectedBy: (row['rejected_by'] as string | null) ?? null,
    rejectedAt: row['rejected_at'] ? new Date(row['rejected_at'] as string) : null,
    rejectionReason: (row['rejection_reason'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const workflowService = {
  /**
   * Récupère ou crée une instance de workflow pour un document
   */
  getOrCreate: async (documentId: string): Promise<WorkflowInstance> => {
    const existing = await db.query(
      'SELECT * FROM workflow_instances WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1',
      [documentId]
    );
    if (existing.rows[0]) return mapRowToWorkflow(existing.rows[0]);

    const result = await db.query(
      `INSERT INTO workflow_instances (document_id, current_step, status)
       VALUES ($1, $2, $3) RETURNING *`,
      [documentId, WorkflowStep.SOUMISSION, WorkflowStatus.PENDING]
    );
    return mapRowToWorkflow(result.rows[0]);
  },

  /**
   * Soumettre un document pour validation
   */
  submit: async (
    documentId: string,
    userId: string,
    ipAddress: string
  ): Promise<WorkflowInstance> => {
    const docResult = await db.query(
      'SELECT id, status, uploaded_by FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [documentId]
    );
    if (!docResult.rows[0]) throw AppError.notFound('Document');
    const doc = docResult.rows[0];

    if (doc.uploaded_by !== userId) {
      throw AppError.forbidden('Seul l\'auteur du document peut le soumettre');
    }

    if (doc.status !== DocumentStatus.BROUILLON) {
      throw AppError.badRequest('Seuls les brouillons peuvent être soumis');
    }

    const workflow = await workflowService.getOrCreate(documentId);
    if (workflow.status !== WorkflowStatus.PENDING) {
      throw AppError.conflict('Ce document a déjà été soumis');
    }

    await db.query(
      `UPDATE workflow_instances SET current_step = $1, status = $2, submitted_by = $3, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [WorkflowStep.REVISION, WorkflowStatus.IN_PROGRESS, userId, workflow.id]
    );
    await db.query(
      'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
      [DocumentStatus.EN_ATTENTE, documentId]
    );

    await createAuditLog({
      userId,
      action: AuditAction.WORKFLOW_SUBMIT,
      resourceType: 'document',
      resourceId: documentId,
      ipAddress,
      details: { workflowId: workflow.id },
      success: true,
    });

    return workflowService.getOrCreate(documentId);
  },

  /**
   * Approuver un document
   */
  approve: async (
    documentId: string,
    userId: string,
    ipAddress: string
  ): Promise<WorkflowInstance> => {
    const workflow = await workflowService.getOrCreate(documentId);
    if (workflow.status === WorkflowStatus.APPROVED) {
      throw AppError.conflict('Ce document est déjà approuvé');
    }
    if (workflow.status === WorkflowStatus.REJECTED) {
      throw AppError.badRequest('Un document rejeté ne peut pas être approuvé');
    }

    await db.query(
      `UPDATE workflow_instances SET status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [WorkflowStatus.APPROVED, userId, workflow.id]
    );
    await db.query(
      'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
      [DocumentStatus.APPROUVE, documentId]
    );

    await createAuditLog({
      userId,
      action: AuditAction.WORKFLOW_APPROVE,
      resourceType: 'document',
      resourceId: documentId,
      ipAddress,
      details: { workflowId: workflow.id },
      success: true,
    });

    return workflowService.getOrCreate(documentId);
  },

  /**
   * Rejeter un document
   */
  reject: async (
    documentId: string,
    userId: string,
    reason: string,
    ipAddress: string
  ): Promise<WorkflowInstance> => {
    const workflow = await workflowService.getOrCreate(documentId);
    if (workflow.status === WorkflowStatus.APPROVED) {
      throw AppError.badRequest('Un document approuvé ne peut pas être rejeté');
    }

    await db.query(
      `UPDATE workflow_instances SET status = $1, rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, updated_at = NOW()
       WHERE id = $4`,
      [WorkflowStatus.REJECTED, userId, reason, workflow.id]
    );
    await db.query(
      'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
      [DocumentStatus.REJETE, documentId]
    );

    await createAuditLog({
      userId,
      action: AuditAction.WORKFLOW_REJECT,
      resourceType: 'document',
      resourceId: documentId,
      ipAddress,
      details: { workflowId: workflow.id, reason },
      success: true,
    });

    return workflowService.getOrCreate(documentId);
  },
};
