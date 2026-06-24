"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";

const STATUSES = ["draft", "sent", "won", "lost", "paid", "issued", "imported"];
const SORTS = [
  { v: "doc_date", l: "Date" },
  { v: "number", l: "Number" },
  { v: "grand_total", l: "Total" },
  { v: "client_name", l: "Client" },
];

export function DocumentsFilters({ clients = [], lockedType }: { clients?: { id: string; name: string }[]; lockedType?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const basePath = lockedType ? `/quotes?type=${lockedType}` : "/quotes";
  const statusOptions = lockedType === "invoice" || lockedType === "proforma"
    ? ["draft", "sent", "paid", "lost"]
    : lockedType === "receipt"
      ? ["draft", "issued"]
      : lockedType === "quote"
        ? ["draft", "sent", "won", "lost", "imported"]
        : STATUSES;
  const init = (k: string, d = "") => sp.get(k) ?? d;
  const [q, setQ] = useState(init("q"));
  const [type, setType] = useState(init("type"));
  const [status, setStatus] = useState(init("status"));
  const [client, setClient] = useState(init("client"));
  const [from, setFrom] = useState(init("from"));
  const [to, setTo] = useState(init("to"));
  const [min, setMin] = useState(init("min"));
  const [max, setMax] = useState(init("max"));
  const [sort, setSort] = useState(init("sort", "doc_date"));
  const [dir, setDir] = useState(init("dir", "desc"));
  const [open, setOpen] = useState(Boolean(status || client || from || to || min || max));

  const activeCount = [lockedType ? "" : type, status, client, from, to, min, max].filter(Boolean).length;

  function buildUrl() {
    const p = new URLSearchParams();
    const set = (k: string, v: string, def = "") => { if (v && v !== def) p.set(k, v); };
    set("q", q);
    set("type", lockedType || type);
    set("status", status);
    set("client", client);
    set("from", from);
    set("to", to);
    set("min", min);
    set("max", max);
    set("sort", sort, "doc_date");
    set("dir", dir, "desc");
    const size = sp.get("size");
    if (size) p.set("size", size); // keep rows-per-page; page resets to 1
    return `/quotes${p.toString() ? `?${p}` : ""}`;
  }

  // Live search: auto-apply shortly after any change (debounced); skip first render.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => start(() => router.push(buildUrl())), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status, client, from, to, min, max, sort, dir]);

  function clearAll() {
    setQ(""); setType(""); setStatus(""); setClient(""); setFrom(""); setTo(""); setMin(""); setMax(""); setSort("doc_date"); setDir("desc");
    start(() => router.push(basePath));
  }

  const inp = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const lbl = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <form onSubmit={(e) => { e.preventDefault(); start(() => router.push(buildUrl())); }} className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <input className={inp + " w-full pl-9 pr-9"} placeholder="Search client or number…" value={q} onChange={(e) => setQ(e.target.value)} />
          <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          {pending && <span className="absolute right-3 top-2.5"><Spinner className="h-4 w-4 text-slate-400" /></span>}
        </div>
        {!lockedType && (
          <select className={inp} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="quote">Quotations</option>
            <option value="proforma">Pro Forma</option>
            <option value="invoice">Tax Invoices</option>
            <option value="receipt">Receipts</option>
          </select>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">
          Filters
          {activeCount > 0 && <span className="rounded-full bg-navy px-1.5 text-xs font-semibold text-white">{activeCount}</span>}
        </button>
        {(activeCount > 0 || q) && (
          <button type="button" onClick={clearAll} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Clear</button>
        )}
      </div>

      {open && (
        <div className="mt-3 grid gap-4 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={lbl}>Client</label>
            <select className={inp + " w-full"} value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select className={inp + " w-full"} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Date from</label>
            <input type="date" className={inp + " w-full"} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Date to</label>
            <input type="date" className={inp + " w-full"} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Min total</label>
              <input inputMode="decimal" className={inp + " w-full"} placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Max total</label>
              <input inputMode="decimal" className={inp + " w-full"} placeholder="∞" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={lbl}>Sort by</label>
            <select className={inp + " w-full"} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Order</label>
            <select className={inp + " w-full"} value={dir} onChange={(e) => setDir(e.target.value)}>
              <option value="desc">Newest / High first</option>
              <option value="asc">Oldest / Low first</option>
            </select>
          </div>
        </div>
      )}
    </form>
  );
}
