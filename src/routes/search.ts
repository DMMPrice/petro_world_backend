import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search history and recently viewed products
 */

/**
 * @swagger
 * /search/history:
 *   get:
 *     summary: Get user's search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent search queries
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
 *                       query:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM search_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /search/history:
 *   post:
 *     summary: Add a query to search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       201:
 *         description: Search history entry created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing query
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
router.post('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    // Remove duplicate entry for same query then insert fresh
    await pool.query(
      `DELETE FROM search_history WHERE user_id = $1 AND query = $2`,
      [req.user.id, query]
    );

    const { rows } = await pool.query(
      `INSERT INTO search_history (user_id, query) VALUES ($1, $2) RETURNING *`,
      [req.user.id, query]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /search/history:
 *   delete:
 *     summary: Clear all search history for current user
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search history cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(`DELETE FROM search_history WHERE user_id = $1`, [req.user.id]);
    res.json({ message: 'Search history cleared' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /search/recently-viewed:
 *   get:
 *     summary: Get recently viewed products
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recently viewed products
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
 *                       viewed_at:
 *                         type: string
 *                         format: date-time
 *                       products:
 *                         $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recently-viewed', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT rv.*, row_to_json(p.*) AS products
       FROM recently_viewed rv
       JOIN products p ON rv.product_id = p.id
       WHERE rv.user_id = $1
       ORDER BY rv.viewed_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /search/recently-viewed:
 *   post:
 *     summary: Record a product view
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: View recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing productId
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
router.post('/recently-viewed', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }

    // Remove old entry for same product then re-insert with current timestamp
    await pool.query(
      `DELETE FROM recently_viewed WHERE user_id = $1 AND product_id = $2`,
      [req.user.id, productId]
    );

    const { rows } = await pool.query(
      `INSERT INTO recently_viewed (user_id, product_id, viewed_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [req.user.id, productId]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
