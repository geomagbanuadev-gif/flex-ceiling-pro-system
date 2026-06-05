"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "./Spinner";

export const PAGE_SIZES = [10, 20, 50, 100];

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromN = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toN = Math.min(page * pageSize, total);

  function go(changes: Record<string, string | number | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    start(() => router.push(`${pathname}?${p.toString()}`));
  }

  const navBtn = "flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          value={pageSize}
          onChange={(e) => go({ size: e.target.value, page: 1 })}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-navy"
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-slate-300">|</span>
        <span>{fromN}–{toN} of <span className="font-medium text-slate-700">{total}</span></span>
        {pending && <Spinner className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="First page" disabled={page <= 1 || pending} onClick={() => go({ page: 1 })} className={navBtn}>«</button>
        <button type="button" aria-label="Previous page" disabled={page <= 1 || pending} onClick={() => go({ page: page - 1 })} className={navBtn}>‹</button>
        <span className="px-1.5 tabular-nums text-slate-600">{page} / {totalPages}</span>
        <button type="button" aria-label="Next page" disabled={page >= totalPages || pending} onClick={() => go({ page: page + 1 })} className={navBtn}>›</button>
        <button type="button" aria-label="Last page" disabled={page >= totalPages || pending} onClick={() => go({ page: totalPages })} className={navBtn}>»</button>
      </div>
    </div>
  );
}
