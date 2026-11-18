"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const redirectTo = new URL("/auth/reset-password", window.location.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <main className="bg-brand relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative w-full max-w-sm fc-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FlexCeiling Pro" className="h-14 w-14 rounded-2xl bg-white/5 object-contain p-1 ring-1 ring-white/15" />
          <p className="mt-4 text-xl font-semibold tracking-tight text-white">Reset password</p>
          <p className="text-sm text-white/50">FlexCeiling Pro</p>
        </div>

        <div className="rounded-2xl bg-white/95 p-8 shadow-[var(--shadow-pop)] ring-1 ring-white/20 backdrop-blur">
          {sent ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-slate-900">Check your email</h1>
              <p className="mt-2 text-sm text-slate-600">If an account exists for that address, a password reset link has been sent.</p>
              <Link href="/login" className="mt-6 inline-flex text-sm font-semibold text-navy hover:text-navy-600">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-slate-600">Enter your account email and we’ll send you a secure reset link.</p>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                <input id="email" type="email" required value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
              <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <Link href="/login" className="block text-center text-sm font-medium text-slate-500 hover:text-navy">Back to sign in</Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
