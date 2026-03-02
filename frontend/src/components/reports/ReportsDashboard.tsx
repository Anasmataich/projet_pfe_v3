import { useState, useEffect } from 'react';
import { FileText, Users, Clock, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { reportService, type DashboardStats } from '@/services/reportService';

export function ReportsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboardStats()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Spinner size="lg" className="text-blue-400" /></div>;
  }

  if (!stats) return <p className="text-sm text-slate-500 text-center py-12">Données indisponibles</p>;

  const statCards = [
    { label: 'Total documents', value: stats.totalDocuments, icon: FileText, iconBg: 'rgba(37,99,235,0.20)' },
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, iconBg: 'rgba(16,185,129,0.20)' },
    { label: 'En attente', value: stats.pendingWorkflows, icon: Clock, iconBg: 'rgba(245,158,11,0.20)' },
    { label: 'Ce mois', value: stats.documentsThisMonth, icon: TrendingUp, iconBg: 'rgba(139,92,246,0.20)' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: s.iconBg }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white tabular-nums">{s.value.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Répartition par catégorie</h3>
          <PieChart data={stats.byCategory} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Répartition par statut</h3>
          <BarChart data={stats.byStatus} />
        </div>
      </div>
    </div>
  );
}
