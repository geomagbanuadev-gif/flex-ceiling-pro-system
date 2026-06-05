import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";

const money = (v: number | null) => "AED " + Number(v ?? 0).toLocaleString("en-AE", { maximumFractionDigits: 0 });

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  won: "bg-green-500",
  paid: "bg-green-500",
  lost: "bg-red-400",
  imported: "bg-amber-400",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [clientsRes, allRes, recentRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("type, status, grand_total, doc_date"),
    supabase
      .from("documents")
      .select("id, number, type, doc_date, client_name, grand_total, status")
      .order("doc_date", { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  const all = allRes.data ?? [];
  const invoices = all.filter((d) => d.type === "invoice");
  const quotes = all.filter((d) => d.type === "quote");
  const sum = (arr: typeof all) => arr.reduce((s, d) => s + (Number(d.grand_total) || 0), 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const invoicedTotal = sum(invoices);
  const outstanding = sum(invoices.filter((d) => d.status !== "paid"));
  const thisMonth = sum(invoices.filter((d) => (d.doc_date ?? "") >= monthStart));
  const wonCount = quotes.filter((d) => d.status === "won").length;
  const conversion = quotes.length ? Math.round((wonCount / quotes.length) * 100) : 0;

  // quote pipeline by status
  const pipeline: Record<string, number> = {};
  for (const q of quotes) {
    const s = q.status ?? "draft";
    pipeline[s] = (pipeline[s] || 0) + 1;
  }
  const pipelineMax = Math.max(1, ...Object.values(pipeline));
  const pipelineOrder = ["draft", "sent", "won", "lost", "imported"].filter((s) => pipeline[s]);

  const kpis = [
    { label: "Outstanding (unpaid invoices)", value: money(outstanding), accent: "bg-gold", sub: `${invoices.filter((d) => d.status !== "paid").length} invoices` },
    { label: "Invoiced (all time)", value: money(invoicedTotal), accent: "bg-navy", sub: `${invoices.length} tax invoices` },
    { label: `Invoiced in ${monthName}`, value: money(thisMonth), accent: "bg-green", sub: "current month" },
    { label: "Quote conversion", value: `${conversion}%`, accent: "bg-blue-500", sub: `${wonCount} of ${quotes.length} won` },
  ];

  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      action={
        <Link href="/quotes/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
          + New Quotation
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
            <span className={`absolute left-0 top-0 h-full w-1 ${k.accent}`} />
            <p className="text-2xl font-semibold text-slate-900">{k.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">{k.label}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Pipeline */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quote pipeline</h2>
          <div className="mt-4 space-y-3">
            {pipelineOrder.length === 0 && <p className="text-sm text-slate-400">No quotes yet.</p>}
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
          <div className="mt-5 flex gap-4 border-t border-slate-100 pt-4 text-center text-xs">
            <Link href="/clients" className="flex-1 hover:underline"><span className="block text-xl font-semibold text-slate-900">{clientsRes.count ?? 0}</span><span className="text-slate-500">Clients</span></Link>
            <Link href="/quotes?type=quote" className="flex-1 hover:underline"><span className="block text-xl font-semibold text-slate-900">{quotes.length}</span><span className="text-slate-500">Quotes</span></Link>
            <Link href="/quotes?type=invoice" className="flex-1 hover:underline"><span className="block text-xl font-semibold text-slate-900">{invoices.length}</span><span className="text-slate-500">Invoices</span></Link>
          </div>
        </section>

        {/* Recent documents */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent documents</h2>
            <Link href="/quotes" className="text-sm font-medium text-navy-600 hover:underline">View all →</Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(recentRes.data ?? []).map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5"><Link href={`/quotes/${d.id}`} className="font-medium text-navy hover:underline">{d.number}</Link></td>
                    <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.type === "invoice" ? "bg-gold/10 text-gold" : "bg-navy/10 text-navy"}`}>{d.type}</span></td>
                    <td className="px-4 py-2.5 text-slate-600">{d.doc_date ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{d.client_name || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(d.grand_total)}</td>
                  </tr>
                ))}
                {(!recentRes.data || recentRes.data.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No documents found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
