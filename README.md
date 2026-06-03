# FlexCeiling Pro — Quote &amp; Invoice System

Internal web app for **FlexCeiling Pro Solution General Trading FZ LLC** that replaces the old
manual Excel → PDF workflow. You fill in a form, the data is saved to a database, and a clean,
print-perfect PDF is generated on demand — consistent every time.

> Companion to the public marketing site (separate repo: `flex-ceiling-pro-website`).

---

## ✨ Features

- 🔐 **Authentication** (Supabase email/password) — every action is attributable (`created_by` / `updated_by`)
- 👥 **Clients** — reusable client records (name, TRN, address, contact)
- 🧾 **Quotations** — form with live VAT/totals → save → **one-click PDF view** (no storage needed)
- 🔎 **Documents list** with search across all historical quotes
- 📄 **PDF generation** — generated on the fly with `@react-pdf/renderer`, faithful to the company template (header + TRN + logo, line items, totals, payment terms, RAK bank details)
- 🗂️ **Imported history** — 206 historical quotations + 77 clients migrated from the old Excel files
- _Planned:_ Tax Invoices + one-click quote→invoice convert, dashboard charts, edit existing docs

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 |
| Backend / DB | Supabase (Postgres + Auth) |
| PDF | `@react-pdf/renderer` |

## 📁 Structure

```
system/
├─ admin/        Next.js app (the UI + API)
│  ├─ src/app/        routes: login, dashboard, /quotes (list, new, [id], pdf)
│  ├─ src/components/ AppShell, QuoteForm, pdf/QuotePdf, …
│  └─ src/utils/      Supabase client/server/middleware helpers
├─ supabase/
│  └─ schema.sql      run once in the Supabase SQL Editor
└─ data/             import artifacts (gitignored — already loaded into the DB)
```

## 🚀 Getting started

```bash
cd admin
npm install
```

Create `admin/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

One-time database setup:

1. In the **Supabase SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) (creates the tables + RLS, seeds company settings).
2. Create your login: **Supabase → Authentication → Users → Add user** (tick *Auto Confirm*).

Run it:

```bash
npm run dev      # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | production build |
| `npm run start` | run the production build |
| `npm run lint` | lint |

## 🗃️ Data model

`company_settings` · `clients` · `catalog_items` · `documents` (quote \| invoice) · `document_items`

Row-Level Security: any authenticated user has full access (no roles yet; audit via `created_by`/`updated_by`).

## 🔒 Notes

- `.env.local`, `data/`, and `supabase/import.sql` are **gitignored** (keys + client data stay out of version control).
- The Supabase project is a **dedicated FlexCeiling account**, separate from any other projects.
