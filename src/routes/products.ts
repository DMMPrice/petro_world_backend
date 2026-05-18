import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

function withResolvedImages<T extends Record<string, any>>(product: T): T & { images: string[] } {
  const images = Array.from(
    new Set(
      [
        product.image_url,
        ...(Array.isArray(product.gallery_urls) ? product.gallery_urls : []),
        ...(Array.isArray(product.images) ? product.images : []),
      ].filter(Boolean)
    )
  ) as string[];

  return { ...product, images };
}

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product catalogue endpoints
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category UUID
 *       - in: query
 *         name: categoryName
 *         schema:
 *           type: string
 *         description: Filter by category name (case-insensitive)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, categoryName, limit = '20', offset = '0' } = req.query;

    const params: unknown[] = [
      categoryId || null,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10),
      categoryName ? `%${categoryName}%` : null,
    ];

    const { rows } = await pool.query(
      `SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
       WHERE ($1::uuid IS NULL OR p.category_id = $1)
         AND ($4::text IS NULL OR c.title ILIKE $4)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    res.json({ data: rows.map(withResolvedImages) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /products/trending:
 *   get:
 *     summary: Get trending products (10 most recently added)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of trending products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/trending', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
       ORDER BY p.created_at DESC
       LIMIT 10`
    );
    res.json({ data: rows.map(withResolvedImages) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /products/search:
 *   get:
 *     summary: Search products by title or brand name
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = '20', offset = '0' } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
       WHERE p.title ILIKE $1 OR p.brand_name ILIKE $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    res.json({ data: rows.map(withResolvedImages) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ data: withResolvedImages(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /products/{id}/related:
 *   get:
 *     summary: Get related products (same subcategory or category)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of related products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows: productRows } = await pool.query(
      `SELECT sub_category_id, category_id FROM products WHERE id = $1`,
      [id]
    );

    if (productRows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const { sub_category_id, category_id } = productRows[0];

    let queryText: string;
    let queryParams: unknown[];

    if (sub_category_id) {
      queryText = `
        SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
        WHERE p.sub_category_id = $1 AND p.id != $2
        ORDER BY p.created_at DESC
        LIMIT 10`;
      queryParams = [sub_category_id, id];
    } else {
      queryText = `
        SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
        WHERE p.category_id = $1 AND p.id != $2
        ORDER BY p.created_at DESC
        LIMIT 10`;
      queryParams = [category_id, id];
    }

    const { rows } = await pool.query(queryText, queryParams);
    res.json({ data: rows.map(withResolvedImages) });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /products/{id}/recommendations:
 *   get:
 *     summary: Get collaborative recommendations for a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of recommended products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/:id/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM get_collaborative_recommendations($1)`,
      [id]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
