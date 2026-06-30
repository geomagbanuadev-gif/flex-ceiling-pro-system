import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SuppliersSearch } from "@/components/SuppliersSearch";
import { LinkRow } from "@/components/LinkRow";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { getProfile, canSeeProcurement } from "@/utils/profile";

const money = (v: number) => "AED " + Number(v).toLocaleString();

export default async function SuppliersPage(props: PageProps<"/suppliers">) {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  const sp = await props.searchParams;
  return (
    <AppShell
      active="suppliers"
      title="Suppliers"
      subtitle="Vendors you buy materials from"
      action={
        <Link href="/suppliers/new" className="inline-flex items-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-navy-700">
          + New Supplier
        </Link>
      }
    >
      <SuppliersSearch />
      <Suspense fallback={<TableSkeleton cols={5} rows={8} />}>
        <SuppliersTable sp={sp} />
      </Suspense>
    </AppShell>
  );
}

async function SuppliersTable({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q");
  const page = Math.max(1, parseInt(str("page")) || 1);
  const sizeRaw = parseInt(str("size")) || 20;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : 20;
  const fromIdx = (page - 1) * pageSize;

  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select("id, name, trn, contact_person, contact_phone", { count: "exact" })
    .order("name")
    .range(fromIdx, fromIdx + pageSize - 1);
  if (q) query = query.or(`name.ilike.%${q}%,contact_person.ilike.%${q}%`);
  const { data: suppliers, count } = await query;

  const ids = (suppliers ?? []).map((s) => s.id);
  const stats = new Map<string, { n: number; total: number }>();
  if (ids.length) {
    const { data: pos } = await supabase.from("purchase_orders").select("supplier_id, grand_total").in("supplier_id", ids);
    for (const po of pos ?? []) {
      if (!po.supplier_id) continue;
      const s = stats.get(po.supplier_id) ?? { n: 0, total: 0 };
      s.n += 1;
      s.total += Number(po.grand_total) || 0;
      stats.set(po.supplier_id, s);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">TRN</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">POs</th>
              <th className="px-4 py-3 text-right">Total purchased</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(suppliers ?? []).map((s) => {
              const st = stats.get(s.id);
              return (
                <LinkRow key={s.id} href={`/suppliers/${s.id}`} className="cursor-pointer transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3"><Link href={`/suppliers/${s.id}`} className="font-semibold text-navy hover:text-navy-600">{s.name}</Link></td>
                  <td className="px-4 py-3 text-slate-500">{s.trn || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contact_person || s.contact_phone || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{st?.n ?? 0}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money(st?.total ?? 0)}</td>
                </LinkRow>
              );
            })}
            {(!suppliers || suppliers.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
