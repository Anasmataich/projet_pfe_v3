// auth.routes.ts - routes d'authentification

import { Router } from 'express';
import { authRateLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/authenticate';
import * as authController from './auth.controller';

const router = Router();

// Rate limiter strict uniquement sur les tentatives de connexion (évite de bloquer /me, /refresh, /logout)
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/mfa/verify', authRateLimiter, authController.verifyMFA);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);

router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.patch('/password', authenticate, authController.changePassword);
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/enable', authenticate, authController.enableMFA);
router.delete('/mfa', authenticate, authController.disableMFA);

export default router;
