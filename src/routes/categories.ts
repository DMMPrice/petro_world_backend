import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Product categories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories with nested sub-categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories with sub-categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Category'
 *                       - type: object
 *                         properties:
 *                           sub_categories:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 title:
 *                                   type: string
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              COALESCE(json_agg(sc.* ORDER BY sc.title) FILTER (WHERE sc.id IS NOT NULL), '[]') AS sub_categories
       FROM categories c
       LEFT JOIN sub_categories sc ON sc.category_id = c.id
       GROUP BY c.id
       ORDER BY c.title`
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
