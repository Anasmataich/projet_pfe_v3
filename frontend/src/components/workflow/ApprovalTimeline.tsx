import { FileText, Clock } from 'lucide-react';
import { WORKFLOW_STATUS_LABELS, WORKFLOW_STEP_LABELS } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import type { WorkflowInstance } from '@/types/workflow.types';

interface ApprovalTimelineProps {
  workflow: WorkflowInstance;
}

export function ApprovalTimeline({ workflow }: ApprovalTimelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <FileText className="h-4 w-4 text-blue-400" /> Détails du workflow
      </h3>

      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Statut</span>
          <span className="font-medium text-white">{WORKFLOW_STATUS_LABELS[workflow.status]}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Étape actuelle</span>
          <span className="font-medium text-white">{WORKFLOW_STEP_LABELS[workflow.currentStep]}</span>
        </div>
        {workflow.initiatorName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Initié par</span>
            <span className="font-medium text-white">{workflow.initiatorName}</span>
          </div>
        )}
        {workflow.assigneeName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Assigné à</span>
            <span className="font-medium text-white">{workflow.assigneeName}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Date</span>
          <span className="flex items-center gap-1 text-white"><Clock className="h-3.5 w-3.5 text-slate-400" />{formatDateTime(workflow.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
