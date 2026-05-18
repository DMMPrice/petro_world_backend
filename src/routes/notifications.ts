import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /notifications
 * Returns all notifications for the current user:
 *   – Individual notifications (user_id = $userId)
 *   – Global/broadcast notifications (user_id IS NULL)
 * Ordered newest first, capped at 50.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/read-all
 * Mark all notifications visible to this user as read.
 * Must be registered BEFORE /:id/read to avoid "read-all" being parsed as an id.
 */
router.patch('/read-all', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(
      `UPDATE notifications SET read = true
       WHERE (user_id = $1 OR user_id IS NULL) AND read = false`,
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
