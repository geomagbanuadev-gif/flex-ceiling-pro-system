"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "./Toast";

export function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== pw2) return setMsg({ ok: false, text: "Passwords don't match." });
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      toast(error.message, "error");
    } else {
      setMsg({ ok: true, text: "Password updated." });
      toast("Password updated");
      setPw("");
      setPw2("");
    }
  }

  const inp = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy";
  const lbl = "text-xs font-medium text-slate-600";

  return (
    <form onSubmit={submit} className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Change password</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className={lbl}>New password</label>
          <input type="password" className={inp} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className={lbl}>Confirm new password</label>
          <input type="password" className={inp} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
          {busy ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
