import { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';
import { documentService } from '@/services/documentService';
import { workflowService } from '@/services/workflowService';
import { WORKFLOW_STATUS_LABELS, WORKFLOW_STEP_LABELS } from '@/utils/constants';
import { formatRelative } from '@/utils/formatters';
import type { Document } from '@/types/document.types';
import type { WorkflowInstance } from '@/types/workflow.types';
import toast from 'react-hot-toast';

interface DocWithWorkflow {
  document: Document;
  workflow: WorkflowInstance | null;
}

export function WorkflowBoard() {
  const [items, setItems] = useState<DocWithWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data: docs } = await documentService.list({ status: 'EN_ATTENTE', limit: 50 });
      const results: DocWithWorkflow[] = [];
      for (const doc of docs) {
        try {
          const wf = await workflowService.getStatus(doc.id);
          results.push({ document: doc, workflow: wf });
        } catch {
          results.push({ document: doc, workflow: null });
        }
      }
      setItems(results);
    } catch {
      toast.error('Erreur lors du chargement des workflows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (documentId: string) => {
    try {
      await workflowService.approve(documentId);
      toast.success('Document approuvé');
      load();
    } catch {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async (documentId: string, reason: string) => {
    try {
      await workflowService.reject(documentId, reason);
      toast.success('Document rejeté');
      load();
    } catch {
      toast.error('Erreur lors du rejet');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-bold text-white">Documents en attente de validation</h2>
        <span className="ml-auto text-sm text-slate-500">{items.length} document(s)</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 card">
          <GitBranch className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">Aucun document en attente de validation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ document: doc, workflow }) => (
            <WorkflowDocCard
              key={doc.id}
              document={doc}
              workflow={workflow}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowDocCard({ document: doc, workflow, onApprove, onReject }: {
  document: Document;
  workflow: WorkflowInstance | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try { await onApprove(doc.id); } finally { setIsSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try { await onReject(doc.id, rejectReason); setShowReject(false); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{doc.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>{formatRelative(doc.createdAt)}</span>
            {workflow && (
              <span className="text-blue-400 font-medium">
                {WORKFLOW_STEP_LABELS[workflow.currentStep]} — {WORKFLOW_STATUS_LABELS[workflow.status]}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-success text-xs px-3 py-1.5 rounded-lg" disabled={isSubmitting} onClick={handleApprove}>
            {isSubmitting ? 'En cours…' : 'Approuver'}
          </button>
          <button className="btn-danger text-xs px-3 py-1.5 rounded-lg" onClick={() => setShowReject(true)}>Rejeter</button>
        </div>
      </div>

      {showReject && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Raison du rejet…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={() => setShowReject(false)}>Annuler</button>
            <button className="btn-danger text-xs px-3 py-1.5 rounded-lg" disabled={isSubmitting || !rejectReason.trim()} onClick={handleReject}>
              {isSubmitting ? 'En cours…' : 'Confirmer le rejet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
