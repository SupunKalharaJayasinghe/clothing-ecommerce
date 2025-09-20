# Clothing E-commerce (Full-stack)

A production-ready, full-stack clothing e-commerce app built with React + Vite (client) and Node.js + Express + MongoDB (server). This repo includes:

- Client UI/UX with routing, authentication, product listing/details, cart, checkout, orders, favorites, account.
- Secure backend API with authentication (JWT cookies + optional 2FA), products, reviews, orders, and payments (bank slip upload + PayHere form scaffolding).
- Production assets: Dockerfiles, Nginx config, docker-compose for API + Web + MongoDB, environment templates, and a dataset seeder.

## Tech Stack

- Client: React 19, React Router, Redux Toolkit, TailwindCSS, Vite
- Server: Express, Mongoose (MongoDB), Zod validation, Helmet, Rate limiting
- Auth: HTTP-only JWT cookies, rolling sessions, optional 2FA flow
- Payments: Bank transfer slip upload; PayHere card payment form scaffolding (sandbox)

## Project Structure

- `client/` – React app (Vite) + Tailwind CSS
- `server/` – Express API + Mongoose models + validation
- `docker-compose.yml` – Orchestrates `web` (nginx + client), `api` (server), and `mongo`

## Quick Start (Local Dev)

1) Install deps from repo root (workspaces):

```bash
npm install
```

2) Configure environments

- Server: copy `server/.env.example` to `server/.env` and adjust as needed (use local MongoDB or Atlas)
- Client: copy `client/.env.example` to `client/.env`

3) Run dev servers (concurrently):

```bash
npm run dev
```

- Client on http://localhost:5173
- API on http://localhost:4000

4) Seed sample products (optional):

```bash
npm --workspace server run seed
```

Ensure `MONGO_URI` in `server/.env` points to a writable MongoDB.

## API Overview

- `GET /api/health` – health check
- `POST /api/auth/register` – register
- `POST /api/auth/login` – login (may return `twoFARequired`)
- `POST /api/auth/2fa/verify` – verify 2FA challenge
- `GET /api/auth/me` – get session user
- `POST /api/auth/logout` – logout
- `GET /api/products` – list products with filters, facets, pagination
- `GET /api/products/:slug` – product details
- `GET /api/products/:slug/reviews` – public reviews
- `POST /api/products/:slug/reviews` – create my review (auth)
- `PATCH/DELETE /api/products/:slug/reviews/:id` – update/delete my review (auth)
- `POST /api/orders` – place order (auth). Supports `COD`, `CARD`, `BANK` methods
- `GET /api/orders/me` – list my orders (auth)
- `GET /api/orders/:id` – get my order (auth)
- `POST /api/payments/bank/:orderId/slip` – upload bank slip (auth, multipart field `slip`)

## Production (Docker Compose)

This repo contains production-ready Dockerfiles and Nginx config for a simple deployment.

1) Build and run:

```bash
docker compose up -d --build
```

- Web (client + nginx) on http://localhost
- API on http://localhost:4000
- MongoDB on localhost:27017 (exposed; secure accordingly in real deployments)

2) Configure server environment via `docker-compose.yml` env vars, or bind-mount `server/.env`.

3) Seed data into the `mongo` service:

```bash
docker compose exec api node src/scripts/seed.js
```

4) Upload directory for bank slips is persisted in the `receipts_data` volume.

## Security & Hardening Notes

- Set strong `JWT_SECRET` and use `COOKIE_SECURE=true` behind HTTPS.
- Adjust `CORS_ORIGIN` to your real frontend origin.
- Review CSP in `server/src/config/security.js` and add your CDN domains as needed.
- Disable port exposure for Mongo in production and use a managed DB or private network only.
- Integrate a real email service for password reset links (`auth.controller.js` TODO).
- Replace PayHere scaffold with a proper signature service and webhooks for payment confirmation.

## Known Improvements

- Add admin dashboard for catalog management.
- Add inventory webhooks and fulfillment tracking.
- Add unit/integration tests and CI.

## Troubleshooting

- If you see 401 errors after inactivity, the client retries `/auth/me` once to refresh rolling cookie; log back in if needed.
- For 429 rate limits in production, adjust limits in `server/src/config/security.js`.
- Ensure MongoDB text indexes are created; Mongoose autoIndex is enabled in dev (see `server/src/config/db.js`).
