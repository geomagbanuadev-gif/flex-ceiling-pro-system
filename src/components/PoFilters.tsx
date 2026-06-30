"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";
import { PO_STATUSES, PO_STATUS_LABEL } from "@/utils/procurement";

export function PoFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "");

  function build() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    const size = sp.get("size"); if (size) p.set("size", size);
    return `/purchase-orders${p.toString() ? `?${p}` : ""}`;
  }

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => start(() => router.push(build())), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const inp = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";

  return (
    <form onSubmit={(e) => { e.preventDefault(); start(() => router.push(build())); }} className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <input className={inp + " w-full pl-9 pr-9"} placeholder="Search PO number or supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
        <svg className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        {pending && <span className="absolute right-3 top-3"><Spinner className="h-4 w-4 text-slate-400" /></span>}
      </div>
      <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {PO_STATUSES.map((s) => <option key={s} value={s}>{PO_STATUS_LABEL[s]}</option>)}
      </select>
      {(q || status) && <button type="button" onClick={() => { setQ(""); setStatus(""); start(() => router.push("/purchase-orders")); }} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Clear</button>}
    </form>
  );
}
