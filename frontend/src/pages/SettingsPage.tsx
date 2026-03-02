import { useState } from 'react';
import { Settings, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { ROLE_LABELS } from '@/utils/constants';
import { validatePassword } from '@/utils/validators';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');
    if (!currentPassword) { setError('Le mot de passe actuel est requis'); return; }
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }

    setIsChanging(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Mot de passe mis à jour');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(37,99,235,0.15)' }}>
            <Settings className="h-4.5 w-4.5 text-blue-400" />
          </div>
          Paramètres
        </h1>
        <p className="page-sub mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Profile info */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Informations du compte</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Rôle" value={user?.role ? ROLE_LABELS[user.role] : '—'} />
          <InfoRow label="Prénom" value={user?.firstName ?? '—'} />
          <InfoRow label="Nom" value={user?.lastName ?? '—'} />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Shield className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-400">
            MFA : {user?.mfaEnabled
              ? <span className="font-medium text-emerald-400">Activée</span>
              : <span className="text-slate-500">Désactivée</span>
            }
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Lock className="h-5 w-5 text-slate-400" /> Changer le mot de passe
        </h2>

        {error && <p className="alert-error">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="label">Mot de passe actuel</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" disabled={isChanging} onClick={handleChangePassword}>
            {isChanging ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5">{value}</p>
    </div>
  );
}
