FlexCeiling Pro — Quote & Invoice System (Admin): Full Specification

Overview
A custom-built internal web application for FlexCeiling Pro Solution General Trading FZ LLC — the
operations tool that replaces the company's manual Excel→PDF workflow for creating and managing
quotations, pro forma invoices, and tax invoices. It captures jobs through a form, saves everything
to a database, and generates a clean, print-perfect branded PDF on demand — consistent every time —
plus clients, secure client sharing, search/reporting, role-based access, and a business dashboard.
Internal company tool (login-gated, no public access).

Live at: https://admin.flex-ceiling-pro.com (internal access only)

Tech Stack
Framework: Next.js 16 (App Router, React Server Components, Server Actions), React, TypeScript
Styling: Tailwind CSS v4 (custom design system), Geist font (next/font)
Rendering: Dynamic SSR + Server Actions (not static — needs a Node runtime for auth + PDF generation)
Database / Auth: Supabase — Postgres + Auth (email/password) + Row-Level Security; @supabase/ssr cookie sessions for the app, a service-role client for admin operations
PDF: @react-pdf/renderer (Node runtime) — generated on the fly per request, never stored
Testing: Vitest (unit) + a scripted end-to-end "intent" check suite run against the live database
Hosting: Vercel (serverless functions on a global edge)
Domain/DNS: Cloudflare — admin.flex-ceiling-pro.com (CNAME, DNS-only; domain stays on Cloudflare)
CI/CD: Auto-deploy from GitHub → Vercel on every push to main (continuous deployment)
Repo: private GitHub repo flex-ceiling-pro-system (the repo root IS the Next.js app)

Brand / Design
Palette: deep navy #0c2340, bronze/gold #b08d57, slate neutrals, emerald/blue/red status accents
Font: Geist (sans)
Custom design system (no heavy component library, for stability on the customized Next build): layered soft shadows, rounded-2xl cards with rings, gold active accents, on-brand focus rings, slim scrollbars
Left sidebar layout (grouped, icon-based navigation with a gold active indicator) + a mobile slide-in drawer (hamburger, overlay, Escape-to-close)
Premium dashboard (icon stat cards with hover lift, gradient bar chart), a sticky live-total + Save bar on the document form, shared type chips + pill status badges, and a branded login screen
Fully mobile-responsive — every wide table scrolls inside its own card so the page never overflows

