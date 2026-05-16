import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows: orders } = await pool.query(
      `SELECT o.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'price_at_purchase', oi.price_at_purchase,
                    'product', row_to_json(p.*)
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) AS order_items,
              row_to_json(a.*) AS address
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN addresses a ON a.id = o.address_id
       WHERE o.user_id = $1
       GROUP BY o.id, a.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId, total, items, paymentMethod]
 *             properties:
 *               addressId:
 *                 type: string
 *                 format: uuid
 *               total:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               orderNumber:
 *                 type: string
 *               couponId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               couponDiscount:
 *                 type: number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity, price]
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Missing required fields
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
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { addressId, total, items, paymentMethod, orderNumber, couponId, couponDiscount } =
      req.body;

    if (!addressId || total === undefined || !items || !paymentMethod) {
      res
        .status(400)
        .json({ error: 'addressId, total, items, and paymentMethod are required' });
      return;
    }

    await client.query('BEGIN');

    const generatedOrderNumber =
      orderNumber || `PW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, address_id, total_amount, status, order_number, payment_method, coupon_id, coupon_discount)
       VALUES ($1, $2, $3, 'ordered', $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        addressId,
        total,
        generatedOrderNumber,
        paymentMethod,
        couponId || null,
        couponDiscount || 0,
      ]
    );

    const order = orderRows[0];

    for (const item of items as { productId: string; quantity: number; price: number }[]) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.quantity, item.price]
      );

      await client.query(
        `UPDATE products SET stock_quantity = GREATEST(stock_quantity - $1, 0) WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ data: order });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Order not found
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
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    await pool.query(
      `UPDATE orders SET status = 'canceled' WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /orders/{id}/return:
 *   post:
 *     summary: Initiate a return for an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Return initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Order not found
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
router.post('/:id/return', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    await pool.query(
      `UPDATE orders SET status = 'returned' WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Return initiated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /orders/{id}/sync:
 *   get:
 *     summary: Sync order status (fetch latest from DB)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
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
router.get('/:id/sync', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT o.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'price_at_purchase', oi.price_at_purchase
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) AS order_items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
