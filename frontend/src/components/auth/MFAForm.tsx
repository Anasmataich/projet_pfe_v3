import { useState, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

interface Props {
  onSubmit: (token: string) => Promise<void>;
  isLoading: boolean;
}

export function MFAForm({ onSubmit, isLoading }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState('');

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const d = [...digits];
    d[i] = val.slice(-1);
    setDigits(d);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = digits.join('');
    if (token.length < 6) { setError('Veuillez entrer les 6 chiffres'); return; }
    try {
      await onSubmit(token);
    } catch {
      setError('Code invalide ou expiré');
      setDigits(Array(6).fill(''));
      inputs.current[0]?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center"
             style={{ background: 'rgba(37,99,235,0.15)' }}>
          <ShieldCheck className="h-7 w-7 text-blue-400" />
        </div>
        <p className="text-xs text-slate-400">
          Entrez le code à 6 chiffres généré par votre application d'authentification (Google Authenticator, Authy…)
        </p>
      </div>

      {/* 6-digit input */}
      <div className="flex justify-center gap-3" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-10 rounded-xl border text-center text-lg font-bold text-white transition-all duration-150"
            style={{
              background: d ? 'rgba(37,99,235,0.20)' : 'rgba(255,255,255,0.05)',
              borderColor: d ? 'rgba(59,130,246,0.60)' : 'rgba(255,255,255,0.12)',
              caretColor: '#60a5fa',
            }}
          />
        ))}
      </div>

      {error && <p className="alert-error text-xs text-center">{error}</p>}

      <button
        type="submit"
        disabled={isLoading || digits.join('').length < 6}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center gap-2 justify-center">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Vérification…
          </span>
        ) : 'Vérifier le code'}
      </button>
    </form>
  );
}
