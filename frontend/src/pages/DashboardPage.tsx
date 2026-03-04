import { useMemo, useState, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  Clock,
  Users,
  ArrowRight,
  ArrowUpRight,
  Upload,
  Calendar,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/common/Spinner';
import { PieChart } from '@/components/reports/PieChart';
import { BarChart } from '@/components/reports/BarChart';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { reportService, type DashboardStats } from '@/services/reportService';
import { documentService } from '@/services/documentService';
import type { Document } from '@/types/document.types';

interface StatCard {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  trend?: string;
  to: string;
  accent: string;
}

type RangeKey = '30d' | '90d' | '12m';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDate(input?: any) {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
}

function Badge({ text }: { text: string }) {
  // mapping بسيط للبادجات حسب catégorie
  const t = (text || '').toLowerCase();

  const style =
    t.includes('inspection') ? { bg: 'rgba(245,158,11,0.15)', bd: 'rgba(245,158,11,0.25)', tx: '#fbbf24' } :
    t.includes('rapport')    ? { bg: 'rgba(37,99,235,0.15)', bd: 'rgba(37,99,235,0.25)', tx: '#60a5fa' } :
    t.includes('budget')     ? { bg: 'rgba(16,185,129,0.15)', bd: 'rgba(16,185,129,0.25)', tx: '#34d399' } :
    t.includes('rh')         ? { bg: 'rgba(139,92,246,0.15)', bd: 'rgba(139,92,246,0.25)', tx: '#a78bfa' } :
                               { bg: 'rgba(148,163,184,0.12)', bd: 'rgba(148,163,184,0.22)', tx: '#cbd5e1' };

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: style.bg, border: `1px solid ${style.bd}`, color: style.tx }}
    >
      {text || '—'}
    </span>
  );
}

function Segmented({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  const items: { k: RangeKey; label: string }[] = [
    { k: '30d', label: '30j' },
    { k: '90d', label: '90j' },
    { k: '12m', label: '12mois' },
  ];
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {items.map((it) => {
        const active = value === it.k;
        return (
          <button
            key={it.k}
            onClick={() => onChange(it.k)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
            style={{
              color: active ? 'white' : 'rgba(148,163,184,0.9)',
              background: active ? 'rgba(37,99,235,0.22)' : 'transparent',
              border: active ? '1px solid rgba(37,99,235,0.28)' : '1px solid transparent',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { canUpload } = usePermissions();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // filters
  const [range, setRange] = useState<RangeKey>('12m');

  useEffect(() => {
    Promise.all([
      reportService.getDashboardStats(),
      documentService.list({ page: 1, limit: 7 }).then((r) => r.data),
    ])
      .then(([s, docs]) => {
        setStats(s);
        setRecentDocs(docs);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const greeting = useMemo(() => getGreeting(), []);

  const cards: StatCard[] = [
    {
      label: 'Total Documents',
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      iconBg: 'rgba(37,99,235,0.20)',
      trend: '+12%',
      to: '/documents',
      accent: '#3b82f6',
    },
    {
      label: 'Ce mois-ci',
      value: stats?.documentsThisMonth ?? 0,
      icon: TrendingUp,
      iconBg: 'rgba(16,185,129,0.20)',
      trend: '+8%',
      to: '/documents',
      accent: '#10b981',
    },
    {
      label: 'En attente',
      value: stats?.pendingWorkflows ?? 0,
      icon: Clock,
      iconBg: 'rgba(245,158,11,0.20)',
      to: '/workflow',
      accent: '#f59e0b',
    },
    {
      label: 'Utilisateurs',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      iconBg: 'rgba(139,92,246,0.20)',
      to: '/users',
      accent: '#8b5cf6',
    },
  ];

  // monthly filter: نفترض أن stats.monthly مرتبة تاريخياً
  const filteredMonthly = useMemo(() => {
    const arr = stats?.monthly ?? [];
    if (range === '30d') return arr.slice(-1);   // آخر شهر تقريباً
    if (range === '90d') return arr.slice(-3);   // آخر 3 أشهر
    return arr;                                  // 12 شهر أو أكثر
  }, [stats, range]);

  // empty checks
  const hasCategory = (stats?.byCategory?.length ?? 0) > 0;
  const hasMonthly = (filteredMonthly?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" className="text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-sub">
            {greeting},{' '}
            <span className="text-blue-400 font-semibold">
              {user?.firstName} {user?.lastName}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {canUpload && (
            <button onClick={() => navigate('/upload')} className="btn-primary self-start">
              <Upload className="h-4 w-4" /> Nouveau document
            </button>
          )}
          <button
            onClick={() => navigate('/documents')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <FileText className="h-4 w-4 inline -mt-0.5 mr-2" />
            Voir documents
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, iconBg, trend, to, accent }, i) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="text-left group rounded-2xl p-5 hover:translate-y-[-1px] transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              animationDelay: `${i * 0.06}s`,
            }}
          >
            <div className="h-1 rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-extrabold text-white tabular-nums">{value.toLocaleString()}</span>
                  {trend && (
                    <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-semibold mb-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {trend}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* ── CHARTS + FILTERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Documents par catégorie</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              Distribution
            </div>
          </div>

          {hasCategory ? (
            <PieChart data={stats?.byCategory ?? []} />
          ) : (
            <div className="py-14 text-center">
              <p className="text-slate-400 text-sm">Aucune donnée disponible.</p>
              <p className="text-xs text-slate-500 mt-1">Ajoutez des documents pour alimenter les statistiques.</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-white">Activité</h2>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <Segmented value={range} onChange={setRange} />
            </div>
          </div>

          {hasMonthly ? (
            <BarChart data={filteredMonthly} />
          ) : (
            <div className="py-14 text-center">
              <p className="text-slate-400 text-sm">Aucune donnée sur cette période.</p>
              <p className="text-xs text-slate-500 mt-1">Changez le filtre ou ajoutez des documents.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT DOCS (TABLE) ── */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h2 className="text-sm font-bold text-white">Documents récents</h2>
            <p className="text-xs text-slate-500 mt-0.5">Accès rapide aux derniers fichiers consultés / ajoutés.</p>
          </div>

          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-slate-400 text-sm mb-3">Aucun document récent.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => navigate('/documents')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Parcourir
              </button>
              {canUpload && (
                <button onClick={() => navigate('/upload')} className="btn-primary">
                  <Upload className="h-4 w-4" /> Ajouter
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>
                  <th className="px-5 py-3 font-bold">Titre</th>
                  <th className="px-5 py-3 font-bold">Catégorie</th>
                  <th className="px-5 py-3 font-bold">Dernière mise à jour</th>
                  <th className="px-5 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>

              <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {recentDocs.map((doc) => {
                  const updatedAt = (doc as any).updatedAt ?? (doc as any).updated_at ?? (doc as any).createdAt;
                  return (
                    <tr
                      key={doc.id}
                      className="cursor-pointer hover:bg-white/[0.04] transition"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(37,99,235,0.15)' }}
                          >
                            <FileText className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate max-w-[520px]">
                              {doc.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              ID: {doc.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge text={(doc as any).category ?? '—'} />
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-300">{formatDate(updatedAt)}</span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/documents/${doc.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
                        >
                          Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}