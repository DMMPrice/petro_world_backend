import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: FAQs
 *   description: Frequently asked questions
 */

/**
 * @swagger
 * /faqs:
 *   get:
 *     summary: Get all active FAQs
 *     tags: [FAQs]
 *     responses:
 *       200:
 *         description: List of active FAQs
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
 *                       question:
 *                         type: string
 *                       answer:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM faqs WHERE is_active = true ORDER BY created_at ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
