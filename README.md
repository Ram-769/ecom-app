# Forma — a single-screen ecommerce sample

A responsive Angular + PrimeNG storefront with a typed Node/Express API and MongoDB Atlas persistence. Browse eight locally illustrated products, search, filter, sort, save favorites, manage a persistent bag, and place a sample order without leaving the page.

## Run locally

Use Node.js 20.19+ (20.x), 22.12+ (22.x), or 24.x and npm. Angular 21 is selected to support the installed Node 20 runtime.

```sh
npm install
```

Copy `.env.example` to `.env` in the repository root (PowerShell: `Copy-Item .env.example .env`).

```sh
npm run dev
```

Open **http://127.0.0.1:4200**. The API runs at **http://127.0.0.1:4000/api**. With `DATA_MODE=demo`, products and orders live in memory; restarting the API resets them. The storefront labels this mode. Cart and saved product IDs persist in browser local storage.

## Connect MongoDB Atlas

The Atlas project overview URL is an admin console link, not a database connection URI.

1. In your Atlas project, open **Cluster0 → Connect → Drivers** and copy the connection URI.
2. Set `DATA_MODE=mongodb`, `MONGODB_URI` and `MONGODB_DB=ecom_app` in `.env`. URL-encode the database user's password. Never put credentials in Angular code or Git.
3. Give the database user read/write access to `ecom_app` and allow your machine's current public IP in Atlas **Database & Network Access**. Use a specific IP entry for local development.
4. Run `npm run seed` once to add the sample catalog, then `npm run dev`. The seed inserts missing products only; it preserves existing inventory and orders.

MongoDB mode fails clearly when the database is unreachable; it never silently falls back to demo data. If your ISP's DNS rejects Atlas SRV queries, optionally set `NODE_DNS_SERVERS=1.1.1.1,8.8.8.8` in `.env`. This affects only this Node process. Set it only when those resolvers are appropriate for your network.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build shared contracts, then start API and Angular dev server |
| `npm run seed` | Add sample products to Atlas without resetting existing data |
| `npm test` | Run API validation, totals, stock, concurrency, and idempotency tests |
| `npm run build` | Compile shared contracts, API, and optimized Angular application |
| `npm start` | Run compiled API; with `NODE_ENV=production`, also serve Angular |

For a local production preview, build first, set `NODE_ENV=production` in `.env`, then run `npm start` and open **http://localhost:4000**. The API intentionally binds to loopback. If deploying behind a trusted reverse proxy/container, configure the bind address and trusted proxy settings for that environment, restrict CORS, use HTTPS, and manage secrets through your host.

## Structure

```text
client/src/app/
  core/          # typed models, constants, catalog/cart/favorites/order services
  shared/        # reusable product card, money pipe, storage utilities
  features/
    storefront/  # lazy-loaded page and cart/checkout component
client/public/   # original local SVG product artwork; no image-service dependency
server/src/
  repositories/  # memory and MongoDB adapters behind one interface
  data/          # sample catalog
  app.ts         # HTTP routes, security, validation, error handling
  order.ts       # authoritative order totals and request schema
packages/contracts/ # shared DTOs, money rules, and checkout limits
```

Components are standalone, use external HTML/SCSS and `OnPush`, and run with Angular zoneless change detection. Signals manage local state. HTTP subscriptions use `takeUntilDestroyed`. PrimeNG supplies buttons, selects, inputs, drawers, dialogs, skeletons, and toasts.

## API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Database ping and explicit data mode |
| GET | `/api/products` | Catalog with prices in integer paise and current stock |
| POST | `/api/orders` | Validate details, calculate totals, reserve stock, save sample order |

Checkout requires a UUID `Idempotency-Key` header and a body with `customer: { name, email, address }` and `items: [{ productId, quantity }]`. Repeating the same request/key returns the original order. Reusing a key for different data returns 409. MongoDB transactions atomically decrement inventory and create the order; failed checkouts roll back all stock changes. Unique indexes enforce product IDs and checkout keys.

All totals are calculated by the server. Quantities are limited to 10 per product. Shipping is ₹99 below ₹5,000 and free at or above ₹5,000. Input schemas reject unknown fields, duplicate product IDs, and client-supplied totals. The API includes Helmet headers, explicit CORS origin, bounded JSON payloads, rate limits, and sanitized errors.

This is a sample storefront. Checkout uses **test customer details**, saves a `sample-confirmed` order, and does not charge, email, or ship anything. The service promises, ratings, and review counts are illustrative sample content. Real commerce would require authentication/authorization, payment integration, taxes, fulfillment, privacy/retention controls, and operational hardening appropriate to deployment.

CI runs the API suite and builds all workspaces without requiring Atlas credentials. `.env`, dependencies, and build outputs are excluded from Git.

## Deploy to Netlify and Render

The repository includes `netlify.toml` and `render.yaml` for separate frontend and API hosting. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the exact build commands, environment variables, Atlas access, and deployment checks. The production frontend reads its HTTPS API endpoint from a generated public `app-config.json`; MongoDB credentials belong only in Render's secret environment variables.
