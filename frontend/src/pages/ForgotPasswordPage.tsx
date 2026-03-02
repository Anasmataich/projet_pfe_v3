import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            setSent(true);
        } catch {
            setError('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setIsLoading(false);
        }
    };

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

                {!sent ? (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-1">Mot de passe oublié</h2>
                        <p className="text-sm text-slate-400 mb-8">
                            Entrez votre adresse email pour recevoir un lien de réinitialisation.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Adresse email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="prenom.nom@men.gov.ma"
                                        className="input pl-10"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {error && <p className="alert-error text-xs">{error}</p>}

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="btn-primary w-full mt-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2 justify-center">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Envoi…
                                    </span>
                                ) : 'Envoyer le lien'}
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
                        <h2 className="text-2xl font-bold text-white mb-2">Email envoyé !</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Si un compte existe avec l'adresse <strong className="text-slate-300">{email}</strong>,
                            vous recevrez un lien de réinitialisation dans quelques instants.
                        </p>
                        <p className="text-xs text-slate-500 mb-6">
                            Vérifiez votre dossier spam si vous ne recevez rien.
                        </p>
                    </div>
                )}

                <Link to="/login" className="flex items-center gap-2 justify-center text-sm text-blue-400 hover:text-blue-300 mt-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Retour à la connexion
                </Link>
            </div>
        </div>
    );
}
