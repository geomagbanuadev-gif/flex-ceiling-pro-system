import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ConvertButton } from "@/components/ConvertButton";
import { ProformaButton } from "@/components/ProformaButton";
import { ReceiptButton } from "@/components/ReceiptButton";
import { DuplicateButton } from "@/components/DuplicateButton";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusControl } from "@/components/StatusControl";
import { ShareButton } from "@/components/ShareButton";
import { fmtDate } from "@/utils/format";
import { outstandingBalance } from "@/utils/finance";
import { canModifyDocument } from "@/utils/docRules";

const money = (v: number | null) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const changeSummary = (changes: Record<string, { from: string | null; to: string | null }>) =>
  Object.entries(changes).map(([field, value]) => `${field === "date" ? "Date" : field[0].toUpperCase() + field.slice(1)}: ${value.from ?? "—"} → ${value.to ?? "—"}`).join(" · ");

export default async function QuoteDetailPage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) notFound();
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", id).order("sort_order");
  const [{ data: project }, { data: appliedInvoice }, { data: allocatedReceipts }, { data: sourceDocument }, { data: generatedDocuments }, { data: bankAllocation }, { data: changeHistory }] = await Promise.all([
    doc.project_id ? supabase.from("projects").select("id, name, code").eq("id", doc.project_id).maybeSingle() : Promise.resolve({ data: null }),
    doc.type === "receipt" && doc.applies_to_invoice_id ? supabase.from("documents").select("id, number").eq("id", doc.applies_to_invoice_id).maybeSingle() : Promise.resolve({ data: null }),
    doc.type === "invoice" ? supabase.from("documents").select("grand_total").eq("type", "receipt").eq("status", "issued").eq("applies_to_invoice_id", id) : Promise.resolve({ data: [] }),
    doc.converted_from ? supabase.from("documents").select("id, number, type").eq("id", doc.converted_from).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("documents").select("id, number, type, status").eq("converted_from", id).order("created_at", { ascending: false }),
    doc.type === "receipt" ? supabase.from("bank_transaction_allocations").select("bank_transactions(id, booking_date, amount)").eq("receipt_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("document_change_log").select("id, changes, changed_at, changed_by").eq("document_id", id).order("changed_at", { ascending: false }).limit(8),
  ]);
  const received = (allocatedReceipts ?? []).reduce((sum, receipt) => sum + (Number(receipt.grand_total) || 0), 0);
  const invoiceBalance = outstandingBalance(doc.grand_total, received);
  const docWord = doc.type === "invoice" ? "Tax Invoice" : doc.type === "proforma" ? "Pro Forma" : doc.type === "receipt" ? "Receipt" : "Quotation";
  const typeKey: "quote" | "invoice" | "proforma" | "receipt" = doc.type === "invoice" ? "invoice" : doc.type === "proforma" ? "proforma" : doc.type === "receipt" ? "receipt" : "quote";
  const generatedProforma = generatedDocuments?.find((generated) => generated.type === "proforma");
  const generatedInvoice = generatedDocuments?.find((generated) => generated.type === "invoice");
  const generatedReceipt = generatedDocuments?.find((generated) => generated.type === "receipt");
  const canModify = canModifyDocument(doc.type, doc.status);

  // audit trail — resolve creator/updater to emails
  const auditIds = [doc.created_by, doc.updated_by, ...(changeHistory ?? []).map((change) => change.changed_by)].filter(Boolean);
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
      active={typeKey === "invoice" ? "invoices" : typeKey === "proforma" ? "proforma" : typeKey === "receipt" ? "receipts" : "quotes"}
      title={`${docWord} ${doc.number}`}
      action={
        <div className="flex gap-2">
          <Link href={`/quotes?type=${typeKey}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">← Back</Link>
          {canModify && <Link href={`/quotes/${id}/edit`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">Edit</Link>}
          <a href={`/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-navy-700"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>Open / Print PDF</a>
        </div>
      }
    >
      {/* Status + lifecycle actions */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-slate-500">
          <span className="font-medium">Status</span>
          <StatusControl docId={id} type={typeKey} current={doc.status} />
          {expiry && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${expiry.expired ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {expiry.expired ? `Expired ${expiry.until}` : `Valid until ${expiry.until}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          <ShareButton docId={id} docType={doc.type} initialToken={doc.share_token ?? null} />
          {typeKey === "quote" && <ProformaButton sourceId={id} existingId={generatedProforma?.id} existingStatus={generatedProforma?.status} />}
          {(typeKey === "quote" || typeKey === "proforma") && <ConvertButton quoteId={id} sourceType={typeKey} existingId={generatedInvoice?.id} existingStatus={generatedInvoice?.status} />}
          {(typeKey === "invoice" || typeKey === "proforma") && <ReceiptButton sourceId={id} existingId={generatedReceipt?.id} existingStatus={generatedReceipt?.status} />}
          <DuplicateButton docId={id} />
          {canModify ? <DeleteButton docId={id} label={`${docWord} ${doc.number}`} /> : <span className="inline-flex items-center rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-600" title="Finalized billing documents cannot be edited or deleted">Locked after Draft</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 text-sm shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{doc.client_name}</p>
            {doc.client_trn && <p className="text-slate-600">TRN: {doc.client_trn}</p>}
            {doc.client_email && <p className="text-slate-600">{doc.client_email}</p>}
            {doc.contact_person && <p className="text-slate-600">{doc.contact_person}{doc.contact_phone ? ` · ${doc.contact_phone}` : ""}</p>}
            {doc.client_address && <p className="text-slate-600">{doc.client_address}</p>}
            {doc.reference && <p className="mt-2 text-slate-500">{doc.reference}</p>}
            {project && <p className="mt-2">Project: <Link href={`/projects/${project.id}`} className="font-medium text-navy">{project.code ? `${project.code} — ` : ""}{project.name}</Link></p>}
            {doc.type === "invoice" && <p className="mt-1 text-slate-500">Payment due: {doc.due_date ? fmtDate(doc.due_date) : "Due date not set"}</p>}
            {appliedInvoice && <p className="mt-1">Applied to <Link href={`/quotes/${appliedInvoice.id}`} className="font-medium text-navy">{appliedInvoice.number}</Link></p>}
            {bankAllocation?.bank_transactions && (() => { const bank = Array.isArray(bankAllocation.bank_transactions) ? bankAllocation.bank_transactions[0] : bankAllocation.bank_transactions; return bank ? <p className="mt-1">Bank evidence: <Link href={`/bank-transactions/${bank.id}`} className="font-medium text-navy">{fmtDate(bank.booking_date)} · {money(bank.amount)}</Link></p> : null; })()}
            {doc.converted_from && (doc.type === "invoice" || doc.type === "proforma" || doc.type === "receipt") && (
              <p className="mt-2 text-xs text-slate-500">Generated from <Link href={`/quotes/${doc.converted_from}`} className="font-medium text-navy-600 hover:underline">{sourceDocument?.number ?? `#${doc.converted_from.slice(0, 8)}`}</Link></p>
            )}
            {!!generatedDocuments?.length && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><span>Generated:</span>{generatedDocuments.map((generated) => <Link key={generated.id} href={`/quotes/${generated.id}`} className="rounded-full bg-slate-100 px-2 py-1 font-medium text-navy-600 hover:bg-slate-200">{generated.number} · {generated.status}</Link>)}</div>}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[440px] text-sm">
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
              {doc.type === "receipt" ? (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Payment method</span><span className="font-medium capitalize">{doc.payment_method ?? "cash"}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900"><span>Amount received</span><span>{money(doc.grand_total)}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span>{money(doc.subtotal)}</span></div>
                  {doc.discount ? <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>- {money(doc.discount)}</span></div> : null}
                  <div className="flex justify-between"><span className="text-slate-500">VAT {doc.vat_rate ?? 5}%</span><span>{money(doc.vat_amount)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900"><span>Grand Total</span><span>{money(doc.grand_total)}</span></div>
                  {doc.type === "invoice" && <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5"><div className="flex justify-between"><span className="text-slate-500">Issued receipts</span><span>{money(received)}</span></div><div className="flex justify-between font-semibold"><span>Receivable balance</span><span className={invoiceBalance > 0 ? "text-red-600" : "text-green-700"}>{money(invoiceBalance)}</span></div></div>}
                  {doc.type === "proforma" && (
                    <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5">
                      <div className="flex justify-between"><span className="text-slate-500">Advance Payment</span><span>{money(doc.advance_amount)}</span></div>
                      <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span>{money((doc.grand_total ?? 0) - (doc.advance_amount ?? 0))}</span></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {doc.notes ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{doc.notes}</p> : null}

          <p className="text-xs text-slate-500">
            {emailOf(doc.created_by) ? <>Created by {emailOf(doc.created_by)}</> : "Imported"}
            {doc.updated_at ? <> · last updated {fmtDate(doc.updated_at.slice(0, 10))}{emailOf(doc.updated_by) ? ` by ${emailOf(doc.updated_by)}` : ""}</> : null}
          </p>
          {!!changeHistory?.length && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold uppercase tracking-wide text-slate-500">Document history</p>
              <div className="mt-2 space-y-1.5">
                {changeHistory.map((change) => <p key={change.id}>{changeSummary(change.changes)} · {new Date(change.changed_at).toLocaleString("en-AE")}{emailOf(change.changed_by) ? ` · ${emailOf(change.changed_by)}` : ""}</p>)}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-2 shadow-[var(--shadow-card)]">
          <iframe src={`/quotes/${id}/pdf`} className="h-[820px] w-full rounded-lg" title="PDF preview" />
        </section>
      </div>
    </AppShell>
  );
}
