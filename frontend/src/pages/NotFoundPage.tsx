import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--navy-950)' }}>
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-blue-400 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page introuvable</h1>
        <p className="text-sm text-slate-400 mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <button className="btn-primary" onClick={() => navigate('/')}>
            <Home className="h-4 w-4" /> Accueil
          </button>
        </div>
      </div>
    </div>
  );
}
