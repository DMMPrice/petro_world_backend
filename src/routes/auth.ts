import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client();
const passwordResetCodes = new Map<
  string,
  { codeHash: string; expiresAt: number }
>();

function generateResetCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function validatePassword(password: string) {
  return typeof password === 'string' && password.length >= 8;
}

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     firstName: { type: string }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName) {
      res.status(400).json({ error: 'email, password and firstName are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if ((existing.rowCount ?? 0) > 0) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, firstName, lastName || '']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const valid = Boolean(user.password_hash) && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Exchange a Google ID token for a Petro World JWT.
 * The Google token is verified server-side; the client never gets to choose
 * the user identity or issue its own Petro World session.
 */
router.post('/google', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idToken = req.body?.idToken?.toString();
    const audience = process.env.GOOGLE_WEB_CLIENT_ID;

    if (!idToken || !audience) {
      res.status(400).json({ error: 'Google sign-in is not configured' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      res.status(401).json({ error: 'Invalid Google account' });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const firstName = payload.given_name || payload.name?.split(' ')[0] || '';
    const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
    const avatarUrl = payload.picture || null;

    let result = await pool.query(
      `SELECT id, email, first_name, last_name, role
       FROM users WHERE google_id = $1`,
      [googleId]
    );

    if ((result.rowCount ?? 0) === 0) {
      result = await pool.query(
        `UPDATE users
         SET google_id = $1,
             auth_provider = CASE WHEN auth_provider = 'password' THEN 'password,google' ELSE 'google' END,
             first_name = COALESCE(NULLIF(first_name, ''), $2),
             last_name = COALESCE(NULLIF(last_name, ''), $3),
             avatar_url = COALESCE(avatar_url, $4),
             updated_at = NOW()
         WHERE email = $5
         RETURNING id, email, first_name, last_name, role`,
        [googleId, firstName, lastName, avatarUrl, email]
      );
    }

    if ((result.rowCount ?? 0) === 0) {
      result = await pool.query(
        `INSERT INTO users (email, google_id, auth_provider, first_name, last_name, avatar_url)
         VALUES ($1, $2, 'google', $3, $4, $5)
         RETURNING id, email, first_name, last_name, role`,
        [email, googleId, firstName, lastName, avatarUrl]
      );
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof Error && /Token used too late|Wrong number of segments|Invalid token/i.test(err.message)) {
      res.status(401).json({ error: 'Invalid or expired Google token' });
      return;
    }
    next(err);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Unauthorized
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, avatar_url, role FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let resetCode: string | null = null;

    if ((result.rowCount ?? 0) > 0) {
      resetCode = generateResetCode();
      const codeHash = await bcrypt.hash(resetCode, 10);
      passwordResetCodes.set(email, {
        codeHash,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
    }

    res.json({
      message: 'If an account exists for this email, a reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' && resetCode ? { code: resetCode } : {}),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    const code = req.body.code?.toString().trim();
    const password = req.body.password?.toString();

    if (!email || !code || !password) {
      res.status(400).json({ error: 'email, code, and password are required' });
      return;
    }
    if (!validatePassword(password)) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const reset = passwordResetCodes.get(email);
    if (!reset || reset.expiresAt < Date.now()) {
      passwordResetCodes.delete(email);
      res.status(400).json({ error: 'Invalid or expired reset code' });
      return;
    }

    const validCode = await bcrypt.compare(code, reset.codeHash);
    if (!validCode) {
      res.status(400).json({ error: 'Invalid or expired reset code' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
      [passwordHash, email]
    );

    passwordResetCodes.delete(email);

    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentPassword = req.body.currentPassword?.toString();
    const newPassword = req.body.newPassword?.toString();

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword are required' });
      return;
    }
    if (!validatePassword(newPassword)) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = Boolean(result.rows[0].password_hash) && await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      req.user.id,
    ]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
