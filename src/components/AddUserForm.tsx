"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/users/actions";
import { Spinner } from "./Spinner";

const ROLES = [
  { v: "staff", l: "Full staff" },
  { v: "quotes", l: "Quotes only" },
  { v: "invoices", l: "Invoices only" },
  { v: "super", l: "Super" },
];

// Strong, readable temp password (no ambiguous chars like O/0, l/1).
function generatePassword(len = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function AddUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const mail = email.trim().toLowerCase();
    const usedPw = password;
    const levelLabel = ROLES.find((r) => r.v === role)?.l;
    start(async () => {
      try {
        await createUser(email, password, role);
        setMsg({ ok: true, text: `✓ Added ${mail} (${levelLabel}). Share this login →  email: ${mail}   password: ${usedPw}` });
        setEmail("");
        setPassword("");
        setRole("staff");
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to add user" });
      }
    });
  }

  const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy";
  const lbl = "mb-1 block text-xs font-medium text-slate-600";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
        + Add user
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add user</h2>
        <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="text-sm text-slate-400 hover:text-slate-700">Cancel</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <label className={lbl}>Email</label>
          <input type="email" required className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
        <div>
          <label className={lbl}>Temporary password</label>
          <div className="flex gap-2">
            <input type="text" required className={inp} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 characters" />
            <button type="button" onClick={() => setPassword(generatePassword())} className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100" title="Generate a strong password">
              Generate
            </button>
          </div>
        </div>
        <div>
          <label className={lbl}>Access level (pages they can use)</label>
          <select className={inp} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
            {pending && <Spinner className="h-4 w-4" />} Create
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Quotes only / Invoices only restrict to that document type. Full staff sees all documents. Super also manages settings &amp; users.
      </p>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
