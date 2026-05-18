import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Promotional banners
 */

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get all active banners
 *     tags: [Banners]
 *     responses:
 *       200:
 *         description: List of active banners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                       active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, subtitle, image_url, active, created_at
       FROM banners
       WHERE active = true
       ORDER BY created_at DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
