import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import * as crypto from 'crypto';
import * as https from 'https';
import { pool } from '../config/database';
import { validateOrderPricing } from '../utils/pricing';

const router = Router();

// ── Razorpay HTTP helper ──────────────────────────────────────────────────────

function razorpayRequest(method: string, path: string, body?: object): Promise<any> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Promise.reject(new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured in .env'));
  }

  const auth    = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const bodyStr = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.razorpay.com',
      path:     `/v1${path}`,
      method,
      headers: {
        Authorization:   `Basic ${auth}`,
        'Content-Type':  'application/json',
        ...(bodyStr ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if ((res.statusCode ?? 0) >= 400) {
            reject(new Error(parsed?.error?.description ?? `Razorpay error ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error('Invalid response from Razorpay'));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── POST /payments/create-razorpay-order ─────────────────────────────────────

router.post(
  '/create-razorpay-order',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      if (!keyId || !process.env.RAZORPAY_KEY_SECRET) {
        res.status(503).json({ error: 'Payment gateway not configured. Please contact support.' });
        return;
      }

      const { amount, currency = 'INR', receipt } = req.body;
      if (amount === undefined || amount === null) {
        res.status(400).json({ error: 'amount is required' });
        return;
      }

      // Razorpay expects amount in smallest unit (paise for INR)
      const amountInPaise = Math.round(parseFloat(amount) * 100);

      const order = await razorpayRequest('POST', '/orders', {
        amount:   amountInPaise,
        currency,
        receipt:  receipt ?? `pw_${Date.now()}`,
      });

      res.json({
        razorpay_order_id: order.id,
        key_id:            keyId,
        amount:            order.amount,
        currency:          order.currency,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /payments/verify-razorpay ───────────────────────────────────────────
// Verifies Razorpay signature, then places the order in the DB atomically.

router.post(
  '/verify-razorpay',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        res.status(503).json({ error: 'Payment gateway not configured.' });
        return;
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        addressId,
        total,
        items,
        couponId,
        couponDiscount,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({
          error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
        });
        return;
      }

      // ── Signature verification (Timing attack safe) ──────────────────────
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSig, 'hex');
      let signatureBuffer: Buffer;
      try {
        signatureBuffer = Buffer.from(razorpay_signature, 'hex');
      } catch {
        res.status(400).json({ error: 'Invalid payment signature format.' });
        return;
      }

      if (
        expectedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
      ) {
        res.status(400).json({ error: 'Invalid payment signature. Payment may be fraudulent.' });
        return;
      }

      // ── Place order in DB ───────────────────────────────────────────────
      if (!addressId || total === undefined || !items) {
        res.status(400).json({ error: 'addressId, total, and items are required to place order' });
        return;
      }

      // Validate the order pricing and stock server-side
      const pricingResult = await validateOrderPricing(
        items,
        couponId,
        Number(total),
        Number(couponDiscount || 0)
      );

      if (!pricingResult.valid) {
        res.status(400).json({ error: pricingResult.error });
        return;
      }

      // Fetch the order from Razorpay to verify the paid amount
      const razorpayOrder = await razorpayRequest('GET', `/orders/${razorpay_order_id}`);
      const expectedAmountInPaise = Math.round(pricingResult.total * 100);
      if (Math.abs(razorpayOrder.amount - expectedAmountInPaise) > 5) {
        res.status(400).json({
          error: `Payment amount discrepancy. Expected ${expectedAmountInPaise} paise, but order was registered for ${razorpayOrder.amount} paise.`,
        });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orderNumber = `PW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const { rows: orderRows } = await client.query(
          `INSERT INTO orders
             (user_id, address_id, total_amount, status, order_number,
              payment_method, razorpay_payment_id, coupon_id, coupon_discount)
           VALUES ($1, $2, $3, 'ordered', $4, 'Razorpay', $5, $6, $7)
           RETURNING *`,
          [
            req.user.id,
            addressId,
            pricingResult.total,
            orderNumber,
            razorpay_payment_id,
            couponId ?? null,
            pricingResult.couponDiscount,
          ]
        );

        const order = orderRows[0];

        for (const item of pricingResult.verifiedItems) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
             VALUES ($1, $2, $3, $4)`,
            [order.id, item.productId, item.quantity, item.price]
          );
          await client.query(
            `UPDATE products
             SET stock_quantity = GREATEST(stock_quantity - $1, 0)
             WHERE id = $2`,
            [item.quantity, item.productId]
          );
        }

        await client.query('COMMIT');
        res.status(201).json({ data: order });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
