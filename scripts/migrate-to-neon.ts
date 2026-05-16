/**
 * One-time script: copies categories, sub_categories, and products
 * from local Postgres → Neon.
 *
 * Usage:
 *   npx ts-node scripts/migrate-to-neon.ts
 *
 * Required env vars (add to .env before running):
 *   NEON_HOST, NEON_DB, NEON_USER, NEON_PASSWORD
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const local = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'petroworld',
  user: 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || 'Babai@6157201',
  ssl: false,
});

const neon = new Pool({
  host: process.env.NEON_HOST!,
  port: 5432,
  database: process.env.NEON_DB!,
  user: process.env.NEON_USER!,
  password: process.env.NEON_PASSWORD!,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('🔄 Starting migration: local → Neon\n');

  // ── Categories ─────────────────────────────────────────────────────────────
  const { rows: cats } = await local.query('SELECT * FROM categories ORDER BY created_at');
  console.log(`📦 Migrating ${cats.length} categories...`);
  for (const row of cats) {
    await neon.query(
      `INSERT INTO categories (id, title, icon, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, icon = EXCLUDED.icon`,
      [row.id, row.title, row.icon, row.created_at]
    );
  }
  console.log('   ✅ Categories done');

  // ── Sub Categories ─────────────────────────────────────────────────────────
  const { rows: subCats } = await local.query('SELECT * FROM sub_categories ORDER BY created_at');
  console.log(`📦 Migrating ${subCats.length} sub-categories...`);
  for (const row of subCats) {
    await neon.query(
      `INSERT INTO sub_categories (id, category_id, title, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [row.id, row.category_id, row.title, row.created_at]
    );
  }
  console.log('   ✅ Sub-categories done');

  // ── Products ───────────────────────────────────────────────────────────────
  const { rows: products } = await local.query('SELECT * FROM products ORDER BY created_at');
  console.log(`📦 Migrating ${products.length} products...`);
  for (const row of products) {
    await neon.query(
      `INSERT INTO products (
         id, title, brand_name, price, price_after_discount,
         discount_type, discount_value, discount_percent,
         description, image_url, gallery_urls, images,
         stock_quantity, category_id, sub_category_id,
         weight, length, width, height,
         rating, num_reviews, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
       )
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         price = EXCLUDED.price,
         price_after_discount = EXCLUDED.price_after_discount,
         discount_type = EXCLUDED.discount_type,
         discount_value = EXCLUDED.discount_value,
         stock_quantity = EXCLUDED.stock_quantity,
         image_url = EXCLUDED.image_url,
         gallery_urls = EXCLUDED.gallery_urls`,
      [
        row.id, row.title, row.brand_name, row.price, row.price_after_discount,
        row.discount_type, row.discount_value, row.discount_percent,
        row.description, row.image_url, row.gallery_urls, row.images,
        row.stock_quantity, row.category_id, row.sub_category_id,
        row.weight, row.length, row.width, row.height,
        row.rating, row.num_reviews, row.created_at, row.updated_at,
      ]
    );
  }
  console.log('   ✅ Products done');

  console.log('\n🎉 Migration complete!');
}

migrate()
  .catch((err) => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await local.end();
    await neon.end();
  });
