import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ClientForm } from "@/components/ClientForm";
import { LinkRow } from "@/components/LinkRow";
import { fmtDate } from "@/utils/format";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString());

export default async function ClientDetailPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [clientRes, docsRes, statsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("documents").select("id, number, type, doc_date, grand_total, status").eq("client_id", id).order("doc_date", { ascending: false, nullsFirst: false }).limit(10),
    supabase.from("documents").select("grand_total", { count: "exact" }).eq("client_id", id),
  ]);

  const client = clientRes.data;
  if (!client) notFound();
  const docs = docsRes.data ?? [];
  const docCount = statsRes.count ?? docs.length;
  const totalValue = (statsRes.data ?? []).reduce((s, d) => s + (Number(d.grand_total) || 0), 0);

  return (
    <AppShell
      active="clients"
      title={client.name}
      action={
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-sm font-medium text-navy-600 hover:underline">← All clients</Link>
          <Link href={`/quotes/new?client=${client.id}`} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">+ New quotation</Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Client details</h2>
          <ClientForm client={client} />
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-3xl font-semibold text-slate-900">{docCount}</p>
            <p className="text-sm text-slate-500">documents · {money(totalValue)} total</p>
            <Link href={`/quotes?client=${id}`} className="mt-3 inline-block text-sm font-medium text-navy-600 hover:underline">
              Filter documents by this client →
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Documents{docCount > 10 ? " · latest 10" : ""}</h2>
          {docCount > 10 && <Link href={`/quotes?client=${id}`} className="text-sm font-medium text-navy-600 hover:underline">View all {docCount} →</Link>}
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => (
                <LinkRow key={d.id} href={`/quotes/${d.id}`} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link href={`/quotes/${d.id}`} className="font-medium text-navy hover:underline">{d.number}</Link></td>
                  <td className="px-4 py-2.5"><span className="text-xs capitalize text-slate-500">{d.type}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtDate(d.doc_date)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(d.grand_total)}</td>
                </LinkRow>
              ))}
              {docs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No documents yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
