import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Upload, GitBranch, Cpu, Users,
  Shield, BarChart3, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useUiStore } from '@/store/uiStore';
import { usePermissions } from '@/hooks/usePermissions';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  show?: boolean;
  group?: string;
}

const GROUPS = [
  { key: 'main',  label: 'Navigation' },
  { key: 'admin', label: 'Administration' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const {
    canManageUsers, canViewAudit, canViewReports,
    canUseAITools, canUpload, canApproveWorkflow,
  } = usePermissions();
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/',          label: 'Tableau de bord', icon: LayoutDashboard, group: 'main' },
    { to: '/documents', label: 'Documents',       icon: FileText,        group: 'main' },
    { to: '/upload',    label: 'Uploader',        icon: Upload,          group: 'main',  show: canUpload },
    { to: '/workflow',  label: 'Workflows',       icon: GitBranch,       group: 'main',  show: canApproveWorkflow },
    { to: '/ai',        label: 'Outils IA',       icon: Cpu,             group: 'main',  show: canUseAITools },
    { to: '/reports',   label: 'Rapports',        icon: BarChart3,       group: 'admin', show: canViewReports },
    { to: '/audit',     label: 'Audit',           icon: Shield,          group: 'admin', show: canViewAudit },
    { to: '/users',     label: 'Administration',  icon: Users,           group: 'admin', show: canManageUsers },
    { to: '/settings',  label: 'Paramètres',      icon: Settings,        group: 'admin' },
  ];

  const visible = navItems.filter((i) => i.show !== false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-[240px]' : 'w-[72px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #0b1630 0%, #060d1f 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── LOGO ── */}
      <div
        className="flex h-16 shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-extrabold text-xs text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(29,78,216,0.95))',
            boxShadow: '0 12px 30px rgba(37,99,235,0.25)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          GED
        </div>

        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="text-sm font-extrabold text-white truncate leading-tight">GED Plateforme</p>
            <p className="text-[10px] text-blue-400 truncate">Ministère de l'Éducation</p>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => {
          const items = visible.filter((i) => i.group === group.key);
          if (items.length === 0) return null;

          return (
            <div key={group.key} className="mb-5">
              {sidebarOpen && (
                <p
                  className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(148,163,184,0.45)' }}
                >
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={!sidebarOpen ? item.label : undefined}
                      className={cn(
                        'nav-item relative',
                        isActive && 'active',
                        !sidebarOpen && 'justify-center px-0'
                      )}
                      style={
                        isActive
                          ? ({
                              background: 'rgba(37,99,235,0.10)',
                              border: '1px solid rgba(37,99,235,0.22)',
                            } as React.CSSProperties)
                          : undefined
                      }
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full"
                          style={{ background: '#3b82f6' }}
                        />
                      )}

                      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-blue-400' : 'text-slate-300')} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── COLLAPSE BUTTON ── */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleSidebar}
          className="nav-item w-full"
          title={sidebarOpen ? 'Réduire' : 'Agrandir'}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Réduire</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 mx-auto" />
          )}
        </button>
      </div>
    </aside>
  );
}