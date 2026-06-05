import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ClientsSearch } from "@/components/ClientsSearch";

const PAGE_SIZE = 25;
const money = (v: number) => "AED " + Number(v).toLocaleString();

export default async function ClientsPage(props: PageProps<"/clients">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "") || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, trn, email, contact_person, contact_phone", { count: "exact" })
    .order("name")
    .range(fromIdx, fromIdx + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%`);
  const { data: clients, count } = await query;

  // document counts + totals for the visible clients
  const ids = (clients ?? []).map((c) => c.id);
  const stats = new Map<string, { n: number; total: number }>();
  if (ids.length) {
    const { data: docs } = await supabase.from("documents").select("client_id, grand_total").in("client_id", ids);
    for (const d of docs ?? []) {
      if (!d.client_id) continue;
      const s = stats.get(d.client_id) ?? { n: 0, total: 0 };
      s.n += 1;
      s.total += Number(d.grand_total) || 0;
      stats.set(d.client_id, s);
    }
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/clients?${params}`;
  };

  return (
    <AppShell
      active="clients"
      title="Clients"
      action={
        <Link href="/clients/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
          + New Client
        </Link>
      }
    >
      <ClientsSearch />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">TRN</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Docs</th>
              <th className="px-4 py-3 text-right">Total value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(clients ?? []).map((c) => {
              const s = stats.get(c.id);
              return (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/clients/${c.id}`} className="font-medium text-navy hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.trn || <span className="text-amber-500">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.contact_person || c.contact_phone || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{s?.n ?? 0}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(s?.total ?? 0)}</td>
                </tr>
              );
            })}
            {(!clients || clients.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No clients found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{total} client{total === 1 ? "" : "s"}</p>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1">
            {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">‹ Prev</Link> : <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-300">‹ Prev</span>}
            <span className="px-3 text-sm text-slate-600">Page {page} of {totalPages}</span>
            {page < totalPages ? <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Next ›</Link> : <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-300">Next ›</span>}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