App Structure (~15 routes)
Dashboard — KPIs, charts, quote pipeline, top clients, recent documents
Quotes — list (search/filter/sort/paginate/export), new, detail, edit, PDF
Pro Forma — list, create, detail, edit, PDF (advance + balance)
Invoices — list, create, detail, edit, PDF
Clients — list, detail (with that client's full document history), new
Settings — company/bank/TRN/payment terms/validity/number prefixes/VAT (super users)
Users — manage accounts + access levels (super users)
Account — change your own password
Public share routes — /share/[token] and /share/[token]/pdf (token-scoped, no login required)
System routes — login, on-demand PDF routes (/quotes/[id]/pdf), CSV export (/quotes/export)

Key Features Built
Documents — quote → pro forma → tax invoice:
Full create/edit form with live auto-calculation (amount = area × rate, discount, VAT, grand total)
Line items (description, area, unit, rate, amount) with add/remove rows; a description line starting with "*" prints red on the PDF; a "note" field that also prints red
Status workflow (Draft / Sent / Won / Paid / Lost), quote validity badge (valid-until / expired), duplicate, edit (same form for all three types, keeps number + status), delete (in-app confirm dialog → returns to the correct typed tab)
Every record carries an audit trail (created_by / updated_by, resolved to emails on the detail page)

Pro Forma invoices (third document type):
Requests a partial Advance Payment and shows the remaining Balance Due (red); Balance = Grand Total − Advance
Create blank, or "Generate Pro Forma" from a quote (copies client + line items, pre-fills a 50% advance); quick 50/40/10/100% advance buttons with live balance; PF- numbering
PDF uses the invoice layout titled "PROFORMA INVOICE" with Advance Payment + red Balance Due rows
Includes a real sample pro forma (AL SHUAA) replicated to demonstrate the format

Tax invoices:
"Generate Tax Invoice" from a quote (or pro forma) in one click — copies client + line items, assigns a new INV- number, computes the amount in words (AED/fils), marks the source quote Won, and is idempotent (won't double-convert)
PDF shows supplier + customer TRN, QTY/UNIT/RATE/TOTAL, totals, amount in words, RAK bank details, company stamp

PDF generation:
On-demand only, never stored; faithful to the company template; QuoteDocument vs a type-aware InvoiceDocument; repeating table header and multi-page-safe rows; red emphasis lines/notes; logo + stamp embedded; prefers a frozen supplier snapshot, falls back to current company settings

Secure client sharing:
Generates an unguessable, token-scoped public link that exposes only that one document's PDF (recipient needs no account and can see nothing else); share via copy / WhatsApp / email; revocable ("Stop sharing")

Dashboard:
Outstanding (unpaid invoices), Invoiced all-time, Invoiced this month, Quote conversion %, a 6-month invoiced bar chart, the quote pipeline by status, top clients by value, recent documents, and Clients/Quotes/Pro Forma/Invoices counts

Clients, search & reporting:
Client directory with per-client document history (clients also auto-created when a new name is typed on a quote); debounced live search (client/number); filters by status, client, date range, min/max amount; sort; pagination (rows-per-page); CSV export for the accountant (RLS-scoped). Each type tab always shows only that type

Users & roles:
Four access levels — Super (everything + Users + Settings), Staff (all documents + clients), Quotes (quotations only), Invoices (tax invoices + pro formas only); add a user with a generated temporary password; activate/revoke; a super user cannot be revoked or demoted (anti-lockout); users change their own password on the Account page

Security & Access Control
Supabase email/password authentication; public sign-ups OFF — accounts are created only by a super user on the in-app Users page
Role-based access enforced in two layers: the app (nav + actions) and, authoritatively, the database via Row-Level Security — anonymous requests (no session) return zero rows from documents, clients, and profiles (verified by tests)
RBAC internals: a profiles table mapped to auth users; an auto-create-on-add trigger (new users start inactive); an app_user_role() helper (SECURITY DEFINER, pinned search_path, used inside policies); a protect_super() trigger preventing lockout
Service-role key is server-only (never shipped to the browser or committed); share tokens are unguessable, scoped to a single document, and revocable
A single consolidated schema.sql is the source of truth (tables + RBAC roles/triggers + all RLS policies); idempotent and safe to re-run

Data & Business Logic
Six tables: company_settings, clients, catalog_items, documents (type = quote | invoice | proforma; with discount, VAT, advance_amount, amount_in_words, share_token, supplier_snapshot, converted_from, audit columns), document_items (cascade-deleted with their document), profiles
Pure, unit-tested logic modules are the single source of truth, used by both the form and the server actions: totals (money math: subtotal/discount-clamp/VAT/grand/advance/balance, rounded 2dp), docNumber (sequential numbering), docRules (type-dependent rules — statuses, prefixes, amount-in-words, advance defaults), roles (the role × document-type access matrix), amountInWords (AED/fils → words)
~130 documents (119 quotes + 11 invoices) + 77 clients + ~219 line items migrated from the old Excel files; type derived from the source folder (not the reused "QUOTATION" sheet header); de-duplicated; one-time import SQL removed after loading

Testing & QA Done
Unit tests (Vitest, npm test): 28 tests across 5 suites — money math (incl. the AL SHUAA sample), amount-in-words, document numbering, the role × type access matrix, and type-dependent document rules
End-to-end "intent" checks against the live database (run at releases): 12 — anonymous blocked from documents/clients/profiles, document-type integrity, every document has a number, all 131 documents reconcile (grand = subtotal − discount + VAT), pro-forma advance never exceeds the total, advance only on pro formas, all statuses valid per type, share tokens unique, an active super exists, sample pro forma intact
Data corrections: fixed 4 imported quotes whose VAT/grand totals were mis-imported (recomputed from their reliable line items); detected and fully reverted a self-inflicted over-correction that had wrongly added 5% VAT to 10 intentionally no-VAT quotes; result — all 131 documents reconcile
UX/QA fixes: document-tab mixing fix (each type tab shows only its type; delete / Back / new return to the correct tab), Tailwind v4 pointer-cursor restored app-wide, loading spinners on slow create actions, mobile table-overflow fixed, and a full contrast/visibility pass
Build gate: Vercel runs the production build + TypeScript check on every push (the automated gate)
Not set up: a GitHub Actions CI pipeline (running the suite on every push/PR) — tests are run on demand via npm test, with the Vercel build as the deploy gate

Infrastructure / Deployment / Security
Vercel serverless hosting; auto-deploy from GitHub on every push to main (CD); the 3 Supabase keys set as Vercel environment variables
Domain admin.flex-ceiling-pro.com via a Cloudflare CNAME (DNS-only/grey) → cname.vercel-dns.com; automatic SSL/HTTPS; domain never leaves Cloudflare
Database/Auth on Supabase (dedicated account, separate from the company's main account); free tier auto-pauses after ~7 idle days (restore in the dashboard, or upgrade to Pro to avoid pausing)
next.config.ts outputFileTracingIncludes bundles the PDF image assets (logo + stamp) into the /quotes/** and /share/** serverless functions (so on-disk reads don't fail on serverless)
Earlier plan was Render + Cloudflare — switched to Vercel because the Render dashboard was unreachable from the UAE network; render.yaml kept as a fallback blueprint. Cloudflare Access was rejected (its separate email allowlist conflicts with in-app user management); internal-only is enforced by the app instead (sign-ups OFF + login + RLS/roles)

Documentation Delivered
README.md (project doc), DEPLOY.md (deployment runbook), docs/USER_GUIDE.md (full client-facing manual) + a branded handover PDF, docs/VIDEO_SCRIPT.md (record-it-yourself walkthrough script), docs/PROJECT_SPEC.md (this file)
Two automated walkthrough videos (a short ~1.5-min and a full ~2.5-min) recorded by driving the live app with Playwright + on-screen text captions, then cleaned up (temporary demo user + demo data removed)

Current Status
✅ Fully built, tested, committed to main, and deployed live on admin.flex-ceiling-pro.com (auto-deploys on push). All 131 documents reconcile; security (RLS/roles) verified; documentation + walkthrough videos delivered.
⏳ Pending (owner action, optional): upgrade Supabase to Pro (~$25/mo) to stop free-tier pausing; move Vercel to Pro (~$20/mo) for ToS-clean business use; enable Supabase leaked-password protection; optionally set up a GitHub Actions CI pipeline; review 3 imported quotes that have correct totals but incomplete line items.

Note: This covers the internal Quote & Invoice admin app only. The project also includes a separate public marketing website (flex-ceiling-pro.com, on Cloudflare Workers + a static Next.js export) — not part of this admin spec.
