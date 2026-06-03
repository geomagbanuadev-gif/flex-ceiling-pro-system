import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

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
    .limit(200);
  if (q) query = query.or(`client_name.ilike.%${q}%,number.ilike.%${q}%`);
  const { data: docs } = await query;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">← Dashboard</Link>
            <h1 className="text-base font-semibold text-slate-900">Documents</h1>
          </div>
          <Link href="/quotes/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Quotation</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <form className="mb-4">
          <input name="q" defaultValue={q} placeholder="Search by client or number…" className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
        </form>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
              {(docs ?? []).map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium"><Link href={`/quotes/${d.id}`} className="text-slate-900 hover:text-slate-600">{d.number}</Link></td>
                  <td className="px-4 py-2.5 capitalize text-slate-600">{d.type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{d.doc_date ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{d.client_name || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-900">{money(d.grand_total)}</td>
                </tr>
              ))}
              {(!docs || docs.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No documents.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
