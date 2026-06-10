# Deploying the internal admin system

This is an **internal company tool**. It is gated by app login + roles + RLS, and
(after step 3) by a Cloudflare Access email allowlist. It is **not** a public/
commercial site. Target URL: **https://admin.flex-ceiling-pro.com**

Stack: Next.js (Node) on **Render**, domain via **Cloudflare DNS**, extra gate via
**Cloudflare Access (Zero Trust)**.

---

## 1 — Deploy on Render

1. Go to **render.com** → sign up (you can use GitHub).
2. **New → Blueprint** → connect the GitHub repo **`flex-ceiling-pro-system`** → Render reads `render.yaml`.
3. When prompted, set the 3 environment variables (these are **secrets**, kept out of the repo):
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://zpcmidxddczjsuvlcouv.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_…` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your **service_role** key (Supabase → Settings → API) |
4. **Apply / Create** → Render builds and starts it. You'll get a URL like `https://flexceiling-admin.onrender.com`. Open it and confirm the **login** page loads.
   - Free plan "sleeps" when idle (~30 s first load). For always-on, change `plan: free` → `plan: starter` (~$7/mo) in `render.yaml` (or in the dashboard).
5. Every push to `main` now auto-deploys.

## 2 — Point your Cloudflare domain at it

1. In **Render → your service → Settings → Custom Domains**, add **`admin.flex-ceiling-pro.com`**. Render shows a target host (e.g. `flexceiling-admin.onrender.com`).
2. In **Cloudflare → flex-ceiling-pro.com → DNS → Add record**:
   - Type **CNAME**, Name **`admin`**, Target = the Render target host, Proxy **DNS only (grey cloud)** first.
3. Wait for Render to verify the domain + issue SSL (a few minutes). Confirm `https://admin.flex-ceiling-pro.com` loads the login.
   - (Optional) You can switch the Cloudflare proxy to **orange** afterwards if you want Cloudflare in front; not required.

## 3 — Lock it to your team (Cloudflare Access)

1. In **Cloudflare dashboard → Zero Trust** (one-time free setup of a team name).
2. **Access → Applications → Add an application → Self-hosted**.
   - Application domain: **`admin.flex-ceiling-pro.com`**
3. Add a **policy**: Action **Allow**, Include → **Emails** → list your team's emails (or **Emails ending in** `@yourcompany`).
4. Save. Now only those emails can even **reach** the app; everyone else is blocked by Cloudflare before the page loads. (Your app's own login still applies on top.)

## 4 — Verify
- Open `https://admin.flex-ceiling-pro.com` from an allowed account → Access prompt → app login → in.
- From a non-allowed email/incognito → blocked by Cloudflare Access.

---

## Security checklist
- ✅ `SUPABASE_SERVICE_ROLE_KEY` only in Render env (secret) — never in the repo/browser.
- ✅ Supabase Auth → public **sign-ups OFF** (only admin-created users).
- ✅ RLS enabled (roles enforce quotes/invoices/super access).
- ✅ Cloudflare Access allowlist in front (internal-only).
- ✅ Share links remain unguessable + token-scoped (one document only).
