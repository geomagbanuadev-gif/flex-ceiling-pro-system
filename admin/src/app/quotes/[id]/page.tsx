import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function QuoteDetailPage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) notFound();
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", id).order("sort_order");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/quotes" className="text-xs text-slate-500 hover:text-slate-800">← All documents</Link>
            <h1 className="text-base font-semibold text-slate-900">
              {doc.type === "invoice" ? "Tax Invoice" : "Quotation"} {doc.number}
            </h1>
          </div>
          <div className="flex gap-2">
            <a href={`/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Open / Print PDF</a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{doc.client_name}</p>
            {doc.client_trn && <p className="text-slate-600">TRN: {doc.client_trn}</p>}
            {doc.contact_person && <p className="text-slate-600">{doc.contact_person} · {doc.contact_phone}</p>}
            {doc.client_address && <p className="text-slate-600">{doc.client_address}</p>}
            {doc.reference && <p className="mt-2 text-slate-500">{doc.reference}</p>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Area</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 text-slate-700">{it.description}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{it.area ?? ""}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{it.rate != null ? Number(it.rate).toLocaleString() : ""}</td>
                    <td className="px-3 py-2 text-right text-slate-900">{money(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span>{money(doc.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VAT {doc.vat_rate ?? 5}%</span><span>{money(doc.vat_amount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Grand Total</span><span>{money(doc.grand_total)}</span></div>
            </div>
          </div>
        </section>

        {/* Live PDF preview */}
        <section className="rounded-xl border border-slate-200 bg-white p-2">
          <iframe src={`/quotes/${id}/pdf`} className="h-[800px] w-full rounded-lg" title="PDF preview" />
        </section>
      </main>
    </div>
  );
}
