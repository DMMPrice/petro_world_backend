import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     full_name:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     email:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM profiles WHERE id = $1`,
      [req.user.id]
    );
    res.json({ data: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: No valid fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['full_name', 'avatar_url', 'phone'];
    const updates = Object.entries(req.body).filter(([key]) => allowed.includes(key));

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }

    const setClauses = updates.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map(([, val]) => val);
    values.push(req.user.id);

    const { rows } = await pool.query(
      `UPDATE profiles SET ${setClauses}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    res.json({ data: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

export default router;
