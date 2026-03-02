import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import { generateTokenPair, verifyRefreshToken, TokenPair } from '../../config/jwt';
import { redisService } from '../../config/redis';
import { mfaService } from './mfa.service';
import { AppError } from '../../shared/AppError';
import { UserRole, UserStatus, AuditAction } from '../../shared/enums';
import { createAuditLog } from '../../middlewares/auditLogger';
import { generateSecureToken } from '../../utils/encryption';
import { emailService, emailTemplates } from '../notifications/email.service';
import logger from '../../utils/logger';

const GENERIC_LOGIN_ERROR = 'Email ou mot de passe incorrect';
const TOKEN_FAMILY_PREFIX = 'tokenfamily:';
const RESET_TOKEN_PREFIX = 'reset_password:';
const RESET_TOKEN_TTL = 3600; // 1 heure

export interface LoginResult {
  requiresMFA: boolean;
  userId: string;
  pendingToken?: string;
  tokens?: TokenPair;
}

export interface RegisterResult {
  userId: string;
  email: string;
  tokens: TokenPair;
}

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrData: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
}

export const authService = {
  register: async (
    email: string,
    password: string,
    ipAddress: string,
    firstName?: string,
    lastName?: string
  ): Promise<RegisterResult> => {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      throw AppError.conflict('Un compte avec cet email existe déjà');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, status, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, email.toLowerCase(), passwordHash, UserRole.CONSULTANT, UserStatus.ACTIVE, firstName ?? null, lastName ?? null]
    );

    const sessionId = uuidv4();
    const tokenFamily = uuidv4();
    const tokens = generateTokenPair(id, email.toLowerCase(), UserRole.CONSULTANT, sessionId, tokenFamily);

    await redisService.set(`${TOKEN_FAMILY_PREFIX}${tokenFamily}`, id, 7 * 24 * 60 * 60);

    await createAuditLog({
      userId: id,
      action: AuditAction.USER_CREATE,
      ipAddress,
      details: { email, method: 'self_register' },
      success: true,
    });

    logger.info(`[Auth] Nouveau compte créé : ${email}`);
    return { userId: id, email: email.toLowerCase(), tokens };
  },

  login: async (email: string, password: string, ipAddress: string): Promise<LoginResult> => {
    const emailNorm = email.toLowerCase().trim();
    logger.debug(`[Auth:Login] Step 1 — Email reçu: "${emailNorm}"`);

    const result = await db.query<UserRow>(
      'SELECT id, email, password_hash, role, status, mfa_enabled, mfa_secret, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [emailNorm]
    );

    const user = result.rows[0];
    logger.debug(`[Auth:Login] Step 2 — Utilisateur trouvé: ${!!user}${user ? ` (id=${user.id}, status=${user.status})` : ''}`);

    if (!user) {
      await bcrypt.hash(password, 12);
      await createAuditLog({
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        details: { reason: 'invalid_credentials' },
        success: false,
      });
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    }

    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      throw AppError.forbidden(
        'Compte temporairement verrouillé suite à plusieurs tentatives échouées.'
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.forbidden('Compte inactif ou suspendu. Contactez l\'administrateur.');
    }

    const passwordHash = user.password_hash?.trim();
    if (!passwordHash) {
      logger.warn(`[Auth:Login] Utilisateur ${user.id} sans password_hash valide`);
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    }

    logger.debug(`[Auth:Login] Step 3 — Hash prefix: "${passwordHash.substring(0, 4)}", longueur: ${passwordHash.length}`);

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    logger.debug(`[Auth:Login] Step 4 — bcrypt.compare result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      await authService.incrementFailedAttempts(user.id);
      await createAuditLog({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        details: { reason: 'invalid_credentials' },
        success: false,
      });
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    }

    await db.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    if (user.mfa_enabled) {
      const pendingToken = generateSecureToken();
      await mfaService.storePendingMFA(user.id, pendingToken);
      logger.info(`[Auth] MFA requis pour : ${email}`);
      return { requiresMFA: true, userId: user.id, pendingToken };
    }

    const sessionId = uuidv4();
    const tokenFamily = uuidv4();
    const tokens = generateTokenPair(user.id, user.email, user.role, sessionId, tokenFamily);

    await redisService.set(`${TOKEN_FAMILY_PREFIX}${tokenFamily}`, user.id, 7 * 24 * 60 * 60);

    await createAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN,
      ipAddress,
      success: true,
    });

    logger.info(`[Auth] Connexion réussie : ${email}`);
    return { requiresMFA: false, userId: user.id, tokens };
  },

  verifyMFA: async (
    userId: string,
    totpToken: string,
    pendingToken: string,
    ipAddress: string
  ): Promise<TokenPair> => {
    const isPendingValid = await mfaService.validatePendingMFA(userId, pendingToken);
    if (!isPendingValid) {
      throw AppError.unauthorized('Session MFA invalide ou expirée. Recommencez la connexion.');
    }

    const result = await db.query<UserRow>(
      'SELECT id, email, role, mfa_secret FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user || !user.mfa_secret) {
      throw AppError.unauthorized('Utilisateur introuvable ou MFA non configuré');
    }

    const isValid = mfaService.verifyToken(totpToken, user.mfa_secret);
    if (!isValid) {
      await createAuditLog({
        userId,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        details: { reason: 'invalid_mfa_token' },
        success: false,
      });
      throw AppError.unauthorized('Code MFA invalide');
    }

    const sessionId = uuidv4();
    const tokenFamily = uuidv4();
    const tokens = generateTokenPair(user.id, user.email, user.role, sessionId, tokenFamily);

    await redisService.set(`${TOKEN_FAMILY_PREFIX}${tokenFamily}`, user.id, 7 * 24 * 60 * 60);

    await createAuditLog({
      userId,
      action: AuditAction.MFA_VERIFIED,
      ipAddress,
      success: true,
    });

    logger.info(`[Auth] MFA vérifié avec succès pour userId : ${userId}`);
    return tokens;
  },

  setupMFA: async (userId: string): Promise<MfaSetupResult> => {
    const userResult = await db.query<UserRow>(
      'SELECT id, email, mfa_enabled FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) throw AppError.notFound('Utilisateur');
    if (user.mfa_enabled) {
      throw AppError.conflict('MFA est déjà activé sur ce compte');
    }

    const { secret, otpauthUrl } = mfaService.generateSecret(user.email);
    await redisService.set(`mfa:setup:${userId}`, secret, 600);

    logger.info(`[Auth] Configuration MFA initialisée pour userId : ${userId}`);
    return { secret, otpauthUrl, qrData: otpauthUrl };
  },

  enableMFA: async (userId: string, totpToken: string, ipAddress: string): Promise<void> => {
    const secret = await redisService.get(`mfa:setup:${userId}`);
    if (!secret) {
      throw AppError.badRequest('Session de configuration MFA expirée. Recommencez la configuration.');
    }

    const isValid = mfaService.verifyToken(totpToken, secret);
    if (!isValid) {
      throw AppError.badRequest('Code TOTP invalide. Vérifiez l\'heure de votre application.');
    }

    await db.query(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = $1, updated_at = NOW() WHERE id = $2',
      [secret, userId]
    );
    await redisService.del(`mfa:setup:${userId}`);

    await createAuditLog({
      userId,
      action: AuditAction.MFA_VERIFIED,
      ipAddress,
      details: { event: 'mfa_enabled' },
      success: true,
    });

    logger.info(`[Auth] MFA activé pour userId : ${userId}`);
  },

  disableMFA: async (userId: string, totpToken: string, ipAddress: string): Promise<void> => {
    const userResult = await db.query<UserRow>(
      'SELECT id, mfa_enabled, mfa_secret FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) throw AppError.notFound('Utilisateur');
    if (!user.mfa_enabled || !user.mfa_secret) {
      throw AppError.badRequest('MFA n\'est pas activé sur ce compte');
    }

    const isValid = mfaService.verifyToken(totpToken, user.mfa_secret);
    if (!isValid) {
      throw AppError.unauthorized('Code TOTP invalide');
    }

    await db.query(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    await createAuditLog({
      userId,
      action: AuditAction.USER_UPDATE,
      ipAddress,
      details: { event: 'mfa_disabled' },
      success: true,
    });

    logger.info(`[Auth] MFA désactivé pour userId : ${userId}`);
  },

  changePassword: async (
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string
  ): Promise<void> => {
    const userResult = await db.query<UserRow>(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) throw AppError.notFound('Utilisateur');

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw AppError.unauthorized('Mot de passe actuel incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw AppError.badRequest('Le nouveau mot de passe doit être différent de l\'actuel');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    await authService.invalidateAllSessions(userId);

    await createAuditLog({
      userId,
      action: AuditAction.USER_UPDATE,
      ipAddress,
      details: { event: 'password_changed' },
      success: true,
    });

    logger.info(`[Auth] Mot de passe changé et sessions invalidées pour userId : ${userId}`);
  },

  refreshTokens: async (refreshToken: string, ipAddress: string): Promise<TokenPair> => {
    const payload = verifyRefreshToken(refreshToken);

    const isBlacklisted = await redisService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw AppError.unauthorized('Refresh token révoqué. Reconnectez-vous.');
    }

    const familyOwner = await redisService.get(`${TOKEN_FAMILY_PREFIX}${payload.tokenFamily}`);
    if (!familyOwner || familyOwner !== payload.sub) {
      if (familyOwner) {
        await redisService.del(`${TOKEN_FAMILY_PREFIX}${payload.tokenFamily}`);
      }
      logger.warn(`[Auth] Token family reuse detected for userId: ${payload.sub}`);
      await createAuditLog({
        userId: payload.sub,
        action: AuditAction.LOGIN_FAILED,
        ipAddress,
        details: { reason: 'token_family_reuse', tokenFamily: payload.tokenFamily },
        success: false,
      });
      throw AppError.unauthorized('Activité suspecte détectée. Reconnectez-vous.');
    }

    const result = await db.query<UserRow>(
      'SELECT id, email, role, status FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw AppError.unauthorized('Utilisateur introuvable ou inactif');
    }

    const ttl = 7 * 24 * 60 * 60;
    await redisService.blacklistToken(refreshToken, ttl);

    const newTokenFamily = uuidv4();
    const newTokens = generateTokenPair(user.id, user.email, user.role, payload.sessionId, newTokenFamily);

    await redisService.del(`${TOKEN_FAMILY_PREFIX}${payload.tokenFamily}`);
    await redisService.set(`${TOKEN_FAMILY_PREFIX}${newTokenFamily}`, user.id, ttl);

    return newTokens;
  },

  logout: async (accessToken: string, userId: string, ipAddress: string): Promise<void> => {
    await redisService.blacklistToken(accessToken, 15 * 60);

    await createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      ipAddress,
      success: true,
    });

    logger.info(`[Auth] Déconnexion — userId : ${userId}`);
  },

  invalidateAllSessions: async (userId: string): Promise<void> => {
    await redisService.set(`sessions:invalidated:${userId}`, Date.now().toString(), 7 * 24 * 60 * 60);
    logger.info(`[Auth] Toutes les sessions invalidées pour userId : ${userId}`);
  },

  // ─────────────────────────────────────────────
  // Mot de passe oublié
  // ─────────────────────────────────────────────

  forgotPassword: async (email: string): Promise<void> => {
    // Toujours répondre rapidement (empêche l'énumération d'emails)
    const result = await db.query<{ id: string; first_name: string | null }>(
      'SELECT id, first_name FROM users WHERE email = $1 AND status = $2',
      [email, UserStatus.ACTIVE]
    );
    const user = result.rows[0];

    if (!user) {
      // Ne pas révéler si l'email existe — log uniquement
      logger.debug(`[Auth:ForgotPassword] Email inconnu ou inactif : ${email}`);
      return;
    }

    // Générer un token unique cryptographiquement sûr
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Stocker le hash dans Redis (TTL 1h)
    await redisService.set(`${RESET_TOKEN_PREFIX}${hashedToken}`, user.id, RESET_TOKEN_TTL);

    // Construire l'URL de réinitialisation
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Envoyer l'email
    const emailOptions = emailTemplates.passwordReset(email, resetUrl, user.first_name ?? undefined);
    await emailService.send(emailOptions);

    logger.info(`[Auth:ForgotPassword] Email de réinitialisation envoyé à ${email}`);
  },

  resetPassword: async (rawToken: string, newPassword: string): Promise<void> => {
    // Hash le token reçu pour chercher dans Redis
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const userId = await redisService.get(`${RESET_TOKEN_PREFIX}${hashedToken}`);

    if (!userId) {
      throw AppError.unauthorized('Token de réinitialisation invalide ou expiré.');
    }

    // Hash le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Mettre à jour en BDD
    await db.query(
      'UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [passwordHash, userId]
    );

    // Invalider le token (usage unique)
    await redisService.del(`${RESET_TOKEN_PREFIX}${hashedToken}`);

    // Invalider toutes les sessions existantes
    await authService.invalidateAllSessions(userId);

    logger.info(`[Auth:ResetPassword] Mot de passe réinitialisé pour userId : ${userId}`);
  },

  incrementFailedAttempts: async (userId: string): Promise<void> => {
    const result = await db.query<{ failed_login_attempts: number }>(
      'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1 RETURNING failed_login_attempts',
      [userId]
    );
    const attempts = result.rows[0]?.failed_login_attempts ?? 0;

    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await db.query('UPDATE users SET locked_until = $1 WHERE id = $2', [lockUntil, userId]);
      logger.warn(`[Auth] Compte verrouillé pour userId : ${userId} jusqu'à ${lockUntil.toISOString()}`);
    }
  },
};

export default authService;
