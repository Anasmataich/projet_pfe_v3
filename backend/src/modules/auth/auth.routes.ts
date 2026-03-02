// auth.routes.ts - routes d'authentification

import { Router } from 'express';
import { authRateLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/authenticate';
import * as authController from './auth.controller';

const router = Router();

// Routes publiques (rate-limitées)
router.use(authRateLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/mfa/verify', authController.verifyMFA);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Routes authentifiées
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.patch('/password', authenticate, authController.changePassword);
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/enable', authenticate, authController.enableMFA);
router.delete('/mfa', authenticate, authController.disableMFA);

export default router;
