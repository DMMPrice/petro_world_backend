import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { pool } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error';
import routes from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

async function ensureDatabase() {
  const dbName = process.env.DB_NAME || 'petroworld';

  // Connect to default 'postgres' db to create our db if missing
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false,
  });

  try {
    const { rowCount } = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1', [dbName]
    );
    if (!rowCount) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Created database '${dbName}'`);
    }
  } finally {
    await adminPool.end();
  }
}

async function runSchema() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  if (!fs.existsSync(schemaPath)) return;
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('✅ Schema ready');
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
    await ensureDatabase();
    await runSchema();
    await autoSeed();
  } catch (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
