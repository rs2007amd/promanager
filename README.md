# PropManager

A property management web app for managers and tenants. Managers track
properties, units, leases, rent, and maintenance. Tenants log in to view
their lease, pay rent online, and submit maintenance requests with photos.

## Features

- Manager dashboard: occupancy, vacant units, and overdue rent
- Role-based access (manager and tenant) with per-record permission checks
- Online rent payments through Stripe Checkout
- Automatic monthly rent charges (scheduled job)
- Maintenance requests with photo uploads and status tracking

## Tech stack

Next.js (App Router, TypeScript), PostgreSQL + Prisma, Auth.js, Tailwind CSS,
Stripe, Vercel Blob, Vitest, Playwright, GitHub Actions.

## Getting started

Prerequisites: Node.js 20+, a PostgreSQL database, a Stripe account (test
mode), and the Stripe CLI for local webhooks.

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
npm install
cp .env.example .env     # then fill in the values
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000.

### Test accounts (seed data, development only)

| Role | Email | Password |
|---|---|---|
| Manager | manager@example.com | ChangeMe123! |
| Tenant | avery@example.com | ChangeMe123! |

The seed script wipes existing data and refuses to run in production.

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing secret (`npx auth secret`) |
| `AUTH_URL` | Base URL of the app |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used for Stripe redirects |
| `STRIPE_SECRET_KEY` | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for photo uploads |
| `CRON_SECRET` | Protects the monthly rent-generation endpoint |

Never commit `.env`. Only `.env.example` (with empty values) belongs in Git.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | Lint the code |
| `npm run typecheck` | Type-check with TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npx prisma studio` | Browse the database |

## How rent payments work

1. On the 1st of each month, a scheduled job creates one `PENDING` payment
   per active lease.
2. The tenant clicks **Pay rent**, and a Stripe Checkout session is created
   from the amount stored in the database.
3. Stripe sends a webhook after payment, and only the webhook marks a
   payment as `PAID`.
4. Charges past their due date that are still unpaid appear as overdue on
   the manager dashboard.

## Security notes

- Every Server Action and API route checks permissions itself, not just
  middleware.
- Payment amounts always come from the database, never from the client.
- Card details never touch this server (Stripe-hosted checkout).

## Deployment

1. Create a hosted PostgreSQL database. Use its pooled URL for the app and
   its direct URL for migrations.
2. Import the repo into Vercel and set the environment variables above.
3. Add a Vercel Blob store for photo uploads.
4. Create a live Stripe webhook at `https://YOUR-DOMAIN/api/webhooks/stripe`
   subscribed to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and `checkout.session.expired`.
5. In GitHub, create a `production` environment with a
   `PRODUCTION_DATABASE_URL` secret (direct connection string). The
   `Migrate production database` workflow uses it after CI passes on `main`.

## Contributing

1. `git switch -c feature/short-description`
2. Small, focused commits
3. Open a pull request and wait for CI to pass

## License

Add a `LICENSE` file (for example MIT) before sharing the code publicly.
