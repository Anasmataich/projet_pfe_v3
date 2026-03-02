import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { MFAForm } from '@/components/auth/MFAForm';
import { useAuth } from '@/hooks/useAuth';
import { Shield, FileText, Cpu, Lock } from 'lucide-react';

const FEATURES = [
  { icon: Shield,   label: 'Sécurité ISO 27001', desc: 'Authentification MFA & chiffrement AES-256' },
  { icon: FileText, label: 'GED Intelligente',   desc: 'Classification & OCR automatisés par IA' },
  { icon: Cpu,      label: 'IA Intégrée',         desc: "Résumé, extraction NLP et détection d'anomalies" },
  { icon: Lock,     label: "Contrôle d'accès",    desc: 'RBAC multi-rôles et journalisation complète' },
];

export function LoginPage() {
  const { login, verifyMFA, pendingMFA } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

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
    <div className="flex min-h-screen" style={{ background: 'var(--navy-950)' }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center px-16 overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-25 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 65%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 65%)', transform: 'translate(30%, 30%)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10 max-w-lg w-full animate-fade-in">
          {/* Logo block */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-glow-blue"
                 style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <span className="text-xl font-extrabold text-white tracking-tight">GED</span>
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-tight">Plateforme Documentaire</p>
              <p className="text-sm text-blue-300">Ministère de l'Éducation Nationale</p>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Gérez vos documents<br />
            <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #06b6d4)' }}>
              intelligemment.
            </span>
          </h1>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            Système sécurisé de gestion électronique de documents — ISO/IEC 27001 conforme.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label}
                   className="flex items-center gap-4 rounded-xl p-4 animate-fade-in"
                   style={{
                     background: 'rgba(255,255,255,0.04)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     animationDelay: `${i * 0.08}s`,
                   }}>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(37,99,235,0.20)' }}>
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <span className="text-sm font-extrabold text-white">GED</span>
            </div>
            <p className="text-base font-bold text-white">Plateforme Documentaire</p>
          </div>

          {!pendingMFA ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Connexion</h2>
              <p className="text-sm text-slate-400 mb-8">Accédez à votre espace sécurisé</p>
              <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Vérification MFA</h2>
              <p className="text-sm text-slate-400 mb-8">Entrez le code généré par votre application d'authentification</p>
              <MFAForm onSubmit={handleMFA} isLoading={isLoading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
