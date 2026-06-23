import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import bcrypt from 'bcrypt';
import { pool, db } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error';
import routes from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '500', 10);

async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
  console.log('✅ Migrations applied');
}

async function ensureAdmin() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set in environment. Skipping automatic admin setup.');
    return;
  }

  const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if ((adminCheck.rowCount ?? 0) === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, 'Admin', 'PetroWorld', 'admin')`,
      [adminEmail, hash]
    );
    console.log(`👤 Admin created: ${adminEmail}`);
  }
}

async function autoSeed() {
  const seedPath = path.join(__dirname, '../db/seed.sql');
  if (!fs.existsSync(seedPath)) return;

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count > 0) {
    console.log(`ℹ️  Database already has ${rows[0].count} products — skipping seed`);
  } else {
    const sql = fs.readFileSync(seedPath, 'utf8');
    await pool.query(sql);
    console.log('🌱 Database seeded with sample data');
  }

  await ensureAdmin();
}

async function bootstrap() {
  try {
    await runMigrations();
    await autoSeed();
  } catch (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  }
}

// Render/Cloudflare sit in front of the app in production. Without this,
// express-rate-limit can treat all proxied traffic as one client.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "http://localhost:*",
          "ws://localhost:*",
          "http://127.0.0.1:*",
          "ws://127.0.0.1:*",
          "https://*.idx.dev",
          "wss://*.idx.dev",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
      },
    },
  })
);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  })
);

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'PetroWorld API Docs',
    customCss: '.swagger-ui .topbar { background-color: #0f172a; }',
  })
);
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// Support Chrome DevTools Workspace association
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.json({
    workspace: {
      root: path.resolve(__dirname, '../'),
      uuid: '8e80b4ce-67d6-47b5-b0a8-6a70ff42d004',
    },
  });
});

// Root redirect to API Docs to prevent 404 and associated sandboxed CSP errors
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Routes
app.use('/api/v1', routes);

app.use(errorHandler);

bootstrap().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 PetroWorld backend running on http://localhost:${PORT}`);
    console.log(`📖 Swagger docs at http://localhost:${PORT}/api-docs\n`);
  });
});

export default app;
