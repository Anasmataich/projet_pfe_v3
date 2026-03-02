// notification.service.ts - service de notifications en base de données

import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import { AppError } from '../../shared/AppError';
import { NotificationType } from '../../shared/enums';
import logger from '../../utils/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message?: string;
}

// ─────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────

function mapRowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    type: row['type'] as NotificationType,
    title: row['title'] as string,
    message: (row['message'] as string | null) ?? null,
    readAt: row['read_at'] ? new Date(row['read_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
  };
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const notificationService = {
  /**
   * Crée une notification pour un utilisateur
   */
  create: async (input: CreateNotificationInput): Promise<Notification> => {
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO notifications (id, user_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, input.userId, input.type ?? NotificationType.INFO, input.title, input.message ?? null]
    );
    logger.debug(`[Notifications] Notification créée pour userId : ${input.userId}`);
    return mapRowToNotification(result.rows[0] as Record<string, unknown>);
  },

  /**
   * Récupère les notifications d'un utilisateur
   */
  findByUser: async (
    userId: string,
    page = 1,
    limit = 20,
    onlyUnread = false
  ): Promise<{ notifications: Notification[]; total: number }> => {
    const offset = (page - 1) * limit;
    const unreadClause = onlyUnread ? 'AND read_at IS NULL' : '';

    const [rows, countRow] = await Promise.all([
      db.query(
        `SELECT * FROM notifications WHERE user_id = $1 ${unreadClause}
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM notifications WHERE user_id = $1 ${unreadClause}`,
        [userId]
      ),
    ]);

    return {
      notifications: rows.rows.map((r) => mapRowToNotification(r as Record<string, unknown>)),
      total: parseInt((countRow.rows[0] as Record<string, unknown>)['total'] as string, 10),
    };
  },

  /**
   * Marque une notification comme lue
   */
  markAsRead: async (id: string, userId: string): Promise<Notification> => {
    const result = await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    if (!result.rows[0]) throw AppError.notFound('Notification');
    return mapRowToNotification(result.rows[0] as Record<string, unknown>);
  },

  /**
   * Marque toutes les notifications d'un utilisateur comme lues
   */
  markAllAsRead: async (userId: string): Promise<number> => {
    const result = await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  },

  /**
   * Supprime les notifications lues de plus de 30 jours
   */
  cleanup: async (): Promise<number> => {
    const result = await db.query(
      `DELETE FROM notifications WHERE read_at IS NOT NULL AND read_at < NOW() - INTERVAL '30 days'`
    );
    const count = result.rowCount ?? 0;
    if (count > 0) logger.info(`[Notifications] Nettoyage : ${count} notifications supprimées`);
    return count;
  },

  /**
   * Envoie des notifications à plusieurs utilisateurs (broadcast)
   */
  broadcast: async (
    userIds: string[],
    input: Omit<CreateNotificationInput, 'userId'>
  ): Promise<void> => {
    if (userIds.length === 0) return;
    const values = userIds
      .map((uid, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`)
      .join(', ');
    const params = userIds.flatMap((uid) => [
      uuidv4(),
      uid,
      input.type ?? NotificationType.INFO,
      input.title,
      input.message ?? null,
    ]);
    await db.query(
      `INSERT INTO notifications (id, user_id, type, title, message) VALUES ${values}`,
      params
    );
    logger.debug(`[Notifications] Broadcast envoyé à ${userIds.length} utilisateur(s)`);
  },
};

export default notificationService;
