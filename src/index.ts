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
  const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@petroworld.in']);
  if ((adminCheck.rowCount ?? 0) === 0) {
    const hash = await bcrypt.hash('Admin@123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, 'Admin', 'PetroWorld', 'admin')`,
      ['admin@petroworld.in', hash]
    );
    console.log('👤 Admin created: admin@petroworld.in / Admin@123');
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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
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
