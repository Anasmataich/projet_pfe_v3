// notification.routes.ts - routes pour les notifications

import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { notificationService } from './notification.service';
import { ApiResponse } from '../../shared/ApiResponse';
import { HttpStatus } from '../../shared/enums';

const router = Router();

const parseQueryInt = (val: unknown, defaultVal: number): number => {
  const n = parseInt(String(val ?? defaultVal), 10);
  return isNaN(n) ? defaultVal : Math.max(1, n);
};

router.use(authenticate);

// Lister les notifications de l'utilisateur connecté
router.get('/', async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const page = parseQueryInt(req.query['page'], 1);
  const limit = Math.min(parseQueryInt(req.query['limit'], 20), 100);
  const onlyUnread = req.query['unread'] === 'true';

  const { notifications, total } = await notificationService.findByUser(userId, page, limit, onlyUnread);
  ApiResponse.paginated(res, notifications, { page, limit, total });
});

// Marquer une notification comme lue
router.patch('/:id/read', async (req, res): Promise<void> => {
  const notification = await notificationService.markAsRead(req.params['id']!, req.user!.userId);
  ApiResponse.success(res, notification, 'Notification marquée comme lue');
});

// Marquer toutes les notifications comme lues
router.patch('/read-all', async (req, res): Promise<void> => {
  const count = await notificationService.markAllAsRead(req.user!.userId);
  ApiResponse.success(res, { updated: count }, `${count} notification(s) marquée(s) comme lue(s)`);
});

// Compter les notifications non lues
router.get('/unread-count', async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const { total } = await notificationService.findByUser(userId, 1, 1, true);
  ApiResponse.success(res, { count: total }, 'Notifications non lues');
});

export default router;
