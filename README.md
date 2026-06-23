# PetroWorld E-Commerce Backend API

An enterprise-ready, high-performance E-Commerce Backend API built using Node.js, Express, TypeScript, PostgreSQL, and Drizzle ORM. This backend handles product cataloging, order checkouts, Razorpay payment integrations, and secure administrator controls.

---

## 🚀 Features

*   **Secure Authentication:** JWT-based user authentication with strict rate limiting specifically configured for login and registration endpoints.
*   **Catalog Management:** Categorized catalog supporting brand filters, trending items, search queries, and collaborative product recommendations.
*   **User Workspace:** Scoped endpoints for cart management, wishlists, address books, product reviews, and personal profile updates.
*   **Secure Checkout & Payments:** 
    *   Cash on Delivery (COD) order placement.
    *   Razorpay integration featuring timing-safe signature validation and server-side payment verification.
    *   **Price Tampering Prevention:** Server-side validation of checkouts against real-time database product prices, stock levels, and active coupon expiration.
*   **Customer Support:** Support ticket creation and message exchanges between customers and administrators.
*   **Admin Dashboard:** Comprehensive metrics tracking user registration, revenue statistics, order status logs, and full CRUD capabilities for catalog resources.
*   **API Documentation:** Interactive OpenAPI/Swagger documentation.

---

## 🛠️ Technology Stack

*   **Core:** Node.js, Express, TypeScript
*   **Database & ORM:** PostgreSQL (`pg` client), Drizzle ORM, Drizzle Kit (for migration management)
*   **Security:**
    *   `helmet` (configured with customized Content Security Policies for websockets, style sheets, and scripts)
    *   `cors` (configured with strict whitelist verification in production mode)
    *   `express-rate-limit` (for brute-force mitigation)
    *   `bcrypt` (for secure password hashing)
*   **API Spec:** Swagger UI (`swagger-ui-express`), Swagger JSDoc

---

## ⚙️ Project Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) (or a cloud provider like Neon DB)

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory based on the `.env.example` template:
```env
PORT=3002
NODE_ENV=development

# Database configuration
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petroworld
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_SSL=true

# Auth Secrets
JWT_SECRET=your-production-strength-jwt-secret
DEFAULT_ADMIN_EMAIL=admin@petroworld.in
DEFAULT_ADMIN_PASSWORD=Admin@123

# Razorpay Keys
RAZORPAY_KEY_ID=rzp_test_yourkeyid
RAZORPAY_KEY_SECRET=yourkeysecret

# CORS Whitelist (comma-separated list for production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 🗄️ Database Commands

The project uses **Drizzle ORM** for database interaction and **Drizzle Kit** to handle schema migrations.

*   **Generate Migrations:** Compare the TypeScript schemas in `src/db/schema.ts` against the database and generate a SQL migration script.
    ```bash
    npm run db:generate
    ```
*   **Apply Migrations:** Apply all generated SQL migration scripts to the database.
    ```bash
    npm run db:migrate
    ```
*   **Direct Push:** Sync TypeScript schemas directly to the database without generating files (useful for quick prototyping in dev).
    ```bash
    npm run db:push
    ```
*   **Database GUI (Drizzle Studio):** Launch an interactive web browser dashboard to view and edit database rows.
    ```bash
    npm run db:studio
    ```
*   **Seed Database:** Reset the database and seed it with mock product catalog data.
    ```bash
    npm run db:reset
    ```

---

## 🏃 Running the Application

*   **Development Mode:** Starts the application on `http://localhost:3002` with hot reloading enabled (uses `ts-node-dev`).
    ```bash
    npm run dev
    ```
*   **Build Project:** Compiles TypeScript into production-ready JavaScript inside the `dist/` directory.
    ```bash
    npm run build
    ```
*   **Start Production Server:** Runs the compiled production code.
    ```bash
    npm start
    ```

---

## 🔒 Security Hardening

This application is hardened against common security issues before deployment:

1.  **Price Tampering Protection:** Order routes do not trust price or discount totals sent in the request body. Subtotals, coupon codes, and final totals are fetched, calculated, and validated server-side.
2.  **Timing-Safe Cryptography:** Uses `crypto.timingSafeEqual` to verify external payment signatures, neutralizing timing side-channel attacks.
3.  **Strict CORS Whitelisting:** Echoing origins dynamically is restricted to development mode. In production, CORS checks against the `ALLOWED_ORIGINS` whitelist.
4.  **Information Leak Prevention:** Production database stack traces and raw postgres errors are hidden from API response objects. Detailed errors are securely captured inside server log consoles.
5.  **Targeted Rate Limiting:** Stricter connection limits (10 attempts/min) are enforced on registration and authentication endpoints to block automated password brute-force script attempts.

---

## 📖 API Documentation

The project includes an interactive Swagger interface. Once the server is running, navigate to:

*   **Swagger Web UI:** [http://localhost:3002/api-docs](http://localhost:3002/api-docs)
*   **OpenAPI JSON Spec:** [http://localhost:3002/api-docs.json](http://localhost:3002/api-docs.json)

---

## 📂 Project Directory Structure

```text
petro_world_backend/
├── db/                     # Raw SQL scripts (schema.sql, seed.sql)
├── drizzle/                # Auto-generated SQL migration files
├── src/
│   ├── config/             # DB connection pools and Swagger setups
│   │   ├── database.ts
│   │   └── swagger.ts
│   ├── db/                 # Drizzle Schema files
│   │   └── schema.ts
│   ├── middleware/         # Auth checkers, error handlers, and rate limiters
│   │   ├── adminAuth.ts
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   └── rateLimiter.ts
│   ├── routes/             # Express route handlers
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   └── index.ts        # Route registry index
│   ├── utils/              # Calculation helpers (e.g., pricing validation)
│   │   └── pricing.ts
│   └── index.ts            # Entrypoint file
├── drizzle.config.ts       # Migration configurations
├── package.json
└── tsconfig.json
```
