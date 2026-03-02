import { useState } from 'react';
import { FileText, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { formatRelative } from '@/utils/formatters';
import { WORKFLOW_STEP_LABELS } from '@/utils/constants';
import type { WorkflowInstance } from '@/types/workflow.types';

interface ValidationCardProps {
  workflow: WorkflowInstance;
  onApprove: (documentId: string) => Promise<void>;
  onReject: (documentId: string, reason: string) => Promise<void>;
}

export function ValidationCard({ workflow: w, onApprove, onReject }: ValidationCardProps) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPending = w.status === 'PENDING' || w.status === 'IN_PROGRESS';

  const handleApprove = async () => {
    setIsSubmitting(true);
    try { await onApprove(w.documentId); } finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try { await onReject(w.documentId, reason); setRejectModalOpen(false); } finally { setIsSubmitting(false); }
  };

  return (
    <>
      <div className="card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2" style={{ background: 'rgba(37,99,235,0.15)' }}>
            <FileText className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{w.documentTitle ?? 'Document'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(w.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Étape : <span className="font-medium text-slate-300">{WORKFLOW_STEP_LABELS[w.currentStep]}</span>
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2 pt-1">
            <button className="btn-success text-xs px-3 py-1.5 rounded-lg flex-1" disabled={isSubmitting} onClick={handleApprove}>
              {isSubmitting ? 'En cours…' : 'Approuver'}
            </button>
            <button className="btn-danger text-xs px-3 py-1.5 rounded-lg flex-1" onClick={() => setRejectModalOpen(true)}>Rejeter</button>
          </div>
        )}
      </div>

      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Raison du rejet">
        <div className="space-y-4">
          <textarea className="input min-h-[100px] resize-y" placeholder="Expliquez la raison du rejet…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={() => setRejectModalOpen(false)}>Annuler</button>
            <button className="btn-danger text-xs px-3 py-1.5 rounded-lg" disabled={isSubmitting || !reason.trim()} onClick={handleReject}>
              {isSubmitting ? 'En cours…' : 'Confirmer le rejet'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
