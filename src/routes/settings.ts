import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Application settings
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all application settings as a key-value map
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings key-value map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *                   example:
 *                     maintenance_mode: false
 *                     min_order_amount: 100
 *                     support_email: "support@petroworld.in"
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM settings`);

    const settings = rows.reduce(
      (acc: Record<string, unknown>, row: { key: string; value: unknown }) => {
        acc[row.key] = row.value;
        return acc;
      },
      {}
    );

    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

export default router;
