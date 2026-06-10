# Deploying the internal admin system

This is an **internal company tool**. Access is controlled by the app itself:
public sign-ups are OFF in Supabase, so the ONLY people who can log in are the
users a super admin adds on the in-app **Users** page; roles + RLS enforce what
each can see. It is **not** a public/commercial site.
Target URL: **https://admin.flex-ceiling-pro.com**

Stack: Next.js (Node) on **Render**, domain via **Cloudflare DNS**.

> **Why no Cloudflare Access?** It keeps its own separate email allowlist, which
> would conflict with the app's user management — a user you add in-app would be
> blocked until you also added them in Cloudflare. The app's login (with sign-ups
> off) is the single source of truth, so we rely on that instead.

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

## 3 — Manage who can log in (in the app)

No extra gate needed. To give someone access: **app → Users → Add user** (email +
temp password + access level). To remove access: **Revoke**. Because Supabase
sign-ups are OFF, only people you add here can ever log in.

## 4 — Verify
- Open `https://admin.flex-ceiling-pro.com` → the **login** page loads.
- A user you added in **Users** can log in; nobody else can (no self-sign-up).

---

## Security checklist
- ✅ `SUPABASE_SERVICE_ROLE_KEY` only in Render env (secret) — never in the repo/browser.
- ✅ Supabase Auth → public **sign-ups OFF** (only admin-created users can log in). **This is what keeps it internal — make sure it's off.**
- ✅ RLS enabled (roles enforce quotes/invoices/super access).
- ✅ Users managed in-app (Users page) — single source of truth.
- ✅ Share links remain unguessable + token-scoped (one document only).
