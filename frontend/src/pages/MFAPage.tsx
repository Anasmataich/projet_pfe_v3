import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MFAForm } from '@/components/auth/MFAForm';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function MFAPage() {
  const { pendingMFA, verifyMFA } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!pendingMFA) return <Navigate to="/login" replace />;

  const handleSubmit = async (token: string) => {
    setIsLoading(true);
    try {
      await verifyMFA(token);
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--navy-950)' }}>
      <div className="w-full max-w-sm card p-8">
        <MFAForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
