"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { amountInWords } from "@/utils/amountInWords";
import { getProfile, canSeeInvoices } from "@/utils/profile";

const QUOTE_STATUSES = ["draft", "sent", "won", "lost"];
const INVOICE_STATUSES = ["draft", "sent", "paid", "lost"];
// Pro formas are billing documents, so they share the invoice lifecycle.
const statusesFor = (type: string) => (type === "quote" ? QUOTE_STATUSES : INVOICE_STATUSES);

type DocType = "quote" | "invoice" | "proforma";
const numberPrefix = (type: DocType, s: Record<string, unknown> | null | undefined) =>
  (type === "invoice" ? (s?.invoice_prefix as string) ?? "INV-"
    : type === "proforma" ? (s?.proforma_prefix as string) ?? "PF-"
      : (s?.quote_prefix as string) ?? "1000-");

/** Next sequential document number for a type, e.g. "PF-0007". */
async function nextNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: DocType,
  prefix: string
) {
  const { data: nums } = await supabase.from("documents").select("number").eq("type", type);
  let max = 0;
  for (const n of nums ?? []) {
    const m = String(n.number).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(4, "0");
}

// Supplier (company) details are snapshotted onto each document at creation,
// so editing company Settings never changes already-issued quotes/invoices.
const SUPPLIER_COLS =
  "legal_name, address, email, phone, trn, bank_account_name, bank_account_no, bank_iban, bank_currency, bank_name";
const SNAPSHOT_KEYS = [
  "legal_name", "address", "email", "phone", "trn",
  "bank_account_name", "bank_account_no", "bank_iban", "bank_currency", "bank_name",
];
function snapshotOf(s: Record<string, unknown> | null | undefined) {
  if (!s) return null;
  const out: Record<string, string | null> = {};
  for (const k of SNAPSHOT_KEYS) out[k] = (s[k] as string | null) ?? null;
  return out;
}

// Insert a document; if the supplier_snapshot column hasn't been added yet,
// retry without it so document creation never hard-fails.
async function insertDoc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>
) {
  let res = await supabase.from("documents").insert(row).select("id").single();
  // Gracefully drop columns whose migration hasn't been applied yet.
  for (const col of ["supplier_snapshot", "advance_amount"]) {
    if (res.error && new RegExp(col, "i").test(res.error.message || "")) {
      const rest = { ...row };
      delete rest[col];
      res = await supabase.from("documents").insert(rest).select("id").single();
    }
  }
  return res;
}

export type QuoteItemInput = {
  description: string;
  area: number | null;
  unit: string;
  rate: number | null;
  amount: number | null;
};

export type QuotePayload = {
  id?: string;
  type?: DocType;
  clientId: string | null;
  clientName: string;
  clientTrn: string;
  clientAddress: string;
  clientEmail: string;
  contactPerson: string;
  contactPhone: string;
  number: string;
  date: string;
  reference: string;
  paymentTerms: string;
  validityDays: number;
  notes: string;
  vatRate: number;
  discount: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  advanceAmount: number;
  items: QuoteItemInput[];
};

