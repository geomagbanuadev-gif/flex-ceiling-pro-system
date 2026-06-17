"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="bg-brand relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-navy-600/30 blur-3xl" />

      <div className="relative w-full max-w-sm fc-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FlexCeiling Pro" className="h-14 w-14 rounded-2xl bg-white/5 object-contain p-1 ring-1 ring-white/15" />
          <p className="mt-4 text-xl font-semibold tracking-tight text-white">FlexCeiling <span className="text-gold-400">Pro</span></p>
          <p className="text-sm text-white/50">Quote &amp; Invoice System</p>
        </div>

        <div className="rounded-2xl bg-white/95 p-8 shadow-[var(--shadow-pop)] ring-1 ring-white/20 backdrop-blur">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
              <input
                id="email" type="email" required value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
              <input
                id="password" type="password" required value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
            <button
              type="submit" disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700 disabled:opacity-60"
            >
              {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-white/35">Internal access only · authorized users</p>
      </div>
    </main>
  );
}
