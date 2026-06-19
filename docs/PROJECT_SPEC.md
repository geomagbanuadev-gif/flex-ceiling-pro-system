# FlexCeiling Pro — Quote & Invoice System · Full Specification

A complete, dense specification of the system: scope, stack, data model, every feature,
business logic, security, testing, deployment, data work, and key decisions. Intended as a
single reference (e.g. to feed to another tool for summarization).

---

## 1. Overview

- **What:** Internal web app that replaces a manual Excel→PDF workflow for creating and managing
  **quotations, pro forma invoices, and tax invoices**, with clients, PDFs, sharing, search,
  reporting, roles, and a dashboard.
- **For:** FlexCeiling Pro Solution General Trading FZ LLC (Dubai/RAK stretch-ceiling business). TRN 1015211875700001.
- **Users:** Company staff only (internal). No public access; no self sign-up.
- **Live:** https://admin.flex-ceiling-pro.com
- **Companion:** separate public marketing website (`flex-ceiling-pro-website`), not part of this app.

## 2. Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions) — a customized build
  (see AGENTS.md; `middleware` deprecated → `proxy` convention).
- **React + TypeScript**, **Tailwind CSS v4** (custom design tokens), **Geist** font (next/font).
- **Supabase**: Postgres + Auth (email/password) + Row-Level Security; `@supabase/ssr` (cookie
  sessions) for the app, `@supabase/supabase-js` service-role client for admin ops.
- **@react-pdf/renderer** (Node runtime) for on-demand PDFs.
- **Vitest** for unit tests.
- **Hosting:** Vercel (serverless, CD) + Cloudflare DNS + Supabase.

## 3. Repository & structure

Repo root **is** the Next.js app (restructured from an earlier `system/admin/` nesting). GitHub:
private repo `flex-ceiling-pro-system`.

```
src/
  app/           login, dashboard (/), quotes/(list,new,[id],[id]/edit,[id]/pdf,export),
                 share/[token](+/pdf), clients/(list,[id],new), settings, users, account
  components/    AppShell(server)+Shell(client sidebar), MobileNav, QuoteForm, StatCard, TypeChip,
                 StatusBadge, StatusControl, ConvertButton, ProformaButton, DuplicateButton,
                 DeleteButton, ShareButton, SubmitButton, DocumentsFilters, Pagination,
                 Toast, FlashToast, Spinner, pdf/QuotePdf, pdf/InvoicePdf
  utils/         totals.ts, docNumber.ts, docRules.ts, roles.ts, amountInWords.ts, profile.ts,
                 pagination.ts, format.ts, cn.ts, pdf.ts, supabase/(client,server)
                 + co-located *.test.ts
supabase/schema.sql      single source of truth (tables + RBAC + RLS)
docs/          USER_GUIDE.md (+ PDF), VIDEO_SCRIPT.md, PROJECT_SPEC.md, walkthrough .mp4 (gitignored)
next.config.ts  outputFileTracingIncludes bundles PDF image assets into serverless functions
vitest.config.ts, DEPLOY.md, AGENTS.md/CLAUDE.md, render.yaml (fallback), .env.example
```

Gitignored: `.env.local`, `data/`, `supabase/import.sql`, `docs/*.mp4`.

## 4. Data model (`supabase/schema.sql`)

Six tables. `schema.sql` is idempotent and creates tables + RBAC + RLS in one run.

- **company_settings** (single row, id=1): legal_name, address, email, phone, trn,
  bank_account_name/no/iban/currency/name, logo_url, stamp_url, default_payment_terms,
  default_validity_days, quote_prefix (`1000-`), invoice_prefix (`INV-`), proforma_prefix (`PF-`),
  vat_rate (5). Seeded with FlexCeiling supplier + RAK bank + TRN.
- **clients**: id (uuid), name, trn, address, email, contact_person, contact_phone, notes,
  created_at, created_by.
- **catalog_items**: id, description, unit, default_rate (reusable line items; minimal use).
- **documents**: id (uuid), **type** (`quote` | `invoice` | `proforma`, CHECK), number, doc_date,
  client_id, client snapshot (client_name/trn/address/email, contact_person/phone), reference,
  status, payment_terms, validity_days, subtotal, discount, vat_rate, vat_amount, grand_total,
  **advance_amount** (pro forma), amount_in_words, **supplier_snapshot** (jsonb; frozen
  company/bank/TRN at issue — *note: column intended but not present on the live DB; code falls
  back to current company_settings*), **share_token** (unguessable; unique index), notes,
  source_file, imported (bool), converted_from (uuid self-ref), created_at, updated_at,
  created_by, updated_by.
