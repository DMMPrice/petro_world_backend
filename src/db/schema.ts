import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  avatar_url: text('avatar_url'),
  role: text('role').notNull().default('customer'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Categories ───────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  icon: text('icon'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Sub Categories ───────────────────────────────────────────────────────────
export const subCategories = pgTable('sub_categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  category_id: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  brand_name: text('brand_name'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  price_after_discount: numeric('price_after_discount', { precision: 10, scale: 2 }),
  discount_type: text('discount_type'),
  discount_value: numeric('discount_value', { precision: 10, scale: 2 }).default('0'),
  discount_percent: integer('discount_percent').default(0),
  description: text('description'),
  image_url: text('image_url'),
  gallery_urls: text('gallery_urls').array().default(sql`'{}'`),
  images: text('images').array().default(sql`'{}'`),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  category_id: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  sub_category_id: uuid('sub_category_id').references(() => subCategories.id, { onDelete: 'set null' }),
  weight: numeric('weight', { precision: 10, scale: 3 }).default('0.5'),
  length: numeric('length', { precision: 10, scale: 2 }).default('10'),
  width: numeric('width', { precision: 10, scale: 2 }).default('10'),
  height: numeric('height', { precision: 10, scale: 2 }).default('10'),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('0'),
  num_reviews: integer('num_reviews').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Banners ──────────────────────────────────────────────────────────────────
export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title'),
  subtitle: text('subtitle'),
  image_url: text('image_url').notNull(),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Addresses ────────────────────────────────────────────────────────────────
export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  address_line1: text('address_line1').notNull(),
  address_line2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').unique().notNull(),
  discount_type: text('discount_type').notNull().default('percentage'),
  discount_value: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
  expiry: timestamp('expiry', { withTimezone: true }).notNull(),
  min_order_value: numeric('min_order_value', { precision: 10, scale: 2 }).default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  address_id: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('ordered'),
  order_number: text('order_number').unique().notNull(),
  payment_method: text('payment_method').notNull().default('Cash on Delivery'),
  razorpay_payment_id: text('razorpay_payment_id'),
  coupon_id: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  coupon_discount: numeric('coupon_discount', { precision: 10, scale: 2 }).default('0'),
  shipment_id: text('shipment_id'),
  tracking_number: text('tracking_number'),
  shipping_label_url: text('shipping_label_url'),
  courier_status: text('courier_status'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  order_id: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(),
  price_at_purchase: numeric('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Cart ─────────────────────────────────────────────────────────────────────
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.user_id, t.product_id)]);

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.user_id, t.product_id)]);

// ── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.user_id, t.product_id)]);

// ── Search History ───────────────────────────────────────────────────────────
export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Recently Viewed ──────────────────────────────────────────────────────────
export const recentlyViewed = pgTable('recently_viewed', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.user_id, t.product_id)]);

// ── FAQs ─────────────────────────────────────────────────────────────────────
export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Support Tickets ──────────────────────────────────────────────────────────
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject'),
  message: text('message').notNull(),
  status: text('status').notNull().default('Open'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Support Messages ─────────────────────────────────────────────────────────
export const supportMessages = pgTable('support_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ticket_id: uuid('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  sender_id: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  is_admin: boolean('is_admin').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Settings ─────────────────────────────────────────────────────────────────
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  key: text('key').unique().notNull(),
  value: text('value'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Delivery Estimates ───────────────────────────────────────────────────────
export const deliveryEstimates = pgTable('delivery_estimates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  pincode_prefix: text('pincode_prefix').notNull(),
  min_days: integer('min_days').notNull().default(3),
  max_days: integer('max_days').notNull().default(7),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
