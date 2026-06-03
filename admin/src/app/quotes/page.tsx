import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString();

export default async function DocumentsPage(props: PageProps<"/quotes">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("id, number, type, doc_date, client_name, grand_total, status")
    .order("doc_date", { ascending: false, nullsFirst: false })
    .limit(300);
  if (q) query = query.or(`client_name.ilike.%${q}%,number.ilike.%${q}%`);
  const { data: docs } = await query;

  return (
    <AppShell
      active="documents"
      title="Documents"
      action={
        <Link href="/quotes/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
          + New Quotation
        </Link>
      }
    >
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by client or number…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy"
        />
      </form>

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
            {(docs ?? []).map((d) => (
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
            {(!docs || docs.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No documents.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">{docs?.length ?? 0} shown</p>
    </AppShell>
  );
}
