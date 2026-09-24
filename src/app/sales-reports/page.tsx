import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SalesReportView } from "@/components/SalesReportView";
import { SalesReportFilters } from "@/components/SalesReportFilters";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/utils/supabase/server";
import { canSeeInvoices, getProfile } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { SALES_STATUS_LABELS, normalizeSalesPeriod, normalizeSalesStatus, salesRange } from "@/utils/salesReport";
import { loadSalesSnapshot } from "./data";
import { saveSalesReport } from "./actions";

export default async function SalesReportsPage(props: PageProps<"/sales-reports">) {
  const profile = await getProfile();
  if (profile && !canSeeInvoices(profile.role)) redirect("/");

  const sp = await props.searchParams;
  const str = (key: string) => typeof sp[key] === "string" ? sp[key] as string : "";
  const period = normalizeSalesPeriod(str("period"));
  const status = normalizeSalesStatus(str("status"));
  const today = new Date().toISOString().slice(0, 10);
  const anchor = str("anchor") || today;
  const range = salesRange({ period, anchor, from: str("from"), to: str("to") });

  const supabase = await createClient();
  const [snapshot, savedRes, undatedRes] = await Promise.all([
    loadSalesSnapshot(range, status),
    supabase.from("sales_reports").select("id, name, date_from, date_to, status_filter, invoice_count, grand_total, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("type", "invoice").is("doc_date", null),
  ]);
  const storageReady = !savedRes.error;
  const exportParams = new URLSearchParams({ from: range.from, to: range.to, status });
  const inp = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";

  return (
    <AppShell active="sales-reports" title="Sales Reports" subtitle="Generate and save tax invoice sales snapshots">
      <SalesReportFilters period={period} status={status} anchor={anchor} from={range.from} to={range.to} />

      {Boolean(undatedRes.count) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{undatedRes.count} invoice{undatedRes.count === 1 ? " has" : "s have"} no date and cannot be included in date-based reports.</div>}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">{fmtDate(range.from)} – {fmtDate(range.to)}</h2><p className="text-sm text-slate-500">{SALES_STATUS_LABELS[status]} · Generated from current invoice data</p></div>
        <div className="flex flex-wrap gap-2">
          <a href={`/sales-reports/export?${exportParams}&format=pdf`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] hover:bg-slate-50">Export PDF</a>
          <a href={`/sales-reports/export?${exportParams}&format=xlsx`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] hover:bg-slate-50">Export Excel</a>
          {storageReady && snapshot.rows.length > 0 && (
            <form action={saveSalesReport} className="flex flex-wrap gap-2">
              <input type="hidden" name="period" value={period} /><input type="hidden" name="status" value={status} />
              <input type="hidden" name="from" value={range.from} /><input type="hidden" name="to" value={range.to} />
              <input name="name" aria-label="Report name" placeholder="Optional report name" className={`${inp} w-52`} />
              <SubmitButton pendingLabel="Saving…" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold-400">Save report</SubmitButton>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4"><SalesReportView snapshot={snapshot} /></div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Saved reports</h2>
        <div className="mt-3 grid gap-3">
          {(savedRes.data ?? []).map((report) => (
            <div key={report.id} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <Link href={`/sales-reports/${report.id}`} className="block truncate font-semibold text-navy hover:text-navy-600">{report.name}</Link>
                <p className="mt-1 text-sm text-slate-500">{fmtDate(report.date_from)} – {fmtDate(report.date_to)} · {SALES_STATUS_LABELS[normalizeSalesStatus(report.status_filter)]}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 md:min-w-64">
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Invoices</p><p className="mt-1 font-semibold tabular-nums text-slate-800">{report.invoice_count}</p></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</p><p className="mt-1 font-semibold tabular-nums text-slate-800">{money2(report.grand_total)}</p></div>
              </div>
              <Link href={`/sales-reports/${report.id}`} className="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">Preview</Link>
            </div>
          ))}
          {!savedRes.data?.length && <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-[var(--shadow-card)] ring-1 ring-slate-200">No saved sales reports yet.</div>}
        </div>
      </section>
    </AppShell>
  );
}
