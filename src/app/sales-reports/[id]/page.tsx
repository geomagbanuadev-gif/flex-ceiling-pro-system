import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SalesReportView } from "@/components/SalesReportView";
import { SalesReportPreview } from "@/components/SalesReportPreview";
import { createClient } from "@/utils/supabase/server";
import { canSeeInvoices, getProfile } from "@/utils/profile";
import { fmtDate } from "@/utils/format";
import type { SalesRow, SalesSnapshot } from "@/utils/salesReport";

export default async function SavedSalesReportPage(props: PageProps<"/sales-reports/[id]">) {
  const profile = await getProfile();
  if (profile && !canSeeInvoices(profile.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: report } = await supabase.from("sales_reports").select("*").eq("id", id).maybeSingle();
  if (!report) notFound();

  const rows = Array.isArray(report.invoice_rows) ? report.invoice_rows as SalesRow[] : [];
  const snapshot: SalesSnapshot = {
    generatedAt: report.created_at,
    rows,
    totals: {
      invoiceCount: Number(report.invoice_count ?? rows.length), subtotal: Number(report.subtotal ?? 0),
      discount: Number(report.discount ?? 0), vatAmount: Number(report.vat_amount ?? 0), grandTotal: Number(report.grand_total ?? 0),
    },
  };

  return (
    <AppShell active="sales-reports" title={report.name} subtitle={`Saved snapshot · ${fmtDate(report.date_from)} – ${fmtDate(report.date_to)}`} action={
      <div className="flex flex-wrap gap-2"><Link href="/sales-reports" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] hover:bg-slate-50">Back to reports</Link><a href={`/sales-reports/${id}/export?format=pdf`} className="rounded-xl bg-navy px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">Export PDF</a><a href={`/sales-reports/${id}/export?format=xlsx`} className="rounded-xl bg-gold px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-gold-400">Export Excel</a></div>
    }>
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">This is a saved snapshot. Later invoice edits do not change these figures.</div>
      <SalesReportPreview src={`/sales-reports/${id}/export?format=pdf&inline=1`} />
      <div className="mt-8"><h2 className="mb-3 text-lg font-semibold text-slate-900">Report data</h2><SalesReportView snapshot={snapshot} /></div>
    </AppShell>
  );
}
