import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ConvertButton } from "@/components/ConvertButton";
import { DuplicateButton } from "@/components/DuplicateButton";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusControl } from "@/components/StatusControl";
import { fmtDate } from "@/utils/format";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function QuoteDetailPage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) notFound();
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", id).order("sort_order");

  // audit trail — resolve creator/updater to emails
  const auditIds = [doc.created_by, doc.updated_by].filter(Boolean);
  const { data: profs } = auditIds.length
    ? await supabase.from("profiles").select("id, email").in("id", auditIds)
    : { data: [] as { id: string; email: string }[] };
  const emailOf = (uid: string | null) => profs?.find((p) => p.id === uid)?.email ?? null;

  // quote validity / expiry
  let expiry: { until: string; expired: boolean } | null = null;
  if (doc.type === "quote" && doc.doc_date && doc.validity_days) {
    const d = new Date(doc.doc_date);
    d.setDate(d.getDate() + doc.validity_days);
    const until = d.toISOString().slice(0, 10);
    expiry = { until, expired: until < new Date().toISOString().slice(0, 10) };
  }

  return (
    <AppShell
      active={doc.type === "invoice" ? "invoices" : "quotes"}
      title={`${doc.type === "invoice" ? "Tax Invoice" : "Quotation"} ${doc.number}`}
      action={
        <div className="flex gap-2">
          <Link href="/quotes" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">← Back</Link>
          <Link href={`/quotes/${id}/edit`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Edit</Link>
          <a href={`/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">Open / Print PDF</a>
        </div>
      }
    >
      {/* Status + lifecycle actions */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-medium">Status</span>
          <StatusControl docId={id} type={doc.type === "invoice" ? "invoice" : "quote"} current={doc.status} />
          {expiry && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${expiry.expired ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {expiry.expired ? `Expired ${expiry.until}` : `Valid until ${expiry.until}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc.type === "quote" && <ConvertButton quoteId={id} />}
          <DuplicateButton docId={id} />
          <DeleteButton docId={id} label={`${doc.type === "invoice" ? "Tax Invoice" : "Quotation"} ${doc.number}`} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{doc.client_name}</p>
            {doc.client_trn && <p className="text-slate-600">TRN: {doc.client_trn}</p>}
            {doc.client_email && <p className="text-slate-600">{doc.client_email}</p>}
            {doc.contact_person && <p className="text-slate-600">{doc.contact_person}{doc.contact_phone ? ` · ${doc.contact_phone}` : ""}</p>}
            {doc.client_address && <p className="text-slate-600">{doc.client_address}</p>}
            {doc.reference && <p className="mt-2 text-slate-500">{doc.reference}</p>}
            {doc.type === "invoice" && doc.converted_from && (
              <p className="mt-2 text-xs text-slate-400">Generated from quotation <Link href={`/quotes/${doc.converted_from}`} className="text-navy-600 hover:underline">#{doc.converted_from.slice(0, 8)}</Link></p>
            )}
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
              {doc.discount ? <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>- {money(doc.discount)}</span></div> : null}
              <div className="flex justify-between"><span className="text-slate-500">VAT {doc.vat_rate ?? 5}%</span><span>{money(doc.vat_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900"><span>Grand Total</span><span>{money(doc.grand_total)}</span></div>
            </div>
          </div>
          {doc.notes ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{doc.notes}</p> : null}

          <p className="text-xs text-slate-400">
            {emailOf(doc.created_by) ? <>Created by {emailOf(doc.created_by)}</> : "Imported"}
            {doc.updated_at ? <> · last updated {fmtDate(doc.updated_at.slice(0, 10))}{emailOf(doc.updated_by) ? ` by ${emailOf(doc.updated_by)}` : ""}</> : null}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <iframe src={`/quotes/${id}/pdf`} className="h-[820px] w-full rounded-lg" title="PDF preview" />
        </section>
      </div>
    </AppShell>
  );
}
