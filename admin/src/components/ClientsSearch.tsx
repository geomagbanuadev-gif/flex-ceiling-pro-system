"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";

export function ClientsSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(() => router.push(q ? `/clients?q=${encodeURIComponent(q)}` : "/clients"));
  }

  return (
    <form onSubmit={submit} className="mb-5 flex gap-2">
      <div className="relative max-w-sm flex-1">
        <input
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          placeholder="Search clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </div>
      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
        {pending && <Spinner className="h-4 w-4" />} Search
      </button>
      {sp.get("q") && (
        <button type="button" onClick={() => start(() => router.push("/clients"))} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Clear</button>
      )}
    </form>
  );
}
