# Deploying the internal admin system

This is an **internal company tool**. Access is controlled by the app itself:
public sign-ups are OFF in Supabase, so the ONLY people who can log in are the
users a super admin adds on the in-app **Users** page; roles + RLS enforce what
each can see. It is **not** a public/commercial site.

**Host:** Vercel (runs the app — Next.js native, PDFs work). **Domain:** Cloudflare
(`admin.flex-ceiling-pro.com` stays on your Cloudflare, just a DNS record).
**CD:** every push to `main` auto-deploys.

> Your domain never leaves Cloudflare. Vercel only runs the code; a CNAME in
> Cloudflare points the subdomain at it.

---

## Env vars (have these ready)
```
NEXT_PUBLIC_SUPABASE_URL             = https://zpcmidxddczjsuvlcouv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_wlsVVQLnZX9gdr2yxC6ngA_7SA5UPG4
SUPABASE_SERVICE_ROLE_KEY            = (secret — the long eyJ… value from admin/.env.local)
```

## 1 — Deploy on Vercel
1. Go to **https://vercel.com** → **Sign Up / Log in with GitHub** (the account that owns the repo).
2. **Add New… → Project** → **Import** the **`flex-ceiling-pro-system`** repo.
3. Vercel auto-detects **Framework Preset: Next.js** (leave Root Directory = `./`, build/output defaults).
4. Open **Environment Variables** → add the **3** above (apply to **Production**).
5. **Deploy**. After ~2–4 min you get a `…vercel.app` URL → open it → see your **login** page. 🎉
   - From now on, every push to `main` auto-deploys.
   - Note: Vercel's free **Hobby** plan is meant for non-commercial use. For a business tool the clean option is **Pro** (~$20/mo); Hobby works fine to get it live first.

## 2 — Point your Cloudflare domain at it
1. Vercel → your project → **Settings → Domains** → add **`admin.flex-ceiling-pro.com`**. Vercel shows the DNS record to create (for a subdomain it's usually **CNAME → `cname.vercel-dns.com`**).
2. **Cloudflare → flex-ceiling-pro.com → DNS → Add record**: **CNAME**, Name **`admin`**, Target **`cname.vercel-dns.com`** (use exactly what Vercel shows), Proxy **DNS only (grey cloud)** so Vercel manages SSL.
3. Wait a few minutes → Vercel verifies + issues SSL → **https://admin.flex-ceiling-pro.com** loads. ✅

## 3 — Verify & lock
1. Log in (super account) → test a quote → **Open/Print PDF** → **Share**.
2. Supabase → Authentication → **"Allow new users to sign up" = OFF** (keeps it internal — only users you add in the app can log in).

---

## Security checklist
- ✅ `SUPABASE_SERVICE_ROLE_KEY` only in Vercel env (secret) — never in the repo/browser.
- ✅ Supabase public **sign-ups OFF**.
- ✅ RLS + roles enforce access; users managed in the app's Users page.
- ✅ Share links unguessable + token-scoped (one document only).

*(A Render blueprint `render.yaml` is also in the repo if you ever switch hosts.)*
