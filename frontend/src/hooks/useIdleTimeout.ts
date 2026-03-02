import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const IDLE_EVENTS: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000;         // Avertissement 1 min avant

/**
 * Hook de déconnexion automatique après 15 minutes d'inactivité.
 * Conforme aux directives DGSSI pour les applications manipulant des données classifiées.
 */
export function useIdleTimeout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningShown = useRef(false);

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        warningShown.current = false;
    }, []);

    const handleLogout = useCallback(() => {
        clearTimers();
        toast.error('Session expirée — Déconnexion automatique après 15 minutes d\'inactivité.', { duration: 6000, id: 'session-timeout' });
        logout();
    }, [clearTimers, logout]);

    const resetTimer = useCallback(() => {
        if (!isAuthenticated) return;
        clearTimers();

        // Avertissement 1 min avant la déconnexion
        warningRef.current = setTimeout(() => {
            if (!warningShown.current) {
                warningShown.current = true;
                toast('⏱ Votre session expire dans 1 minute. Bougez la souris pour rester connecté.', {
                    duration: 55_000,
                    id: 'session-warning',
                    style: { background: '#92400e', color: '#fef3c7', border: '1px solid #b45309' },
                });
            }
        }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);

        // Déconnexion
        timerRef.current = setTimeout(handleLogout, SESSION_TIMEOUT_MS);
    }, [isAuthenticated, clearTimers, handleLogout]);

    useEffect(() => {
        if (!isAuthenticated) {
            clearTimers();
            return;
        }

        // Démarrer le timer
        resetTimer();

        // Écouter les événements d'activité
        const handler = () => {
            if (warningShown.current) {
                toast.dismiss('session-warning');
            }
            resetTimer();
        };

        IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

        return () => {
            clearTimers();
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
        };
    }, [isAuthenticated, resetTimer, clearTimers]);
}
