import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { DocumentsFilters } from "@/components/DocumentsFilters";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { newInvoice, newProforma } from "@/app/quotes/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { getProfile, canSeeQuotes, canSeeInvoices, canSeeProformas } from "@/utils/profile";
import { fmtDate } from "@/utils/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeChip } from "@/components/TypeChip";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString());
const SORT_COLS = ["doc_date", "number", "grand_total", "client_name"];

export default async function DocumentsPage(props: PageProps<"/quotes">) {
  const sp = await props.searchParams;
  const me = await getProfile();
  const role = me?.role ?? "super";
  const typeParam = typeof sp.type === "string" ? sp.type : "";
  const lockedType = ["invoice", "quote", "proforma"].includes(typeParam) ? typeParam : undefined;
  const active = typeParam === "invoice" ? "invoices" : typeParam === "proforma" ? "proforma" : typeParam === "quote" ? "quotes" : undefined;
  const title = typeParam === "invoice" ? "Tax Invoices" : typeParam === "proforma" ? "Pro Forma Invoices" : typeParam === "quote" ? "Quotations" : "Documents";

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page" && k !== "size") exportParams.set(k, v);
  const exportHref = `/quotes/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <AppShell
      active={active}
      title={title}
      action={
        <div className="flex flex-wrap gap-2">
          <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50" title="Export to CSV">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            Export
          </a>
          {canSeeProformas(role) && (typeParam === "" || typeParam === "proforma") && (
            <form action={newProforma}>
              <SubmitButton pendingLabel="Creating…" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">
                + Pro Forma
              </SubmitButton>
            </form>
          )}
          {canSeeInvoices(role) && (typeParam === "" || typeParam === "invoice") && (
            <form action={newInvoice}>
              <SubmitButton pendingLabel="Creating…" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">
                + Tax Invoice
              </SubmitButton>
            </form>
          )}
          {canSeeQuotes(role) && (typeParam === "" || typeParam === "quote") && (
            <Link href="/quotes/new" className="inline-flex items-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-navy-700">
              + New Quotation
            </Link>
          )}
        </div>
      }
    >
      <Suspense fallback={<div className="mb-5 h-10 max-w-sm animate-pulse rounded-lg bg-slate-200" />}>
        <FilterBar lockedType={lockedType} />
      </Suspense>
      <Suspense fallback={<TableSkeleton cols={6} rows={8} />}>
        <DocumentsTable sp={sp} />
      </Suspense>
    </AppShell>
  );
}

async function FilterBar({ lockedType }: { lockedType?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name").order("name");
  // key by tab so switching Quotes/Pro Forma/Invoices resets the controls from the
  // URL (no stale filters leaking between tabs).
  return <DocumentsFilters key={lockedType ?? "all"} clients={data ?? []} lockedType={lockedType} />;
}

async function DocumentsTable({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = str("q"), type = str("type"), status = str("status"), client = str("client");
  const from = str("from"), to = str("to"), min = str("min"), max = str("max");
  const sort = SORT_COLS.includes(str("sort")) ? str("sort") : "doc_date";
  const asc = str("dir") === "asc";
  const page = Math.max(1, parseInt(str("page")) || 1);
  const sizeRaw = parseInt(str("size")) || 20;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : 20;
  const fromIdx = (page - 1) * pageSize;

  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("id, number, type, doc_date, client_name, grand_total, status", { count: "exact" });
  if (q) query = query.or(`client_name.ilike.%${q}%,number.ilike.%${q}%`);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (client) query = query.eq("client_id", client);
  if (from) query = query.gte("doc_date", from);
  if (to) query = query.lte("doc_date", to);
  if (min) query = query.gte("grand_total", Number(min));
  if (max) query = query.lte("grand_total", Number(max));
  query = query.order(sort, { ascending: asc, nullsFirst: false }).range(fromIdx, fromIdx + pageSize - 1);

  const { data: docs, count } = await query;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200/70">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(docs ?? []).map((d) => (
              <tr key={d.id} className="relative cursor-pointer transition-colors hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <Link href={`/quotes/${d.id}`} className="font-semibold text-navy before:absolute before:inset-0 hover:text-navy-600">{d.number}</Link>
                </td>
                <td className="px-4 py-3"><TypeChip type={d.type} /></td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(d.doc_date)}</td>
                <td className="px-4 py-3 text-slate-700">{d.client_name || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money(d.grand_total)}</td>
              </tr>
            ))}
            {(!docs || docs.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No documents match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
