"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { parseAuthRecoveryUrl } from "@/utils/authRecovery";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareRecovery() {
      const recovery = parseAuthRecoveryUrl(window.location.href);
      if (recovery.kind !== "none") window.history.replaceState(null, "", window.location.pathname);

      let recoveryError: Error | null = null;
      if (recovery.kind === "session") {
        ({ error: recoveryError } = await supabase.auth.setSession({ access_token: recovery.accessToken, refresh_token: recovery.refreshToken }));
      } else if (recovery.kind === "code") {
        ({ error: recoveryError } = await supabase.auth.exchangeCodeForSession(recovery.code));
      } else if (recovery.kind === "token_hash") {
        ({ error: recoveryError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: recovery.tokenHash }));
      }

      if (!recoveryError) {
        const { data, error: userError } = await supabase.auth.getUser();
        recoveryError = userError;
        if (!data.user) recoveryError = new Error("No recovery session");
      }

      if (recoveryError && active) setError("This password reset link is invalid or expired. Please request a new link.");
      else if (active) setReady(true);
    }

    prepareRecovery();
    return () => { active = false; };
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("Passwords don’t match.");

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }

    await supabase.auth.signOut({ scope: "local" });
    setBusy(false);
    setComplete(true);
  }

  return (
    <main className="bg-brand relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative w-full max-w-sm fc-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FlexCeiling Pro" className="h-14 w-14 rounded-2xl bg-white/5 object-contain p-1 ring-1 ring-white/15" />
          <p className="mt-4 text-xl font-semibold tracking-tight text-white">Choose a new password</p>
          <p className="text-sm text-white/50">FlexCeiling Pro</p>
        </div>

        <div className="rounded-2xl bg-white/95 p-8 shadow-[var(--shadow-pop)] ring-1 ring-white/20 backdrop-blur">
          {complete ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-slate-900">Password updated</h1>
              <p className="mt-2 text-sm text-slate-600">You can now sign in using your new password.</p>
              <Link href="/login" className="mt-6 inline-flex rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">Continue to sign in</Link>
            </div>
          ) : !ready && !error ? (
            <p className="text-center text-sm text-slate-600">Verifying your reset link…</p>
          ) : error && !ready ? (
            <div className="text-center">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>
              <Link href="/auth/forgot-password" className="mt-6 inline-flex text-sm font-semibold text-navy hover:text-navy-600">Request a new link</Link>
            </div>
          ) : ready ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-password">New password</label>
                <input id="new-password" type="password" required minLength={8} value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="confirm-password">Confirm new password</label>
                <input id="confirm-password" type="password" required minLength={8} value={pw2} autoComplete="new-password" onChange={(e) => setPw2(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
              <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
