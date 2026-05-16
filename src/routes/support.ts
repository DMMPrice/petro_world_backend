import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Customer support tickets and messages
 */

/**
 * @swagger
 * /support/tickets:
 *   get:
 *     summary: Get all support tickets for current user
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of support tickets
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
 *                       subject:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [open, in_progress, resolved, closed]
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
router.get('/tickets', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM support_tickets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /support/tickets:
 *   post:
 *     summary: Create a new support ticket with an initial message
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
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
router.post('/tickets', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      res.status(400).json({ error: 'subject and message are required' });
      return;
    }

    await client.query('BEGIN');

    const { rows: ticketRows } = await client.query(
      `INSERT INTO support_tickets (user_id, subject, status)
       VALUES ($1, $2, 'open')
       RETURNING *`,
      [req.user.id, subject]
    );

    const ticket = ticketRows[0];

    await client.query(
      `INSERT INTO support_messages (ticket_id, sender_id, message)
       VALUES ($1, $2, $3)`,
      [ticket.id, req.user.id, message]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: ticket });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /support/tickets/{id}/messages:
 *   get:
 *     summary: Get messages for a support ticket
 *     tags: [Support]
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
 *         description: List of ticket messages
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
 *                       sender_id:
 *                         type: string
 *                         format: uuid
 *                       message:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Ticket not found
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
router.get('/tickets/:id/messages', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { rows: ticketRows } = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (ticketRows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT * FROM support_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /support/tickets/{id}/messages:
 *   post:
 *     summary: Send a message in a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket not found
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
router.post('/tickets/:id/messages', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const { rows: ticketRows } = await pool.query(
      `SELECT id FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (ticketRows.length === 0) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.id, message]
    );

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
