import { useState, useEffect } from 'react';
import { FileText, TrendingUp, Clock, Users, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/common/Spinner';
import { PieChart } from '@/components/reports/PieChart';
import { BarChart } from '@/components/reports/BarChart';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { reportService, type DashboardStats } from '@/services/reportService';
import { documentService } from '@/services/documentService';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document } from '@/types/document.types';

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  trend?: string;
  to: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { canUpload } = usePermissions();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.getDashboardStats(),
      documentService.list({ page: 1, limit: 5 }).then((r) => r.data),
    ])
      .then(([s, docs]) => { setStats(s); setRecentDocs(docs); })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" className="text-blue-400" />
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      label: 'Total Documents',
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      gradient: 'from-blue-600 to-blue-800',
      iconBg: 'rgba(37,99,235,0.20)',
      trend: '+12%',
      to: '/documents',
    },
    {
      label: 'Ce mois-ci',
      value: stats?.documentsThisMonth ?? 0,
      icon: TrendingUp,
      gradient: 'from-emerald-600 to-emerald-800',
      iconBg: 'rgba(16,185,129,0.20)',
      trend: '+8%',
      to: '/documents',
    },
    {
      label: 'En attente',
      value: stats?.pendingWorkflows ?? 0,
      icon: Clock,
      gradient: 'from-amber-600 to-amber-800',
      iconBg: 'rgba(245,158,11,0.20)',
      to: '/workflow',
    },
    {
      label: 'Utilisateurs',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      gradient: 'from-violet-600 to-violet-800',
      iconBg: 'rgba(139,92,246,0.20)',
      to: '/users',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-sub">
            Bienvenue,{' '}
            <span className="text-blue-400 font-semibold">
              {user?.firstName} {user?.lastName}
            </span>
          </p>
        </div>
        {canUpload && (
          <button onClick={() => navigate('/upload')} className="btn-primary self-start">
            <FileText className="h-4 w-4" /> Nouveau document
          </button>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, iconBg, trend, to }, i) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="stat-card text-left group animate-fade-in hover:border-blue-500/20 hover:shadow-card transition-all duration-200"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: iconBg }}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-white tabular-nums">{value.toLocaleString()}</span>
                {trend && (
                  <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-semibold mb-0.5">
                    <ArrowUpRight className="h-3.5 w-3.5" />{trend}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
          </button>
        ))}
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-white mb-4">Documents par catégorie</h2>
          <PieChart data={stats?.byCategory ?? []} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-bold text-white mb-4">Activité mensuelle</h2>
          <BarChart data={stats?.monthly ?? []} />
        </div>
      </div>

      {/* ── RECENT DOCS ── */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white">Documents récents</h2>
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Aucun document récent
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'rgba(255,255,255,0.05)' } as React.CSSProperties}>
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(37,99,235,0.15)' }}>
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{doc.category}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
