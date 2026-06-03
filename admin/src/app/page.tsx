import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    { label: "Clients", value: clientsRes.count ?? 0 },
    { label: "Documents", value: docsRes.count ?? 0 },
    { label: "Quotations", value: quotesRes.count ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-semibold text-slate-900">FlexCeiling Pro</p>
            <p className="text-xs text-slate-500">Quote &amp; Invoice System</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/quotes/new" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            + New Quotation
          </Link>
          <Link href="/quotes" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            All Documents
          </Link>
          <Link href="/clients" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Clients
          </Link>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent documents</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Number</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(recentRes.data ?? []).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{d.number}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-600">{d.type}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.doc_date ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.client_name || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-900">
                      {d.grand_total != null ? `AED ${Number(d.grand_total).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
                {(!recentRes.data || recentRes.data.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {(clientsRes.error || docsRes.error) && (
            <p className="mt-3 text-sm text-red-600">
              Could not load data: {clientsRes.error?.message || docsRes.error?.message}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
