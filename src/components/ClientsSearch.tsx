"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";

export function ClientsSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();

  const go = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    const size = sp.get("size");
    if (size) p.set("size", size);
    router.push(`/clients${p.toString() ? `?${p}` : ""}`);
  };

  // live, debounced search
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => start(go), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); start(go); }} className="mb-5 flex gap-2">
      <div className="relative max-w-sm flex-1">
        <input
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          placeholder="Search clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        {pending && <span className="absolute right-3 top-2.5"><Spinner className="h-4 w-4 text-slate-400" /></span>}
      </div>
      {q && (
        <button type="button" onClick={() => { setQ(""); start(() => router.push("/clients")); }} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Clear</button>
      )}
    </form>
  );
}
