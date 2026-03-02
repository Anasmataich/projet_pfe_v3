import { BarChart3 } from 'lucide-react';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';

export function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(37,99,235,0.15)' }}>
            <BarChart3 className="h-4.5 w-4.5 text-blue-400" />
          </div>
          Rapports & Statistiques
        </h1>
        <p className="page-sub mt-1">Vue d'ensemble analytique de la plateforme</p>
      </div>
      <ReportsDashboard />
    </div>
  );
}