- **document_items**: id, document_id (FK, ON DELETE CASCADE), sr_no, description, area, unit,
  rate, amount, sort_order.
- **profiles** (RBAC): id (= auth.users.id), email, full_name, role
  (`super`|`staff`|`quotes`|`invoices`, default staff), active (default false), created_at.

Indexes on documents(type, client_id, number, doc_date), unique partial index on share_token.

## 5. Authentication & RBAC

- **Auth:** Supabase email/password. App uses `@supabase/ssr` cookie sessions; login at `/login`
  (`signInWithPassword`). Public sign-ups OFF.
- **profiles + roles:** trigger `handle_new_user` auto-creates a profile (staff, inactive) when an
  auth user is added. First/owner user backfilled as active **super**. Helper
  `app_user_role()` (SECURITY DEFINER, `search_path=public`) returns the caller's role or null if
  inactive. `protect_super()` trigger prevents demoting/revoking a super (anti-lockout). Both
  pin `search_path` (security-advisor hardening).
- **Role capabilities:** super = everything + Users + Settings; staff = all documents + clients;
  quotes = quotations only; invoices = tax invoices + pro formas only.
- **App enforcement:** `src/utils/roles.ts` (`canSeeQuotes/Invoices/Proformas`, `canAccessType`)
  gates nav + actions; mirrored by DB RLS.

## 6. Row-Level Security (RLS)

All tables RLS-enabled. Policies (in schema.sql):
- **documents `doc_access`** (for all to authenticated): super/staff → all; quotes role →
  type=quote; invoices role → type IN (invoice, proforma).
- **document_items `item_access`**: inherits the parent document's access via EXISTS.
- **clients/catalog**: any active user (`app_user_role() is not null`).
- **company_settings**: every active user reads; only super writes.
- **profiles**: a user reads own row; super reads/writes all.
- Verified: anonymous (publishable key, no session) returns **zero** rows from documents/clients/profiles.

## 7. Features (detailed)

### Dashboard (`/`)
KPIs: Outstanding (unpaid invoices), Invoiced all-time, Invoiced this month, Quote conversion %.
Charts: invoiced last 6 months (bar), quote pipeline by status. Lists: top clients by value,
recent documents (click-through). Mini-stats: Clients / Quotes / Pro Forma / Invoices counts.

### Quotations
`/quotes/new` form (`QuoteForm`): pick existing client (dropdown) or type a new one (auto-saved);
quote number auto-generated (`nextDocNumber`), date, reference/scope; **line items** (description,
area, unit, rate, amount = area×rate auto, add/remove rows); a description line starting with `*`
prints red on the PDF; discount, VAT% (default 5), live Sub Total/VAT/Grand Total; payment terms,
validity days, a **note** that prints red. Sticky bottom bar shows live total + Save. Saves via
`saveQuote` server action → detail page with live PDF preview.

### Pro Forma invoices
Third document type. Requests a partial **Advance Payment**; shows **Balance Due** = Grand Total −
Advance (red). Create blank (`+ Pro Forma` → `newProforma`) or **Generate Pro Forma** from a quote
(`convertToProforma`: copies client+items, default advance = 50%). Form shows advance input + quick
50/40/10/100% buttons + live balance. `PF-` numbering. Statuses: draft/sent/paid/lost. PDF uses the
invoice layout titled "PROFORMA INVOICE" with Advance Payment + red Balance Due rows.

