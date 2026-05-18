import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAdmin } from '../middleware/adminAuth';
import bcrypt from 'bcrypt';

const router = Router();
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints (requires admin JWT)
 */

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [products, orders, users, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
      pool.query('SELECT COUNT(*)::int AS count, status FROM orders GROUP BY status'),
      pool.query('SELECT COUNT(*)::int AS count FROM users WHERE role = $1', ['customer']),
      pool.query(`SELECT COALESCE(SUM(total_amount),0)::numeric AS total FROM orders WHERE status NOT IN ('canceled','returned')`),
    ]);
    const ordersByStatus: Record<string, number> = {};
    for (const row of orders.rows) ordersByStatus[row.status] = row.count;
    res.json({
      totalProducts: products.rows[0].count,
      totalCustomers: users.rows[0].count,
      totalRevenue: parseFloat(revenue.rows[0].total),
      ordersByStatus,
      totalOrders: Object.values(ordersByStatus).reduce((a: number, b) => a + (b as number), 0),
    });
  } catch (err) { next(err); }
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: Get all products (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.title AS category_title, sc.title AS sub_category_title
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/products:
 *   post:
 *     summary: Create product
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title, brand_name, price, price_after_discount, discount_type, discount_value, discount_percent,
      description, image_url, gallery_urls, images, stock_quantity, category_id, sub_category_id,
      weight, length, width, height,
    } = req.body;
    const resolvedImageUrl = image_url || (gallery_urls && gallery_urls[0]) || (images && images[0]) || null;
    const resolvedGallery = gallery_urls || images || [];
    const { rows } = await pool.query(
      `INSERT INTO products (title, brand_name, price, price_after_discount, discount_type, discount_value, discount_percent,
        description, image_url, gallery_urls, stock_quantity, category_id, sub_category_id, weight, length, width, height)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        title, brand_name || '', price, price_after_discount || null, discount_type || null, discount_value || 0, discount_percent || 0,
        description, resolvedImageUrl, resolvedGallery, stock_quantity || 0, category_id || null, sub_category_id || null,
        weight || 0.5, length || 10, width || 10, height || 10,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/products/{id}:
 *   patch:
 *     summary: Update product
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = [
      'title', 'brand_name', 'price', 'price_after_discount', 'discount_type', 'discount_value', 'discount_percent',
      'description', 'image_url', 'gallery_urls', 'stock_quantity', 'category_id', 'sub_category_id',
      'weight', 'length', 'width', 'height',
    ];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (fields.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...fields.map(f => req.body[f])];
    const { rows } = await pool.query(`UPDATE products SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`, values);
    if (rows.length === 0) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/orders', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows: orders } = await pool.query(`
      SELECT o.*,
        u.first_name, u.last_name, u.email AS user_email,
        a.name AS address_name, a.address_line1, a.city, a.state, a.pincode,
        json_agg(json_build_object(
          'id', oi.id, 'quantity', oi.quantity, 'price_at_purchase', oi.price_at_purchase,
          'product', json_build_object('id', p.id, 'title', p.title, 'brand_name', p.brand_name, 'images', p.images)
        )) AS order_items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id, u.first_name, u.last_name, u.email, a.name, a.address_line1, a.city, a.state, a.pincode
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /admin/orders/{id}:
 *   patch:
 *     summary: Update order status/shipping
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['status','tracking_number','shipping_label_url','courier_status'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (fields.length === 0) { res.status(400).json({ error: 'No valid fields' }); return; }
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...fields.map(f => req.body[f])];
    const { rows } = await pool.query(
      `UPDATE orders SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`, values
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── USERS / CUSTOMERS ───────────────────────────────────────────────────────
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, role, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const hash = await bcrypt.hash(password || 'Admin@123', 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, role`,
      [email, hash, firstName || '', lastName || '', role || 'customer']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, first_name, last_name, phone } = req.body;
    const allowed: Record<string, unknown> = {};
    if (role) allowed['role'] = role;
    if (first_name) allowed['first_name'] = first_name;
    if (last_name) allowed['last_name'] = last_name;
    if (phone) allowed['phone'] = phone;
    const fields = Object.keys(allowed);
    if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING id, email, first_name, last_name, role`,
      [req.params.id, ...fields.map(f => allowed[f])]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, json_agg(json_build_object('id', sc.id, 'title', sc.title, 'category_id', sc.category_id))
        FILTER (WHERE sc.id IS NOT NULL) AS sub_categories
      FROM categories c
      LEFT JOIN sub_categories sc ON sc.category_id = c.id
      GROUP BY c.id ORDER BY c.title
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/sub-categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sub_categories ORDER BY title');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/sub-categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO sub_categories (title, category_id) VALUES ($1,$2) RETURNING *',
      [title, category_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/sub-categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category_id } = req.body;
    const { rows } = await pool.query(
      'UPDATE sub_categories SET title=$1, category_id=$2 WHERE id=$3 RETURNING *',
      [title, category_id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/sub-categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM sub_categories WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, icon } = req.body;
    const { rows } = await pool.query('INSERT INTO categories (title, icon) VALUES ($1,$2) RETURNING *', [title, icon]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, icon } = req.body;
    const { rows } = await pool.query('UPDATE categories SET title=$1, icon=$2 WHERE id=$3 RETURNING *', [title, icon, req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── COUPONS ─────────────────────────────────────────────────────────────────
router.get('/coupons', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discount_type, discount_value, active, expiry, min_order_value } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, active, expiry, min_order_value)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [code, discount_type || 'percentage', discount_value, active ?? true, expiry, min_order_value || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['code','discount_type','discount_value','active','expiry','min_order_value'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE coupons SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...fields.map(f => req.body[f])]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/coupons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── BANNERS ─────────────────────────────────────────────────────────────────
router.get('/banners', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, subtitle, image_url, active, created_at FROM banners ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/banners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, image_url, active } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO banners (title, subtitle, image_url, active) VALUES ($1,$2,$3,$4) RETURNING id, title, subtitle, image_url, active, created_at',
      [title, subtitle, image_url, active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/banners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['title','subtitle','image_url','active'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE banners SET ${sets} WHERE id = $1 RETURNING id, title, subtitle, image_url, active, created_at`,
      [req.params.id, ...fields.map(f => req.body[f])]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/banners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── ADDRESSES ───────────────────────────────────────────────────────────────
router.get('/addresses', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.email, u.first_name, u.last_name
      FROM addresses a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/addresses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['name','phone','address_line1','address_line2','city','state','pincode','is_default'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (fields.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }
    if (req.body.is_default) {
      const current = await pool.query('SELECT user_id FROM addresses WHERE id = $1', [req.params.id]);
      if (current.rows[0]) {
        await pool.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id <> $2',
          [current.rows[0].user_id, req.params.id]
        );
      }
    }
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE addresses SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...fields.map(f => req.body[f])]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/addresses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings');
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(map);
  } catch (err) { next(err); }
});

router.patch('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
      );
    }
    const { rows } = await pool.query('SELECT * FROM settings');
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  } catch (err) { next(err); }
});

// ─── DELIVERY ESTIMATES ──────────────────────────────────────────────────────
router.get('/delivery-estimates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT * FROM delivery_estimates ORDER BY pincode_prefix');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/delivery-estimates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pincode_prefix, min_days, max_days, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO delivery_estimates (pincode_prefix, min_days, max_days, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [pincode_prefix, min_days, max_days, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/delivery-estimates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pincode_prefix, min_days, max_days, description } = req.body;
    const { rows } = await pool.query(
      'UPDATE delivery_estimates SET pincode_prefix=$1, min_days=$2, max_days=$3, description=$4 WHERE id=$5 RETURNING *',
      [pincode_prefix, min_days, max_days, description, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/delivery-estimates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM delivery_estimates WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── FAQs ────────────────────────────────────────────────────────────────────
router.get('/faqs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT * FROM faqs ORDER BY sort_order, created_at');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/faqs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, answer, is_active, sort_order } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO faqs (question, answer, is_active, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [question, answer, is_active ?? true, sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/faqs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['question', 'answer', 'is_active', 'sort_order'];
    const fields = Object.keys(req.body).filter((key) => allowed.includes(key));
    if (fields.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }
    const sets = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE faqs SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...fields.map((field) => req.body[field])]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
router.get('/notifications', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, user_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notifications (title, body, user_id) VALUES ($1,$2,$3) RETURNING *',
      [title, body, user_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/notifications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.delete('/faqs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query('DELETE FROM faqs WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
