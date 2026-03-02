import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    const passwordsMatch = password === confirm && confirm.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!passwordValid) {
            setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
            return;
        }
        if (!passwordsMatch) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (!token) {
            setError('Token de réinitialisation manquant. Veuillez utiliser le lien reçu par email.');
            return;
        }

        setIsLoading(true);
        try {
            await authService.resetPassword(token, password);
            setSuccess(true);
        } catch {
            setError('Le lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6 py-12" style={{ background: 'var(--navy-950)' }}>
                <div className="w-full max-w-sm text-center animate-fade-in">
                    <p className="text-xl font-bold text-rose-400 mb-2">Lien invalide</p>
                    <p className="text-sm text-slate-400 mb-6">
                        Ce lien de réinitialisation est invalide. Veuillez demander un nouveau lien.
                    </p>
                    <Link to="/forgot-password" className="btn-primary inline-block">
                        Demander un nouveau lien
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-12" style={{ background: 'var(--navy-950)' }}>
            <div className="w-full max-w-sm animate-fade-in">

                {/* Logo */}
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                        <span className="text-sm font-extrabold text-white">GED</span>
                    </div>
                    <p className="text-base font-bold text-white">Plateforme Documentaire</p>
                </div>

                {!success ? (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-1">Nouveau mot de passe</h2>
                        <p className="text-sm text-slate-400 mb-8">
                            Choisissez un mot de passe sécurisé pour votre compte.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label className="label">Nouveau mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="input pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd((v) => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Strength indicators */}
                                {password.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex gap-1.5">
                                            {[
                                                password.length >= 8,
                                                /[A-Z]/.test(password),
                                                /[a-z]/.test(password),
                                                /\d/.test(password),
                                            ].map((ok, i) => (
                                                <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                                                    style={{ background: ok ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="label">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="input pl-10"
                                        required
                                    />
                                </div>
                                {confirm.length > 0 && !passwordsMatch && (
                                    <p className="text-[11px] text-rose-400 mt-1">Les mots de passe ne correspondent pas</p>
                                )}
                            </div>

                            {error && <p className="alert-error text-xs">{error}</p>}

                            <button
                                type="submit"
                                disabled={isLoading || !passwordValid || !passwordsMatch}
                                className="btn-primary w-full mt-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2 justify-center">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Réinitialisation…
                                    </span>
                                ) : 'Réinitialiser le mot de passe'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-14 w-14 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(34,197,94,0.15)' }}>
                                <CheckCircle className="h-7 w-7 text-emerald-400" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
                        </p>
                        <button onClick={() => navigate('/login')} className="btn-primary w-full">
                            Se connecter
                        </button>
                    </div>
                )}

                <Link to="/login" className="flex items-center gap-2 justify-center text-sm text-blue-400 hover:text-blue-300 mt-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Retour à la connexion
                </Link>
            </div>
        </div>
    );
}
