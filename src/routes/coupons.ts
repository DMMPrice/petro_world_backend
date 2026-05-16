import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Discount coupon validation
 */

/**
 * @swagger
 * /coupons/validate:
 *   post:
 *     summary: Validate a coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Valid coupon details
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
 *                     code:
 *                       type: string
 *                     discount_type:
 *                       type: string
 *                       enum: [percentage, flat]
 *                     discount_value:
 *                       type: number
 *                     min_order_amount:
 *                       type: number
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: Missing code or coupon expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Coupon not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
      [code]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Coupon not found or inactive' });
      return;
    }

    const coupon = rows[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      res.status(400).json({ error: 'Coupon has expired' });
      return;
    }

    res.json({ data: coupon });
  } catch (err) {
    next(err);
  }
});

export default router;