export async function saveQuote(p: QuotePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // find-or-create client by name
  let clientId = p.clientId;
  if (!clientId && p.clientName.trim()) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", p.clientName.trim())
      .limit(1)
      .maybeSingle();
    if (existing) clientId = existing.id;
    else {
      const { data: created } = await supabase
        .from("clients")
        .insert({
          name: p.clientName.trim(),
          trn: p.clientTrn || null,
          address: p.clientAddress || null,
          email: p.clientEmail || null,
          contact_person: p.contactPerson || null,
          contact_phone: p.contactPhone || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }
  }

  const type = p.type ?? "quote";
  const docFields = {
    type,
    number: p.number,
    doc_date: p.date || null,
    client_id: clientId,
    client_name: p.clientName,
    client_trn: p.clientTrn || null,
    client_address: p.clientAddress || null,
    client_email: p.clientEmail || null,
    contact_person: p.contactPerson || null,
    contact_phone: p.contactPhone || null,
    reference: p.reference || null,
    payment_terms: p.paymentTerms || null,
    validity_days: p.validityDays || null,
    subtotal: p.subtotal,
    discount: p.discount || 0,
    vat_rate: p.vatRate,
    vat_amount: p.vatAmount,
    grand_total: p.grandTotal,
    advance_amount: type === "proforma" ? p.advanceAmount || 0 : 0,
    amount_in_words: type === "quote" ? null : amountInWords(p.grandTotal),
    notes: p.notes || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let docId = p.id;
  if (docId) {
    // edit: update fields but keep the existing status AND original supplier snapshot
    const { error: upErr } = await supabase.from("documents").update(docFields).eq("id", docId);
    if (upErr) throw new Error(`Could not save document: ${upErr.message}`);
    const { error: delErr } = await supabase.from("document_items").delete().eq("document_id", docId);
    if (delErr) throw new Error(`Could not update line items: ${delErr.message}`);
  } else {
    // new document: freeze the current company details onto it
    const { data: settings } = await supabase.from("company_settings").select(SUPPLIER_COLS).eq("id", 1).maybeSingle();
    const { data: doc, error } = await insertDoc(supabase, { ...docFields, status: "draft", supplier_snapshot: snapshotOf(settings), created_by: user.id });
    if (error) throw new Error(`Could not create document: ${error.message}`);
    docId = doc.id;
  }

  const items = p.items
    .filter((it) => it.description.trim() || it.amount)
    .map((it, i) => ({
      document_id: docId,
      sr_no: i + 1,
      description: it.description,
      area: it.area,
      unit: it.unit || "Sqm",
      rate: it.rate,
      amount: it.amount,
      sort_order: i,
    }));
  if (items.length) {
    const { error: itErr } = await supabase.from("document_items").insert(items);
    if (itErr) throw new Error(`Could not save line items: ${itErr.message}`);
  }

  redirect(`/quotes/${docId}?flash=saved`);
}

/** Generate a Tax Invoice from an existing quotation (copies client + line items). */
export async function convertToInvoice(quoteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // if already converted, just open the existing invoice
  const { data: already } = await supabase
    .from("documents")
    .select("id")
    .eq("type", "invoice")
    .eq("converted_from", quoteId)
    .maybeSingle();
  if (already) redirect(`/quotes/${already.id}`);

  const { data: quote, error: qErr } = await supabase.from("documents").select("*").eq("id", quoteId).single();
  if (qErr || !quote) throw new Error("Quote not found");
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", quoteId).order("sort_order");

  // next invoice number from the invoice prefix sequence
  const { data: settings } = await supabase.from("company_settings").select(`invoice_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const prefix = settings?.invoice_prefix ?? "INV-";
  const { data: nums } = await supabase.from("documents").select("number").eq("type", "invoice");
  let max = 0;
  for (const n of nums ?? []) {
    const m = String(n.number).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const number = prefix + String(max + 1).padStart(4, "0");

  const { data: inv, error } = await insertDoc(supabase, {
    type: "invoice",
    number,
    doc_date: new Date().toISOString().slice(0, 10),
    client_id: quote.client_id,
    client_name: quote.client_name,
    client_trn: quote.client_trn,
    client_address: quote.client_address,
    client_email: quote.client_email,
    contact_person: quote.contact_person,
    contact_phone: quote.contact_phone,
    reference: quote.reference,
    status: "draft",
    notes: quote.notes,
    subtotal: quote.subtotal,
    discount: quote.discount,
    vat_rate: quote.vat_rate,
    vat_amount: quote.vat_amount,
    grand_total: quote.grand_total,
    amount_in_words: amountInWords(quote.grand_total),
    converted_from: quoteId,
    supplier_snapshot: snapshotOf(settings),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  if (items?.length) {
    await supabase.from("document_items").insert(
      items.map((it, i) => ({
        document_id: inv.id,
        sr_no: it.sr_no ?? i + 1,
        description: it.description,
        area: it.area,
        unit: it.unit,
        rate: it.rate,
        amount: it.amount,
        sort_order: it.sort_order ?? i,
      }))
    );
  }

  // mark the source quote as won/converted (pro forma sources keep their own status)
  if (quote.type === "quote") {
    await supabase.from("documents").update({ status: "won" }).eq("id", quoteId);
  }

  redirect(`/quotes/${inv.id}?flash=converted`);
}

/** Get (or create) a public share token for a document. RLS scopes which
 *  documents the current user may share. */
export async function getShareToken(docId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: doc, error } = await supabase.from("documents").select("id, share_token").eq("id", docId).maybeSingle();
  if (error && /share_token/i.test(error.message)) {
    throw new Error("Sharing isn't set up yet — run the share_token migration in Supabase (see supabase/schema.sql).");
  }
  if (!doc) throw new Error("Document not found");
  if (doc.share_token) return doc.share_token as string;

  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  const { error: upErr } = await supabase.from("documents").update({ share_token: token }).eq("id", docId);
  if (upErr) throw new Error(upErr.message);
  revalidatePath(`/quotes/${docId}`);
  return token;
}

/** Revoke a public share link. */
export async function disableShare(docId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("documents").update({ share_token: null }).eq("id", docId);
  if (error) throw new Error(error.message);
  revalidatePath(`/quotes/${docId}`);
}

/** Change a document's status (validated against the doc type). */
export async function updateStatus(docId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: doc } = await supabase.from("documents").select("type").eq("id", docId).maybeSingle();
  if (!doc) throw new Error("Document not found");
  if (!statusesFor(doc.type).includes(status)) throw new Error("Invalid status");

  const { error } = await supabase
    .from("documents")
    .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", docId);
  if (error) throw new Error(error.message);
  revalidatePath(`/quotes/${docId}`);
  revalidatePath("/quotes");
}

/** Copy a quote/invoice into a new draft (fresh number) and open it for editing. */
export async function duplicateDocument(docId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: src, error: sErr } = await supabase.from("documents").select("*").eq("id", docId).single();
  if (sErr || !src) throw new Error("Document not found");
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", docId).order("sort_order");

  const type: DocType = src.type === "invoice" ? "invoice" : src.type === "proforma" ? "proforma" : "quote";
  const { data: settings } = await supabase.from("company_settings").select(`quote_prefix, invoice_prefix, proforma_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = await nextNumber(supabase, type, numberPrefix(type, settings));

  const { data: copy, error } = await insertDoc(supabase, {
    type,
    number,
    doc_date: new Date().toISOString().slice(0, 10),
    client_id: src.client_id,
    client_name: src.client_name,
    client_trn: src.client_trn,
    client_address: src.client_address,
    client_email: src.client_email,
    contact_person: src.contact_person,
    contact_phone: src.contact_phone,
    reference: src.reference,
    status: "draft",
    payment_terms: src.payment_terms,
    validity_days: src.validity_days,
    subtotal: src.subtotal,
    discount: src.discount,
    vat_rate: src.vat_rate,
    vat_amount: src.vat_amount,
    grand_total: src.grand_total,
    advance_amount: type === "proforma" ? src.advance_amount ?? 0 : 0,
    amount_in_words: type === "quote" ? null : amountInWords(src.grand_total),
    notes: src.notes,
    supplier_snapshot: snapshotOf(settings),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  if (items?.length) {
    await supabase.from("document_items").insert(
      items.map((it, i) => ({
        document_id: copy.id,
        sr_no: it.sr_no ?? i + 1,
        description: it.description,
        area: it.area,
        unit: it.unit,
        rate: it.rate,
        amount: it.amount,
        sort_order: it.sort_order ?? i,
      }))
    );
  }

  redirect(`/quotes/${copy.id}/edit?flash=duplicated`);
}

/** Create a fresh blank Tax Invoice (not tied to a quote) and open it for editing. */
export async function newInvoice() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const me = await getProfile();
  if (me && !canSeeInvoices(me.role)) throw new Error("Not authorized to create invoices");

  const { data: settings } = await supabase.from("company_settings").select(`invoice_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const prefix = settings?.invoice_prefix ?? "INV-";
  const { data: nums } = await supabase.from("documents").select("number").eq("type", "invoice");
  let max = 0;
  for (const n of nums ?? []) {
    const m = String(n.number).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const number = prefix + String(max + 1).padStart(4, "0");

  const { data: inv, error } = await insertDoc(supabase, { type: "invoice", number, doc_date: new Date().toISOString().slice(0, 10), status: "draft", vat_rate: 5, supplier_snapshot: snapshotOf(settings), created_by: user.id });
  if (error) throw new Error(error.message);
  redirect(`/quotes/${inv.id}/edit`);
}

/** Create a fresh blank Pro Forma and open it for editing. */
export async function newProforma() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const me = await getProfile();
  if (me && !canSeeInvoices(me.role)) throw new Error("Not authorized to create pro formas");

  const { data: settings } = await supabase.from("company_settings").select(`proforma_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = await nextNumber(supabase, "proforma", numberPrefix("proforma", settings));

  const { data: pf, error } = await insertDoc(supabase, { type: "proforma", number, doc_date: new Date().toISOString().slice(0, 10), status: "draft", vat_rate: 5, supplier_snapshot: snapshotOf(settings), created_by: user.id });
  if (error) throw new Error(error.message);
  redirect(`/quotes/${pf.id}/edit`);
}

/** Generate a Pro Forma from an existing quote/invoice (copies client + items;
 *  defaults the advance to 50% of the grand total — editable afterwards). */
export async function convertToProforma(sourceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const me = await getProfile();
  if (me && !canSeeInvoices(me.role)) throw new Error("Not authorized to create pro formas");

  const { data: src, error: sErr } = await supabase.from("documents").select("*").eq("id", sourceId).single();
  if (sErr || !src) throw new Error("Document not found");
  const { data: items } = await supabase.from("document_items").select("*").eq("document_id", sourceId).order("sort_order");

  const { data: settings } = await supabase.from("company_settings").select(`proforma_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = await nextNumber(supabase, "proforma", numberPrefix("proforma", settings));
  const advance = +(((src.grand_total ?? 0) as number) * 0.5).toFixed(2);

  const { data: pf, error } = await insertDoc(supabase, {
    type: "proforma",
    number,
    doc_date: new Date().toISOString().slice(0, 10),
    client_id: src.client_id,
    client_name: src.client_name,
    client_trn: src.client_trn,
    client_address: src.client_address,
    client_email: src.client_email,
    contact_person: src.contact_person,
    contact_phone: src.contact_phone,
    reference: src.reference,
    status: "draft",
    payment_terms: src.payment_terms,
    subtotal: src.subtotal,
    discount: src.discount,
    vat_rate: src.vat_rate,
    vat_amount: src.vat_amount,
    grand_total: src.grand_total,
    advance_amount: advance,
    amount_in_words: amountInWords(src.grand_total),
    notes: src.notes,
    converted_from: sourceId,
    supplier_snapshot: snapshotOf(settings),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  if (items?.length) {
    await supabase.from("document_items").insert(
      items.map((it, i) => ({
        document_id: pf.id,
        sr_no: it.sr_no ?? i + 1,
        description: it.description,
        area: it.area,
        unit: it.unit,
        rate: it.rate,
        amount: it.amount,
        sort_order: it.sort_order ?? i,
      }))
    );
  }

  redirect(`/quotes/${pf.id}/edit?flash=proforma`);
}

/** Permanently delete a document and its line items. */
export async function deleteDocument(docId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // remember the type so we can return to the right tab after deleting
  const { data: doc } = await supabase.from("documents").select("type").eq("id", docId).maybeSingle();
  const type = doc?.type ?? "quote";

  await supabase.from("document_items").delete().eq("document_id", docId);
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
  revalidatePath("/quotes");
  redirect(`/quotes?type=${type}&flash=deleted`);
}
