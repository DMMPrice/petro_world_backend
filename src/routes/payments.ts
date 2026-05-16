import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment gateway integration stubs
 */

/**
 * @swagger
 * /payments/create-razorpay-order:
 *   post:
 *     summary: Create a Razorpay order (stub — configure Razorpay keys in .env)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in smallest currency unit (paise)
 *               currency:
 *                 type: string
 *                 default: INR
 *               receipt:
 *                 type: string
 *     responses:
 *       501:
 *         description: Not implemented — configure Razorpay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 instructions:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/create-razorpay-order',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({
        message: 'Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
        instructions:
          'Install the razorpay npm package, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env, then implement order creation using the Razorpay Node SDK.',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /payments/verify-razorpay:
 *   post:
 *     summary: Verify a Razorpay payment (stub — configure Razorpay keys in .env)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       501:
 *         description: Not implemented — configure Razorpay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 instructions:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/verify-razorpay',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({
        message: 'Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
        instructions:
          'Use crypto.createHmac("sha256", RAZORPAY_KEY_SECRET) to verify the signature from razorpay_order_id + "|" + razorpay_payment_id.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
