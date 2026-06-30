import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { PoFilters } from "@/components/PoFilters";
import { PoStatusBadge } from "@/components/PoStatusBadge";
import { LinkRow } from "@/components/LinkRow";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { NewPoButton } from "@/components/NewPoButton";
import { getProfile, canSeeProcurement } from "@/utils/profile";
import { fmtDate } from "@/utils/format";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString());

export default async function PurchaseOrdersPage(props: PageProps<"/purchase-orders">) {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  const sp = await props.searchParams;

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page" && k !== "size") exportParams.set(k, v);
  const exportHref = `/purchase-orders/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <AppShell
      active="purchase-orders"
      title="Purchase Orders"
      subtitle="Material orders raised to suppliers"
      action={
        <div className="flex flex-wrap gap-2">
          <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            Export
          </a>
          <NewPoButton className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700">+ New Purchase Order</NewPoButton>
        </div>
      }
    >
      <Suspense fallback={<div className="mb-5 h-10 max-w-sm animate-pulse rounded-lg bg-slate-200" />}><PoFilters /></Suspense>
      <Suspense fallback={<TableSkeleton cols={5} rows={8} />}><PoTable sp={sp} /></Suspense>
    </AppShell>
  );
}

async function PoTable({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q"), status = str("status");
  const page = Math.max(1, parseInt(str("page")) || 1);
  const sizeRaw = parseInt(str("size")) || 20;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : 20;
  const fromIdx = (page - 1) * pageSize;

  const supabase = await createClient();
  let query = supabase.from("purchase_orders").select("id, number, supplier_name, po_date, status, grand_total, reference", { count: "exact" });
  if (q) query = query.or(`number.ilike.%${q}%,supplier_name.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  query = query.order("po_date", { ascending: false, nullsFirst: false }).range(fromIdx, fromIdx + pageSize - 1);
  const { data: pos, count } = await query;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr><th className="px-4 py-3">PO No.</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(pos ?? []).map((po) => (
              <LinkRow key={po.id} href={`/purchase-orders/${po.id}`} className="cursor-pointer transition-colors hover:bg-slate-50/70">
                <td className="px-4 py-3"><Link href={`/purchase-orders/${po.id}`} className="font-semibold text-navy hover:text-navy-600">{po.number}</Link></td>
                <td className="px-4 py-3"><PoStatusBadge status={po.status} /></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(po.po_date)}</td>
                <td className="px-4 py-3 text-slate-700">{po.supplier_name || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money(po.grand_total)}</td>
              </LinkRow>
            ))}
            {(!pos || pos.length === 0) && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No purchase orders match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
