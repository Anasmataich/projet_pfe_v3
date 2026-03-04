import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { MFAForm } from '@/components/auth/MFAForm';
import { useAuth } from '@/hooks/useAuth';
import { Shield, FileText, Cpu, Lock, CheckCircle2 } from 'lucide-react';

import logoMinistere from '../assets/images/logo-ministere.png';

type Feature = { icon: React.ElementType; label: string; desc: string };

export function LoginPage() {
  const { login, verifyMFA, pendingMFA } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const features: Feature[] = useMemo(
    () => [
      { icon: Shield, label: 'Sécurité renforcée', desc: 'MFA, chiffrement et journalisation.' },
      { icon: FileText, label: 'GED centralisée', desc: 'Organisation, versions et traçabilité.' },
      { icon: Cpu, label: 'IA intégrée', desc: 'Classification, extraction et assistance.' },
      { icon: Lock, label: "Contrôle d'accès", desc: 'RBAC multi-rôles et conformité.' },
    ],
    []
  );

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const requiresMFA = await login(email, password);
      if (!requiresMFA) navigate(from, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFA = async (token: string) => {
    setIsLoading(true);
    try {
      await verifyMFA(token);
      navigate(from, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy-950)' }}>
      {/* ── TOP BRAND BAR ── */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(6,13,31,0.70)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="rounded-2xl p-2.5 shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <img
                src={logoMinistere}
                alt="Ministère de l'Éducation Nationale"
                className="h-10 w-auto object-contain"
                loading="eager"
              />
            </div>

            <div className="min-w-0 leading-tight">
              <p className="text-sm font-extrabold text-white truncate">
                Ministère de l'Éducation Nationale
              </p>
              <p className="text-xs text-blue-300 truncate">
                Plateforme Documentaire — GED
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300/80">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              Conformité & sécurité
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.20)' }}
            >
              <Shield className="h-3.5 w-3.5 text-blue-300" />
              MFA activable
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* LEFT: value / info */}
          <section className="relative overflow-hidden rounded-3xl p-8 lg:p-10">
            {/* background */}
            <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950" />
            <div
              className="absolute -top-44 -left-44 w-[620px] h-[620px] rounded-full opacity-25 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 62%)' }}
            />
            <div
              className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-15 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 62%)' }}
            />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />

            <div className="relative z-10">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Plateforme GED
                <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #06b6d4)' }}
                >
                  sécurisée & intelligente
                </span>
              </h1>

              <p className="mt-4 text-slate-300/80 leading-relaxed max-w-xl">
                Accédez à un espace centralisé pour gérer, classer et suivre vos documents officiels,
                avec contrôle d’accès, traçabilité et fonctionnalités IA.
              </p>

              {/* feature list (lighter than cards) */}
              <div className="mt-8 space-y-3 max-w-xl">
                {features.map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(37,99,235,0.18)' }}
                    >
                      <Icon className="h-4 w-4 text-blue-300" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-slate-300/70">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-[11px] text-slate-300/60">
                Réservé aux agents autorisés. Les accès sont journalisés conformément aux politiques de sécurité.
              </p>
            </div>
          </section>

          {/* RIGHT: auth */}
          <section className="relative">
            <div
              className="rounded-3xl p-7 lg:p-8 backdrop-blur-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 22px 70px rgba(0,0,0,0.50)',
              }}
            >
              {/* security chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)', color: 'rgba(167,243,208,0.95)' }}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Connexion sécurisée
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
                  style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', color: 'rgba(253,230,138,0.95)' }}
                >
                  <Lock className="h-3.5 w-3.5" />
                  RBAC & Audit
                </span>
              </div>

              {!pendingMFA ? (
                <>
                  <h2 className="text-2xl font-extrabold text-white mb-1">Connexion</h2>
                  <p className="text-sm text-slate-300/70 mb-7">Accédez à votre espace sécurisé</p>
                  <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-extrabold text-white mb-1">Vérification MFA</h2>
                  <p className="text-sm text-slate-300/70 mb-7">
                    Entrez le code généré par votre application d'authentification
                  </p>
                  <MFAForm onSubmit={handleMFA} isLoading={isLoading} />
                </>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-400/70 mt-6">
              Accès réservé aux agents du Ministère de l'Éducation Nationale.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}