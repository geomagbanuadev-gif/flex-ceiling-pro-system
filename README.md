# FlexCeiling Pro — Quote &amp; Invoice System

Internal web application for **FlexCeiling Pro Solution General Trading FZ LLC** for creating and
managing quotations, pro forma invoices, and tax invoices. Capture a job in a form, store it in
Postgres, and generate a clean, branded PDF on demand.

**Live:** https://admin.flex-ceiling-pro.com · internal access only · _proprietary._

## Features

- Quotations, pro forma invoices, and tax invoices with one-click conversions
- Automatic calculations (area × rate, VAT, advance / balance) and branded, on-demand PDFs
- Secure, token-scoped client **share links** (one document, no login required)
- Clients directory, dashboard, search / filter / sort / CSV export
- Role-based access (Super / Staff / Quotes / Invoices) with user management

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) ·
`@react-pdf/renderer` · Vitest · deployed on Vercel.

## Prerequisites

- Node.js 20+
- A Supabase project

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev                  # http://localhost:3000
```

**Database:** run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL Editor
(creates tables, roles, and RLS). Add your account in **Supabase → Authentication → Users** — the
first user is backfilled as an active super. Keep public sign-ups **off** (internal tool).

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **server-only**, never commit |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (type-check + compile) |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |
| `npm test` | Run the unit test suite (Vitest) |

## Project structure

```
src/app/          routes (login, dashboard, quotes, clients, settings, users, share)
src/components/    UI components (shell, forms, PDF documents, …)
src/utils/         business logic + Supabase clients (+ co-located *.test.ts)
supabase/          schema.sql (tables + RBAC + RLS)
docs/              user guide, deployment notes
```

## Testing

```bash
npm test
```

Unit tests (Vitest) cover the money math, document numbering, role/access matrix, and document
rules. The production build + type-check run on every deploy.

## Deployment

Auto-deploys to **Vercel** on every push to `main`. See [`DEPLOY.md`](DEPLOY.md) for the full
runbook (env vars, domain, and Supabase setup).

## Documentation

- [User Guide](docs/USER_GUIDE.md) — end-user manual
- [Deployment](DEPLOY.md) — hosting & setup runbook

## License

Proprietary © FlexCeiling Pro Solution General Trading FZ LLC. Internal use only.
