# FlexCeiling Pro — Quote &amp; Invoice System

Internal web app for **FlexCeiling Pro Solution General Trading FZ LLC** that replaces the old
manual Excel → PDF workflow. You fill in a form, the data is saved to a database, and a clean,
print-perfect PDF is generated on demand — consistent every time.

**Live:** https://admin.flex-ceiling-pro.com · internal access only.
Companion to the public marketing site (separate repo: `flex-ceiling-pro-website`).

> 📘 End-user manual: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) (+ handover PDF) ·
> 🎬 walkthrough script: [`docs/VIDEO_SCRIPT.md`](docs/VIDEO_SCRIPT.md)

---

## ✨ Features

**Documents**
- **Quotations**, **Pro Forma invoices** (advance payment + balance due), and **Tax Invoices**
- One-click conversions: **Quote → Pro Forma** and **Quote/Pro Forma → Tax Invoice**
  (copies client + line items; invoices get the amount in words; source quote is marked *Won*)
- Live auto-calculations: amount = area × rate, discount, VAT, grand total (and advance/balance)
- Duplicate · edit · delete · status workflow (Draft / Sent / Won / Paid / Lost)

**Output &amp; sharing**
- Branded **PDF** generated on demand with `@react-pdf/renderer` (header + TRN + logo, line
  items, totals, amount in words, RAK bank details, company stamp) — never stored, always current
- **Secure share links** — unguessable, token-scoped public URL that exposes *only* that one
  document's PDF (no login required for the recipient); revocable

**Operations**
- **Dashboard** — outstanding, invoiced totals, quote conversion, 6-month chart, quote pipeline,
  top clients, recent documents
- **Clients** — directory with full per-client document history
- **Search / filter / sort / pagination** + **CSV export** for accounting

**Admin**
- **Settings** — company details, TRN, bank, default payment terms/validity, number prefixes, VAT
- **Users &amp; roles** — Super / Staff / Quotes / Invoices, with activate/revoke
- **Audit trail** — `created_by` / `updated_by` on every record

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 |
| Backend / DB | Supabase (Postgres + Auth + Row-Level Security) |
| PDF | `@react-pdf/renderer` (Node runtime) |
| Testing | Vitest |
| Hosting | Vercel (CD) · Cloudflare DNS · Supabase |

## 🏗️ Architecture &amp; data model

A single Next.js app handles UI, server actions, and PDF routes. Business logic lives in pure,
unit-tested modules (`src/utils/totals.ts`, `docNumber.ts`, `docRules.ts`, `roles.ts`).

**Tables** (see [`supabase/schema.sql`](supabase/schema.sql)):

`company_settings` · `clients` · `catalog_items` · `documents` (type = `quote` \| `invoice` \|
`proforma`) · `document_items` · `profiles` (roles)

`schema.sql` is the **single source of truth** — it creates the tables, the RBAC roles/profiles,
triggers, and all Row-Level Security policies. Idempotent; safe to re-run.

## 🔐 Security

- **RLS enforced** at the database — unauthenticated requests return no rows (verified by tests)
- **Role-based access:** Super (everything + users/settings), Staff (all docs), Quotes (quotes
  only), Invoices (tax invoices + pro formas)
- Public **sign-ups are OFF** — accounts are created only by a super user on the in-app Users page
- The **service-role key is server-only** (never shipped to the browser); share tokens are
  unguessable and scoped to a single document

## ✅ Testing

- **Unit tests (Vitest):** money math, amount-in-words, document numbering, the role × type
  access matrix, and type-dependent document rules — run with `npm test`
- **End-to-end "intent" checks** (run against the live DB during releases): RLS blocks anon
  access, document-type integrity, totals reconcile (`grand = subtotal − discount + VAT`),
  pro-forma rules, status validity, share-token uniqueness, and an active super exists
- **Vercel** runs the production build + TypeScript check on every push (deploy gate)

> A GitHub Actions CI pipeline (running the suite on every push/PR) is not set up yet; tests are
> run on demand via `npm test` and the Vercel build acts as the automated gate.

## 🚀 Deployment

- **Host:** Vercel — **auto-deploys on every push to `main`** (continuous deployment)
- **Domain:** `admin.flex-ceiling-pro.com` via a Cloudflare CNAME (DNS-only)
- **Database/Auth:** Supabase (dedicated project)
- PDF image assets are bundled into the serverless functions via `outputFileTracingIncludes`
  in [`next.config.ts`](next.config.ts)

Full runbook: [`DEPLOY.md`](DEPLOY.md).

## 🛠️ Getting started

```bash
npm install
```

Create `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# server-only — never prefix with NEXT_PUBLIC, never commit
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

One-time database setup:

1. In the **Supabase SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
2. Add your account: **Supabase → Authentication → Users → Add user** (tick *Auto Confirm*).
   The first user is backfilled as an active **super** by the schema.
3. Keep **"Allow new users to sign up" = OFF** (internal-only).

```bash
npm run dev      # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | production build (type-check + compile) |
| `npm run start` | run the production build |
| `npm run lint` | lint |
| `npm test` | run the unit test suite |
| `npm run test:watch` | unit tests in watch mode |

## 📁 Structure

```
.
├─ src/
│  ├─ app/            routes: login, dashboard (/), quotes (list/new/[id]/edit/pdf),
│  │                  share/[token], clients, settings, users, account
│  ├─ components/     Shell/AppShell, QuoteForm, StatCard, TypeChip, pdf/QuotePdf, pdf/InvoicePdf, …
│  └─ utils/          totals · docNumber · docRules · roles · amountInWords · supabase clients
│                     (+ co-located *.test.ts)
├─ supabase/
│  └─ schema.sql      tables + RBAC + RLS (run once in the Supabase SQL Editor)
├─ docs/              USER_GUIDE.md (+ handover PDF) · VIDEO_SCRIPT.md
├─ next.config.ts     bundles PDF image assets for serverless
├─ vitest.config.ts
└─ DEPLOY.md          deployment runbook
```

## 🔒 Notes

- `.env.local`, `data/`, `supabase/import.sql`, and `docs/*.mp4` are **gitignored** (keys, client
  data, and large videos stay out of version control).
- The Supabase project is a **dedicated FlexCeiling account**, separate from any other projects.
- This is a customized build of Next.js 16 — see [`AGENTS.md`](AGENTS.md) before changing code.
