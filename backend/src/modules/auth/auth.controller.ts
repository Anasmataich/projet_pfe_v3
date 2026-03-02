// auth.controller.ts - contrôleur d'authentification (cookies HttpOnly)

import { Request, Response, CookieOptions } from 'express';
import { ApiResponse } from '../../shared/ApiResponse';
import { HttpStatus } from '../../shared/enums';
import { authService } from './auth.service';
import { extractBearerToken, getTokenExpirationDate } from '../../config/jwt';
import type { TokenPair } from '../../config/jwt';
import env from '../../config/env';
import {
  validateLoginInput,
  validateRegisterInput,
  validateMfaVerifyInput,
  validateMfaEnableInput,
  validateRefreshInput,
  validateChangePasswordInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} from './auth.validation';

// ─────────────────────────────────────────────
// Helpers — cookies sécurisés
// ─────────────────────────────────────────────

const isProduction = env.NODE_ENV === 'production';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
};

/**
 * Place les tokens JWT dans des cookies HttpOnly sécurisés.
 */
const setAuthCookies = (res: Response, tokens: TokenPair): void => {
  res.cookie('access_token', tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: getTokenExpirationDate(tokens.accessExpiresIn).getTime() - Date.now(),
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    ...baseCookieOptions,
    path: '/',  // accessible par /auth/refresh
    maxAge: getTokenExpirationDate(tokens.refreshExpiresIn).getTime() - Date.now(),
  });
};

/**
 * Supprime les cookies d'authentification.
 */
const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', { ...baseCookieOptions });
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/' });
};

// ─────────────────────────────────────────────
// Contrôleurs
// ─────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  const input = validateRegisterInput(req.body);
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const result = await authService.register(
    input.email,
    input.password,
    ipAddress,
    input.firstName,
    input.lastName
  );

  // Si le résultat contient des tokens, les placer dans les cookies
  if (result.tokens) {
    setAuthCookies(res, result.tokens);
  }

  // Renvoyer la réponse sans les tokens dans le body
  const { tokens: _tokens, ...safeResult } = result;
  ApiResponse.created(res, safeResult, 'Compte créé avec succès');
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const input = validateLoginInput(req.body);
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const result = await authService.login(input.email, input.password, ipAddress);

  // Si MFA requis, renvoyer le pendingToken dans le body (pas de cookie encore)
  if (result.requiresMFA) {
    ApiResponse.success(res, {
      requiresMFA: true,
      userId: result.userId,
      pendingToken: result.pendingToken,
    }, 'MFA requis');
    return;
  }

  // Login réussi — placer les tokens dans les cookies
  if (result.tokens) {
    setAuthCookies(res, result.tokens);
  }

  // Renvoyer la réponse sans les tokens dans le body
  const { tokens: _tokens, ...safeResult } = result;
  ApiResponse.success(res, safeResult, 'Connexion réussie');
};

export const verifyMFA = async (req: Request, res: Response): Promise<void> => {
  const input = validateMfaVerifyInput(req.body);
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const tokens = await authService.verifyMFA(input.userId, input.totpToken, input.pendingToken, ipAddress);

  // Placer les tokens dans les cookies
  setAuthCookies(res, tokens);

  ApiResponse.success(res, { verified: true }, 'MFA vérifié avec succès');
};

export const setupMFA = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const result = await authService.setupMFA(userId);
  ApiResponse.success(res, result, 'Scannez le QR code avec votre application TOTP');
};

export const enableMFA = async (req: Request, res: Response): Promise<void> => {
  const input = validateMfaEnableInput(req.body);
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await authService.enableMFA(userId, input.totpToken, ipAddress);
  ApiResponse.success(res, null, 'MFA activé avec succès');
};

export const disableMFA = async (req: Request, res: Response): Promise<void> => {
  const input = validateMfaEnableInput(req.body);
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await authService.disableMFA(userId, input.totpToken, ipAddress);
  ApiResponse.success(res, null, 'MFA désactivé');
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const input = validateChangePasswordInput(req.body);
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await authService.changePassword(userId, input.currentPassword, input.newPassword, ipAddress);
  ApiResponse.success(res, null, 'Mot de passe mis à jour avec succès');
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  // Lire le refresh token depuis le cookie en priorité, puis fallback sur le body
  const refreshToken =
    (req.cookies as Record<string, string>)?.refresh_token ??
    (req.body as { refreshToken?: string })?.refreshToken;

  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    ApiResponse.error(res, 'refreshToken requis (cookie ou body)', HttpStatus.BAD_REQUEST);
    return;
  }

  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const tokens = await authService.refreshTokens(refreshToken, ipAddress);

  // Mettre à jour les cookies avec les nouveaux tokens
  setAuthCookies(res, tokens);

  ApiResponse.success(res, { refreshed: true }, 'Tokens rafraîchis');
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Lire le token depuis le cookie en priorité, puis fallback sur le header
  const token =
    (req.cookies as Record<string, string>)?.access_token ??
    extractBearerToken(req.headers['authorization']);

  if (!token) {
    ApiResponse.error(res, 'Token manquant', HttpStatus.UNAUTHORIZED);
    return;
  }

  const userId = req.user?.userId;
  if (!userId) {
    ApiResponse.error(res, 'Non authentifié', HttpStatus.UNAUTHORIZED);
    return;
  }

  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  await authService.logout(token, userId, ipAddress);

  // Effacer les cookies
  clearAuthCookies(res);

  ApiResponse.success(res, null, 'Déconnexion réussie');
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const result = await import('../../config/database').then((m) =>
    m.default.query(
      'SELECT id, email, role, status, first_name, last_name, mfa_enabled, created_at FROM users WHERE id = $1',
      [userId]
    )
  );
  const user = result.rows[0];
  if (!user) {
    ApiResponse.error(res, 'Utilisateur introuvable', HttpStatus.NOT_FOUND);
    return;
  }
  ApiResponse.success(res, user, 'Profil utilisateur');
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const input = validateForgotPasswordInput(req.body);
  await authService.forgotPassword(input.email);
  // Toujours renvoyer un succès pour empêcher l'énumération d'emails
  ApiResponse.success(res, null, 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const input = validateResetPasswordInput(req.body);
  await authService.resetPassword(input.token, input.newPassword);
  ApiResponse.success(res, null, 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
};
