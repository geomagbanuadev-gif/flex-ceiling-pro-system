import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString();

export default async function DashboardPage() {
  const supabase = await createClient();

  const [clientsRes, docsRes, quotesRes, recentRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("type", "quote"),
    supabase
      .from("documents")
      .select("id, number, type, doc_date, client_name, grand_total")
      .order("doc_date", { ascending: false, nullsFirst: false })
      .limit(12),
  ]);

  const stats = [
    { label: "Clients", value: clientsRes.count ?? 0, accent: "bg-navy" },
    { label: "Documents", value: docsRes.count ?? 0, accent: "bg-gold" },
    { label: "Quotations", value: quotesRes.count ?? 0, accent: "bg-green" },
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
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
            <span className={`absolute left-0 top-0 h-full w-1 ${s.accent}`} />
            <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
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
                  <td className="px-4 py-2.5">
                    <Link href={`/quotes/${d.id}`} className="font-medium text-navy hover:underline">{d.number}</Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.type === "invoice" ? "bg-gold/10 text-gold" : "bg-navy/10 text-navy"}`}>{d.type}</span>
                  </td>
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
        {(clientsRes.error || docsRes.error) && (
          <p className="mt-3 text-sm text-red-600">Could not load data: {clientsRes.error?.message || docsRes.error?.message}</p>
        )}
      </section>
    </AppShell>
  );
}