### Tax Invoices
**Generate Tax Invoice** from a quote or pro forma (`convertToInvoice`): copies client+items, new
`INV-` number, computes **amount in words** (AED/fils), marks the **source quote Won** (pro forma
source keeps its status), idempotent (won't double-convert). Blank create via `+ Tax Invoice`
(`newInvoice`). PDF "TAX INVOICE" shows supplier + customer TRN, QTY/UNIT/RATE/TOTAL, totals, amount
in words, bank details, stamp.

### PDF generation
On-demand only (never stored). Authed route `/quotes/[id]/pdf` and public `/share/[token]/pdf`
render via `renderToBuffer`. `src/utils/pdf.ts` picks `QuoteDocument` (quotes) or `InvoiceDocument`
(invoices + pro formas), reads logo/stamp from `public/` (base64), prefers `supplier_snapshot` else
current settings. `InvoiceDocument` is type-aware (title, meta label, advance/balance rows). Repeating
table header (`fixed`), rows `wrap={false}`, multi-page safe. Bank details + stamp bottom area; red
`*` lines and red note supported.

### Secure sharing
`ShareButton` → `getShareToken` sets an unguessable token (two concatenated UUIDs, hyphens stripped);
public routes `/share/[token]` + `/share/[token]/pdf` use the service-role client strictly scoped to
`.eq("share_token", token)` (guard token length ≥ 24), returning only that one document (404 otherwise,
no login). Dialog offers copy, WhatsApp (`wa.me/?text=`), email (`mailto:`), and Stop sharing
(`disableShare`).

### Clients
`/clients` list (search), `/clients/new`, `/clients/[id]` detail (edit + that client's documents).
Clients also auto-created when a new name is typed on a quote.

### Documents list, search, filters, export
`/quotes?type=quote|proforma|invoice` (or all). Debounced live search (client/number), Filters
(status, client, date range, min/max amount), sort, pagination (rows-per-page 10/20/50/100, default
20). `Export` → CSV (`/quotes/export`, RLS-scoped, BOM for Excel). Tabs always show only their type;
filter state resets per tab (keyed remount) to prevent cross-tab mixing.

### Status workflow & audit
`StatusControl` / `updateStatus`: quotes draft/sent/won/lost; invoices & pro formas draft/sent/paid/
lost. Quote validity badge (valid until / expired). Every record stamps `created_by`/`updated_by`;
detail page resolves these to emails.

### Edit / Duplicate / Delete
Edit (same form for all 3 types; keeps number+status). Duplicate → new draft copy fresh number
(`duplicateDocument`). Delete (in-app confirm dialog; `deleteDocument`) → returns to the document's
own typed tab. Browser confirm/alert replaced with in-app dialogs + toasts.

### Settings & Users (super)
Settings: company details, TRN, bank, default terms/validity, prefixes, VAT (apply to new docs).
Users: add user (email + access level + generated temp password), activate/revoke; super can't be
revoked; users change their own password on the Account page.

## 8. Business logic modules (pure, unit-tested)

- **totals.ts** `computeTotals(amounts, {vatRate, discount, advance})` → subtotal, discount (clamped
  0..subtotal), vatAmount, grandTotal, advanceAmount (clamped 0..grand), balanceDue; all rounded 2dp.
- **docNumber.ts** `nextDocNumber(numbers, prefix)` → max trailing integer + 1, padded to 4.
- **docRules.ts** `statusesFor(type)`, `prefixFor(type, settings)`, `wordsForType` (words on
  invoice/proforma, null on quote), `advanceForType` (advance only on proforma), `defaultAdvance` (50%).
- **roles.ts** access matrix (above). **amountInWords.ts** AED/fils → words ("… DIRHAMS AND … FILS
  ONLY"). These are the single source of truth, used by the form + server actions.

## 9. Server actions (`src/app/quotes/actions.ts`)

`saveQuote` (create/update + find-or-create client + items + supplier snapshot with graceful
column-fallback via `insertDoc`), `convertToInvoice`, `convertToProforma`, `newInvoice`,
`newProforma`, `duplicateDocument`, `deleteDocument`, `updateStatus`, `getShareToken`,
`disableShare`. Flash redirects (`?flash=saved|converted|proforma|duplicated|deleted`) surface toasts.

## 10. UI / UX

Custom Tailwind design system (no heavy component lib, for stability on the customized Next):
Geist font; design tokens (layered shadows, brand gradients); deep neutral background so white
cards pop; solid card rings; on-brand focus rings; slim scrollbars; pointer-cursor fix for Tailwind
v4. **Left sidebar** layout (grouped icon nav, gold active indicator, high-contrast labels) with a
**mobile slide-in drawer** (hamburger, overlay, Escape-to-close). Premium dashboard (icon stat cards,
gradient bar chart). Shared `TypeChip` (quote/pro-forma/invoice) + pill `StatusBadge`. Document form
has a sticky live-total + save bar. Branded login screen. **Mobile-responsive:** all wide tables
scroll inside their cards (overflow-x-auto + min-width) so the page never overflows.

## 11. Data import & corrections

- Imported ~130 documents (119 quotes + 11 invoices) + 77 clients + ~219 line items from the old
  Excel files. Type derived from **folder** (QUOTE vs TAX INVOICE), not sheet title (templates reused
  the "QUOTATION" header). De-duplicated (67 exact dups removed, blanks skipped). Invoices keep
  historical 1000-xxxx numbers. One-time import SQL deleted after applying.
- Go-live data ops: set all quotes → Won, all invoices → Paid; deleted empty test invoices.
- Integrity pass: 4 imported quotes had mis-imported VAT/grand totals (e.g. grand stored as just the
  VAT) — recomputed from their (reliable) line items. An over-correction that wrongly added 5% VAT to
  10 intentionally no-VAT quotes was detected and fully reverted. Result: all **131** documents
  reconcile (`grand = subtotal − discount + VAT`). Known remaining: 3 imported quotes have incomplete
  line items but internally correct totals (flagged, not auto-changed); some duplicate document
  numbers from the import (cosmetic).
- Added an AL SHUAA sample pro forma (replicating a real PDF) to demonstrate the feature.

## 12. Testing

- **Unit (Vitest, `npm test`): 28 tests / 5 suites** — totals (incl. the AL SHUAA sample),
  amountInWords, docNumber, roles (role×type matrix), docRules.
- **End-to-end "intent" checks (live DB, run at releases): 12** — anon blocked from docs/clients/
  profiles; document-type integrity; every doc has a number; totals reconcile across all 131; pro
  forma advance ≤ grand; advance only on pro formas; statuses valid per type; share tokens unique;
  active super + valid roles; sample pro forma intact.
- **Build gate:** Vercel runs the production build + TypeScript check on every push.
- **Not set up:** a GitHub Actions CI pipeline (tests on push/PR). Tests are run on demand; the
  Vercel build is the automated gate.

## 13. Deployment

- **Host:** Vercel (Hobby/free tier), project `flex-ceiling-pro-system`; **auto-deploys on every
  push to `main`** (continuous deployment). Env vars set in Vercel: the 3 Supabase keys.
- **Domain:** `admin.flex-ceiling-pro.com` via Cloudflare CNAME → `cname.vercel-dns.com` (DNS-only/
  grey). Domain stays on Cloudflare.
- **Database/Auth:** Supabase (free tier — auto-pauses after ~7 idle days; restore in dashboard, or
  upgrade to Pro to avoid pausing). Decided NOT to migrate off Supabase / not to self-host (would
  mean rebuilding auth + RLS).
- **Serverless PDF assets:** `next.config.ts` `outputFileTracingIncludes` bundles
  `public/logo-full.png` + `stamp.png` + `logo-mark.png` into `/quotes/**` and `/share/**` functions.
- Earlier plan was Render + Cloudflare; switched to Vercel because the Render dashboard was
  unreachable from the user's UAE network. `render.yaml` kept as a fallback blueprint.
- Cloudflare Access was rejected (its separate email allowlist conflicts with in-app user
  management). Internal-only is enforced by the app: sign-ups OFF + login + RLS/roles.

## 14. Security summary

RLS enforced (anon blocked); role-based DB access; service-role key server-only (never in browser/
repo); public sign-ups OFF; share tokens unguessable + scoped to one document + revocable; SECURITY
DEFINER functions pin `search_path`. Open advisory (optional): enable Supabase leaked-password
protection.

## 15. Documentation delivered

- `README.md` (project doc), `DEPLOY.md` (runbook), `docs/USER_GUIDE.md` (+ branded handover PDF),
  `docs/VIDEO_SCRIPT.md` (record-it-yourself script), `docs/PROJECT_SPEC.md` (this file).
- Two automated **walkthrough videos** (short ~1.5 min, full ~2.5 min) recorded by driving the app
  with Playwright + on-screen text captions, then cleaned up (temp user + demo data removed).

## 16. Key decisions & constraints

- Dedicated Supabase account (NOT the company's main account); project ref `zpcmidxddczjsuvlcouv`.
- Free-tier hosting works; for an always-on business tool, Supabase Pro (~$25/mo) removes pausing,
  Vercel Pro (~$20/mo) is the ToS-clean tier (Hobby is non-commercial). Currently both free.
- PDFs never stored (generated on demand). Only stored image assets: logo + stamp.
- Build is a customized Next.js 16 — read `node_modules/next/dist/docs/` before changing code;
  `middleware` deprecated in favour of `proxy`.

## 17. Build timeline (high level)

1. MVP: schema, auth, dashboard, clients, quotation form → PDF, tax-invoice convert, stamp,
   amount-in-words; advanced filters/search/pagination; import of historical data.
2. RBAC + Users management + password change; settings; secure share links; CSV export; in-app
   dialogs; metadata/title fixes; debounced search; audit trail.
3. Repo restructure (admin → root); deploy to Vercel + Cloudflare domain + CD.
4. **Pro Forma** document type (advance/balance) + sample; document-tab UX fixes; cursor/loading fixes.
5. Pure-logic extraction + **Vitest unit tests** + **e2e intent tests**; imported-data total fixes.
6. Full **UI redesign** (design system → left sidebar → mobile-responsive → contrast).
7. **Documentation**: user guide (MD + PDF), video script, walkthrough videos, README, this spec.
