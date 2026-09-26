import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { TypeChip } from "@/components/TypeChip";
import { LinkRow } from "@/components/LinkRow";
import { fmtDate } from "@/utils/format";
import { statusesFor } from "@/utils/docRules";
import { canAccessType, canSeeQuotes, getProfile } from "@/utils/profile";

const money = (v: number | null) => "AED " + Number(v ?? 0).toLocaleString("en-AE", { maximumFractionDigits: 0 });
const kAed = (v: number) => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : String(Math.round(v)));

const I = {
  wallet: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7" /><path d="M16 12h.01" /></svg>,
  doc: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></svg>,
  calendar: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  trend: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  won: "bg-green-500",
  ongoing: "bg-violet-500",
  paid: "bg-green-500",
  lost: "bg-red-400",
  imported: "bg-amber-400",
};

export default async function DashboardPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);
  const canCreateQuote = Boolean(profile && canSeeQuotes(profile.role));
  const financeOnly = profile?.role === "finance";

  const [clientsRes, summaryRes, monthlyRes, pipelineRes, topClientsRes, recentRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.rpc("dashboard_summary"),
    supabase.from("dashboard_monthly_sales").select("month, total"),
    supabase.from("dashboard_quote_pipeline").select("status, count"),
    supabase.from("dashboard_top_clients").select("client, total").order("total", { ascending: false }),
    supabase
      .from("documents")
      .select("id, number, type, doc_date, client_name, grand_total, status")
      .order("doc_date", { ascending: false, nullsFirst: false })
      .limit(8),
  ]);
  const readError = [summaryRes, monthlyRes, pipelineRes, topClientsRes].find((result) => result.error)?.error;
  if (readError) throw new Error(`Dashboard requires read-performance.sql: ${readError.message}`);
  const summary = summaryRes.data as Record<string, number>;

  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const conversion = summary.quoteCount ? Math.round((summary.acceptedCount / summary.quoteCount) * 100) : 0;

  // last 6 months invoiced
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-US", { month: "short" }) });
  }
  const monthlyValues = new Map((monthlyRes.data ?? []).map((row) => [row.month, Number(row.total) || 0]));
  const monthly = months.map((m) => ({ ...m, total: monthlyValues.get(m.key) ?? 0 }));
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.total));

  // quote pipeline by status
  const pipeline: Record<string, number> = {};
  for (const row of pipelineRes.data ?? []) {
    const status = row.status ?? "draft";
    pipeline[status] = (pipeline[status] ?? 0) + (Number(row.count) || 0);
  }
  const pipelineMax = Math.max(1, ...Object.values(pipeline));
  const pipelineOrder = [...statusesFor("quote"), "imported"].filter((s) => pipeline[s]);

  // top clients by total business value
  const topClients = (topClientsRes.data ?? []).map((row) => ({ name: row.client, total: Number(row.total) || 0 }));
  const topMax = Math.max(1, ...topClients.map((c) => c.total));

  const kpis = [
    { label: "Outstanding", value: money(summary.outstanding), tint: "bg-gold/10 text-gold", icon: I.wallet, sub: `${summary.outstandingCount} invoices with balance` },
    { label: "Invoiced (all time)", value: money(summary.invoicedTotal), tint: "bg-navy/10 text-navy", icon: I.doc, sub: `${summary.invoiceCount} issued tax invoices` },
    { label: `Invoiced in ${monthName}`, value: money(summary.monthTotal), tint: "bg-emerald-500/10 text-emerald-600", icon: I.calendar, sub: "current month" },
    { label: "Quote conversion", value: `${conversion}%`, tint: "bg-blue-500/10 text-blue-600", icon: I.trend, sub: `${summary.acceptedCount} of ${summary.quoteCount} won or ongoing` },
  ];

  const card = "min-w-0 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200";
  const h2 = "text-xs font-semibold uppercase tracking-wider text-slate-500";

  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      subtitle="Your quotes, pro formas & invoices at a glance"
      action={canCreateQuote ? <Link href="/quotes/new" className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-navy-700">+ New Quotation</Link> : undefined}
    >
      <div className="grid gap-4 fc-rise sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tint={k.tint} />
        ))}
      </div>

      {/* Monthly invoiced + pipeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`}>
          <h2 className={h2}>Invoiced — last 6 months</h2>
          <div className="mt-6 flex h-48 items-end gap-3 border-b border-slate-100 pb-px">
            {monthly.map((m) => (
              <div key={m.key} className="group flex flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-semibold text-slate-500">{m.total > 0 ? kAed(m.total) : ""}</span>
                <div
                  className="w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-navy to-navy-600 transition-all duration-300 group-hover:from-navy-700 group-hover:to-gold"
                  style={{ height: `${Math.max(m.total > 0 ? 4 : 0, (m.total / monthlyMax) * 100)}%` }}
                  title={`${m.label}: ${money(m.total)}`}
                />
                <span className="text-xs font-medium text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className={h2}>Quote pipeline</h2>
          <div className="mt-4 space-y-3">
            {pipelineOrder.length === 0 && <p className="text-sm text-slate-500">No quotes yet.</p>}
            {pipelineOrder.map((s) => (
              <div key={s}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="capitalize text-slate-600">{s}</span>
                  <span className="font-medium text-slate-700">{pipeline[s]}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${STATUS_COLORS[s] ?? "bg-slate-400"}`} style={{ width: `${(pipeline[s] / pipelineMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-1 border-t border-slate-100 pt-4 text-center text-xs">
            <Link href="/clients" className="rounded-lg py-1.5 transition-colors hover:bg-slate-50"><span className="block text-lg font-semibold text-slate-900">{clientsRes.count ?? 0}</span><span className="text-slate-500">Clients</span></Link>
            <Link href="/quotes?type=quote" className="rounded-lg py-1.5 transition-colors hover:bg-slate-50"><span className="block text-lg font-semibold text-slate-900">{summary.quoteCount}</span><span className="text-slate-500">Quotes</span></Link>
            <Link href="/quotes?type=proforma" className="rounded-lg py-1.5 transition-colors hover:bg-slate-50"><span className="block text-lg font-semibold text-slate-900">{summary.proformaCount}</span><span className="text-slate-500">Pro Forma</span></Link>
            <Link href="/quotes?type=invoice" className="rounded-lg py-1.5 transition-colors hover:bg-slate-50"><span className="block text-lg font-semibold text-slate-900">{summary.invoiceCount}</span><span className="text-slate-500">Invoices</span></Link>
          </div>
        </section>
      </div>

      {/* Top clients + recent */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={card}>
          <h2 className={h2}>Top clients by value</h2>
          <div className="mt-4 space-y-3">
            {topClients.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {topClients.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-slate-600" title={c.name}>{c.name}</span>
                  <span className="shrink-0 font-medium text-slate-700">{money(c.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(c.total / topMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={h2}>Recent documents</h2>
            {!financeOnly && <Link href="/quotes" className="text-sm font-medium text-navy-600 transition-colors hover:text-navy">View all →</Link>}
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(recentRes.data ?? []).map((d) => {
                  const canOpen = Boolean(profile && canAccessType(profile.role, d.type));
                  const cells = <><td className="px-4 py-3">{canOpen ? <Link href={`/quotes/${d.id}`} className="font-semibold text-navy hover:text-navy-600">{d.number}</Link> : <span className="font-semibold text-slate-700">{d.number}</span>}</td>
                    <td className="px-4 py-3"><TypeChip type={d.type} /></td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(d.doc_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{d.client_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money(d.grand_total)}</td></>;
                  return canOpen ? <LinkRow key={d.id} href={`/quotes/${d.id}`} className="cursor-pointer transition-colors hover:bg-slate-50/70">{cells}</LinkRow> : <tr key={d.id}>{cells}</tr>;
                })}
                {(!recentRes.data || recentRes.data.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No documents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
