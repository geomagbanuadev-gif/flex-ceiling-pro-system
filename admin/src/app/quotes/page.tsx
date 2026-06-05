import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { DocumentsFilters } from "@/components/DocumentsFilters";
import { Pagination, PAGE_SIZES } from "@/components/Pagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { newInvoice } from "@/app/quotes/actions";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString());
const SORT_COLS = ["doc_date", "number", "grand_total", "client_name"];

export default async function DocumentsPage(props: PageProps<"/quotes">) {
  const sp = await props.searchParams;
  return (
    <AppShell
      active="documents"
      title="Documents"
      action={
        <div className="flex gap-2">
          <form action={newInvoice}>
            <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              + Tax Invoice
            </button>
          </form>
          <Link href="/quotes/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
            + New Quotation
          </Link>
        </div>
      }
    >
      <Suspense fallback={<div className="mb-5 h-10 max-w-sm animate-pulse rounded-lg bg-slate-200" />}>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<TableSkeleton cols={6} rows={8} />}>
        <DocumentsTable sp={sp} />
      </Suspense>
    </AppShell>
  );
}

async function FilterBar() {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name").order("name");
  return <DocumentsFilters clients={data ?? []} />;
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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(docs ?? []).map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/quotes/${d.id}`} className="font-medium text-navy hover:underline">{d.number}</Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.type === "invoice" ? "bg-gold/10 text-gold" : "bg-navy/10 text-navy"}`}>{d.type}</span>
                </td>
                <td className="px-4 py-2.5"><span className="text-xs capitalize text-slate-500">{d.status ?? "—"}</span></td>
                <td className="px-4 py-2.5 text-slate-600">{d.doc_date ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700">{d.client_name || "—"}</td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(d.grand_total)}</td>
              </tr>
            ))}
            {(!docs || docs.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No documents match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
