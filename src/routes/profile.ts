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
      `SELECT id, email, first_name, last_name, phone, avatar_url, role, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const user = rows[0];
    res.json({
      data: {
        id: user.id,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        phone: user.phone,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
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
    const allowed = ['first_name', 'last_name', 'phone', 'avatar_url'];
    
    // In case the client sends full_name, let's split it into first_name and last_name
    const body = { ...req.body };
    if (body.full_name && !body.first_name && !body.last_name) {
      const parts = body.full_name.trim().split(/\s+/);
      body.first_name = parts[0] || '';
      body.last_name = parts.slice(1).join(' ') || '';
      delete body.full_name;
    }

    const updates = Object.entries(body).filter(([key]) => allowed.includes(key));

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }

    const setClauses = updates.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map(([, val]) => val);
    values.push(req.user.id);

    const { rows } = await pool.query(
      `UPDATE users
       SET ${setClauses}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, email, first_name, last_name, phone, avatar_url, role, created_at, updated_at`,
      values
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const user = rows[0];
    res.json({
      data: {
        id: user.id,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        phone: user.phone,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
