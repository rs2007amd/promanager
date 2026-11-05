# PropManager pack: how to add this to your GitHub repo

This pack holds the code from our conversation: workflows, Prisma schema,
seed script, auth, Stripe checkout + webhook, rent cron job, maintenance
requests, dashboard, and README.

It is a starting point, not a finished app. NOT included (generate these
with Copilot using the earlier prompts): the login page, root layout and
home page, tenant home page, manager CRUD pages for properties, units,
tenants and leases, the manager maintenance list, and the tests.

## 1. Get a Next.js project into your repo

If your repo is empty (new):

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
npx create-next-app@latest . --typescript --tailwind --eslint --app --import-alias "@/*"
```

If your repo already has a Next.js (App Router, TypeScript) project, just
`cd` into it.

## 2. Create a branch

```bash
git switch -c feat/propmanager-starter
```

## 3. Apply the pack

```bash
bash /path/to/propmanager-pack/apply.sh
```

This copies the files in, installs dependencies, adds package.json scripts,
and adds `.env` to `.gitignore`.

## 4. Set up the database

```bash
cp .env.example .env     # fill in DATABASE_URL, AUTH_SECRET, Stripe test keys
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## 5. Commit and push

```bash
git add .
git status               # confirm .env is NOT listed
git commit -m "Add PropManager starter: schema, auth, payments, CI"
git push -u origin feat/propmanager-starter
```

Then open a pull request on GitHub. CI will run; the first run often fails
on a missing page, script or test. Paste the error into Copilot and fix.
The CI workflow expects Playwright and Vitest tests, so add at least one of
each, or temporarily remove those steps.

## 6. One-time GitHub settings

- Settings > Environments > New environment: `production`, add the secret
  `PRODUCTION_DATABASE_URL` (direct, non-pooled connection string)
- Settings > Branches: protect `main` and require the `test` check
- Settings > Code security: enable Dependabot alerts and secret scanning

## Version notes

- Newer Next.js releases may rename `middleware.ts` to `proxy.ts` and may
  remove `next lint`. If you see a warning, follow the Next.js docs.
- Prisma 7 moves the seed command into `prisma.config.ts`; the
  `package.json` "prisma.seed" setting is for Prisma 6 and earlier.
- `next.config.ts` is overwritten. If your project uses `next.config.mjs`,
  delete one of them and keep the Server Action body size setting.
