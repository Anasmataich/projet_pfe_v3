import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LogOut, Settings, ChevronDown, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/helpers';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  CADRE: 'Cadre',
  INSPECTEUR: 'Inspecteur',
  RH: 'RH',
  COMPTABLE: 'Comptable',
  CONSULTANT: 'Consultant',
};

const LS_KEY = 'ged_recent_searches_v1';

function readSearches(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeSearches(next: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next.slice(0, 8)));
  } catch {
    // ignore
  }
}

export function Header() {
  const { user, logout } = useAuth();
  const { sidebarOpen } = useUiStore();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState('');
  const [openSuggest, setOpenSuggest] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readSearches());
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpenSuggest(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '??';

  const pushRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x !== t)].slice(0, 8);
    setRecent(next);
    writeSearches(next);
  };

  const goSearch = (term?: string) => {
    const query = (term ?? q).trim();
    setOpenSuggest(false);
    if (!query) return navigate('/documents');
    pushRecent(query);
    navigate(`/documents?search=${encodeURIComponent(query)}`);
  };

  const filteredSuggest = (q.trim()
    ? recent.filter((x) => x.toLowerCase().includes(q.trim().toLowerCase()))
    : recent);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-20 flex h-16 items-center justify-between px-6 transition-all duration-300',
        sidebarOpen ? 'left-[240px]' : 'left-[72px]'
      )}
      style={{
        background: 'rgba(6,13,31,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Search + suggestions */}
      <div ref={searchRef} className="relative flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpenSuggest(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goSearch();
              if (e.key === 'Escape') {
                setQ('');
                setOpenSuggest(false);
              }
            }}
            type="text"
            placeholder="Rechercher un document… (Entrée)"
            className="input pl-9 pr-10 h-9 text-sm"
          />

          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-white/[0.08] transition"
              title="Effacer"
            >
              <X className="h-4 w-4 text-slate-400 mx-auto" />
            </button>
          )}
        </div>

        <button
          onClick={() => goSearch()}
          className="hidden sm:inline-flex px-4 h-9 items-center rounded-xl text-sm font-semibold text-white transition"
          style={{ background: 'rgba(37,99,235,0.20)', border: '1px solid rgba(37,99,235,0.28)' }}
        >
          Rechercher
        </button>

        {openSuggest && filteredSuggest.length > 0 && (
          <div
            className="absolute left-0 top-[44px] w-full rounded-2xl overflow-hidden shadow-card z-50"
            style={{ background: '#0f2048', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="px-4 py-3 flex items-center justify-between"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold text-slate-300">Recherches récentes</p>
              <button
                className="text-xs text-slate-400 hover:text-slate-200 transition"
                onClick={() => { setRecent([]); writeSearches([]); }}
              >
                Effacer
              </button>
            </div>

            <div className="py-1">
              {filteredSuggest.map((s) => (
                <button
                  key={s}
                  onClick={() => goSearch(s)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.08] transition"
                >
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          title="Notifications"
        >
          <Bell className="h-4 w-4 text-slate-300" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-navy-950" />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-expanded={menuOpen}
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-blue-400">
                {user?.role ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-card animate-fade-in"
              style={{ background: '#0f2048', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4" /> Paramètres
                </button>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}