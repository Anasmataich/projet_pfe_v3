import { GitBranch } from 'lucide-react';
import { WorkflowBoard } from '@/components/workflow/WorkflowBoard';

export function WorkflowPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(139,92,246,0.15)' }}>
            <GitBranch className="h-4.5 w-4.5 text-violet-400" />
          </div>
          Workflows de validation
        </h1>
        <p className="page-sub mt-1">Gérez les flux de validation des documents</p>
      </div>
      <WorkflowBoard />
    </div>
  );
}
