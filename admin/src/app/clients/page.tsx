import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ClientsSearch } from "@/components/ClientsSearch";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { TableSkeleton } from "@/components/TableSkeleton";

const money = (v: number) => "AED " + Number(v).toLocaleString();

export default async function ClientsPage(props: PageProps<"/clients">) {
  const sp = await props.searchParams;
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
      <Suspense fallback={<TableSkeleton cols={5} rows={8} />}>
        <ClientsTable sp={sp} />
      </Suspense>
    </AppShell>
  );
}

async function ClientsTable({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q");
  const page = Math.max(1, parseInt(str("page")) || 1);
  const sizeRaw = parseInt(str("size")) || 25;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : 25;
  const fromIdx = (page - 1) * pageSize;

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, trn, email, contact_person, contact_phone", { count: "exact" })
    .order("name")
    .range(fromIdx, fromIdx + pageSize - 1);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%`);
  const { data: clients, count } = await query;

  // document counts + totals for the visible clients only
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

  return (
    <>
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
      <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
