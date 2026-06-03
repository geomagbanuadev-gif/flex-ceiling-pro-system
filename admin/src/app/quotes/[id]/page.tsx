import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function QuoteDetailPage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) notFound();
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", id).order("sort_order");

  return (
    <AppShell
      active="documents"
      title={`${doc.type === "invoice" ? "Tax Invoice" : "Quotation"} ${doc.number}`}
      action={
        <div className="flex gap-2">
          <Link href="/quotes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">← Back</Link>
          <a href={`/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">Open / Print PDF</a>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{doc.client_name}</p>
            {doc.client_trn && <p className="text-slate-600">TRN: {doc.client_trn}</p>}
            {doc.contact_person && <p className="text-slate-600">{doc.contact_person}{doc.contact_phone ? ` · ${doc.contact_phone}` : ""}</p>}
            {doc.client_address && <p className="text-slate-600">{doc.client_address}</p>}
            {doc.reference && <p className="mt-2 text-slate-500">{doc.reference}</p>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 text-right">Area</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5 text-slate-700">{it.description}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{it.area ?? ""}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{it.rate != null ? Number(it.rate).toLocaleString() : ""}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">{money(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-slate-200 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span>{money(doc.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VAT {doc.vat_rate ?? 5}%</span><span>{money(doc.vat_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900"><span>Grand Total</span><span>{money(doc.grand_total)}</span></div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <iframe src={`/quotes/${id}/pdf`} className="h-[820px] w-full rounded-lg" title="PDF preview" />
        </section>
      </div>
    </AppShell>
  );
}
