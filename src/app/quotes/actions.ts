"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { amountInWords } from "@/utils/amountInWords";
import { nextDocNumber } from "@/utils/docNumber";
import { statusesFor, allowedStatusTransitions, quoteStatusAfterInvoiceConversion, prefixFor, wordsForType, advanceForType, defaultAdvance, invoiceAmountsForSource, dependentDocumentDeleteError, regenerationBlockedMessage, canModifyDocument, type DocType } from "@/utils/docRules";
import { getProfile, canSeeInvoices, canSeeReceipts } from "@/utils/profile";

/** Next sequential document number for a type, e.g. "PF-0007". */
async function nextNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: DocType,
  prefix: string
) {
  const { data: nums } = await supabase.from("documents").select("number").eq("type", type);
  return nextDocNumber((nums ?? []).map((n) => n.number), prefix);
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

const OPTIONAL_DOCUMENT_COLUMNS = ["supplier_snapshot", "advance_amount", "payment_method"];

// Older production databases may not have every optional document column yet.
async function insertDoc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>
) {
  const fields = { ...row };
  let res = await supabase.from("documents").insert(fields).select("id").single();
  for (const col of OPTIONAL_DOCUMENT_COLUMNS) {
    if (res.error && new RegExp(col, "i").test(res.error.message || "") && col in fields) {
      delete fields[col];
      res = await supabase.from("documents").insert(fields).select("id").single();
    }
  }
  return res;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function findGeneratedDocument(supabase: SupabaseClient, type: DocType, sourceId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, number, status, payment_method, advance_amount")
    .eq("type", type)
    .eq("converted_from", sourceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not check generated documents: ${error.message}`);
  return data;
}

async function saveGeneratedDocument(supabase: SupabaseClient, document: Record<string, unknown>, items: Record<string, unknown>[]) {
  const { data, error } = await supabase.rpc("save_generated_document", { p_document: document, p_items: items });
  if (error) {
    if (/save_generated_document|schema cache/i.test(error.message)) {
      throw new Error("Document safety update is not installed. Run supabase/production-safety.sql before generating documents.");
    }
    throw new Error(error.message);
  }
  if (!data) throw new Error("Generated document was not saved");
  return data as string;
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
  paymentMethod?: string;
  projectId?: string | null;
  dueDate?: string;
  appliesToInvoiceId?: string | null;
  items: QuoteItemInput[];
};

export type SaveDocumentResult = { ok: false; error: string };
export type DeleteDocumentResult = { ok: true; redirectTo: string } | { ok: false; error: string };

export async function saveQuote(p: QuotePayload): Promise<SaveDocumentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const type = p.type ?? "quote";
  const number = p.number.trim();
  if (!number) return { ok: false, error: "Document number is required." };
  let duplicateNumberQuery = supabase.from("documents").select("id").eq("type", type).eq("number", number);
  if (p.id) duplicateNumberQuery = duplicateNumberQuery.neq("id", p.id);
  const { data: duplicateNumber, error: duplicateNumberError } = await duplicateNumberQuery.limit(1).maybeSingle();
  if (duplicateNumberError) return { ok: false, error: "Could not verify the document number. Please try again." };
  if (duplicateNumber) return { ok: false, error: `${number} already exists. Document numbers must be unique.` };

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

  if (p.projectId) {
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", p.projectId).maybeSingle();
    if (!project || project.client_id !== clientId) throw new Error("The selected project must belong to the document client");
  }
  if (type === "receipt" && p.appliesToInvoiceId) {
    const { data: invoice } = await supabase.from("documents").select("client_id, project_id").eq("id", p.appliesToInvoiceId).eq("type", "invoice").maybeSingle();
    if (!invoice || invoice.client_id !== clientId) throw new Error("The selected invoice must belong to the receipt client");
    if (p.projectId && invoice.project_id !== p.projectId) throw new Error("The receipt project must match the invoice project");
  }
  const docFields = {
    type,
    number,
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
    advance_amount: advanceForType(type, p.advanceAmount),
    payment_method: type === "receipt" ? p.paymentMethod || "cash" : null,
    project_id: p.projectId || null,
    due_date: type === "invoice" ? p.dueDate || null : null,
    applies_to_invoice_id: type === "receipt" ? p.appliesToInvoiceId || null : null,
    amount_in_words: wordsForType(type, p.grandTotal),
    notes: p.notes || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let docId = p.id;
  if (docId) {
    const { data: current, error: currentError } = await supabase.from("documents").select("type, status, number").eq("id", docId).maybeSingle();
    if (currentError || !current) throw new Error(currentError?.message ?? "Document not found");
    if (current.type !== type) return { ok: false, error: "A document type cannot be changed after creation." };
    if (!canModifyDocument(current.type, current.status)) return { ok: false, error: current.type === "invoice" ? "Change the tax invoice status back to Draft before editing it." : "Only draft billing documents can be edited." };
    if (current.type !== "quote" && current.number !== number) return { ok: false, error: "Billing document numbers are assigned automatically and cannot be changed." };
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

  const existing = await findGeneratedDocument(supabase, "invoice", quoteId);
  const regenerationError = existing && regenerationBlockedMessage("invoice", existing.status);
  if (regenerationError) throw new Error(regenerationError);

  const { data: quote, error: qErr } = await supabase.from("documents").select("*").eq("id", quoteId).single();
  if (qErr || !quote) throw new Error("Quote not found");
  const { data: items, error: itemsError } = await supabase.from("document_items").select("*").eq("document_id", quoteId).order("sort_order");
  if (itemsError) throw new Error(`Could not load source line items: ${itemsError.message}`);
  const amounts = invoiceAmountsForSource(quote);
  if (amounts.grandTotal <= 0) throw new Error("Set an advance amount before generating the tax invoice");

  // next invoice number from the invoice prefix sequence
  const { data: settings } = await supabase.from("company_settings").select(`invoice_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = existing?.number ?? await nextNumber(supabase, "invoice", settings?.invoice_prefix ?? "INV-");

  const invoiceFields = {
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
    notes: quote.notes,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    vat_rate: amounts.vatRate,
    vat_amount: amounts.vatAmount,
    grand_total: amounts.grandTotal,
    amount_in_words: amountInWords(amounts.grandTotal),
    converted_from: quoteId,
    project_id: quote.project_id,
    supplier_snapshot: snapshotOf(settings),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const invoiceItems = amounts.partial ? [{
    sr_no: 1,
    description: `Advance payment against Pro Forma ${quote.number}`,
    area: 1,
    unit: "Lot",
    rate: amounts.subtotal,
    amount: amounts.subtotal,
    sort_order: 0,
  }] : (items ?? []).map((it, i) => ({
    sr_no: it.sr_no ?? i + 1,
    description: it.description,
    area: it.area,
    unit: it.unit,
    rate: it.rate,
    amount: it.amount,
    sort_order: it.sort_order ?? i,
  }));
  const invoiceId = await saveGeneratedDocument(supabase, { ...invoiceFields, status: "draft", created_by: user.id }, invoiceItems);

  // An ongoing quote stays ongoing; other quote statuses become won on conversion.
  if (quote.type === "quote") {
    await supabase.from("documents").update({ status: quoteStatusAfterInvoiceConversion(quote.status) }).eq("id", quoteId);
  }

  redirect(`/quotes/${invoiceId}?flash=${existing ? "regenerated" : "converted"}`);
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

  const { data: doc } = await supabase.from("documents").select("type, status").eq("id", docId).maybeSingle();
  if (!doc) throw new Error("Document not found");
  if (!statusesFor(doc.type).includes(status)) throw new Error("Invalid status");
  if (!allowedStatusTransitions(doc.type, doc.status).includes(status)) throw new Error("This status change is not allowed");

  const { error } = await supabase
    .from("documents")
    .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", docId);
  if (error) throw new Error(error.message);
  revalidatePath(`/quotes/${docId}`);
  revalidatePath("/quotes");
  revalidatePath("/");
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

  const type: DocType = src.type === "invoice" ? "invoice" : src.type === "proforma" ? "proforma" : src.type === "receipt" ? "receipt" : "quote";
  const { data: settings } = await supabase.from("company_settings").select(`quote_prefix, invoice_prefix, proforma_prefix, receipt_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = await nextNumber(supabase, type, prefixFor(type, settings));

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
    payment_terms: src.payment_terms,
    validity_days: src.validity_days,
    subtotal: src.subtotal,
    discount: src.discount,
    vat_rate: src.vat_rate,
    vat_amount: src.vat_amount,
    grand_total: src.grand_total,
    advance_amount: advanceForType(type, src.advance_amount),
    payment_method: type === "receipt" ? src.payment_method : null,
    project_id: src.project_id,
    amount_in_words: wordsForType(type, src.grand_total),
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
  const number = await nextNumber(supabase, "invoice", settings?.invoice_prefix ?? "INV-");

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
  const number = await nextNumber(supabase, "proforma", prefixFor("proforma", settings));

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
  const { data: items, error: itemsError } = await supabase.from("document_items").select("*").eq("document_id", sourceId).order("sort_order");
  if (itemsError) throw new Error(`Could not load source line items: ${itemsError.message}`);
  const existing = await findGeneratedDocument(supabase, "proforma", sourceId);
  const regenerationError = existing && regenerationBlockedMessage("proforma", existing.status);
  if (regenerationError) throw new Error(regenerationError);

  const { data: settings } = await supabase.from("company_settings").select(`proforma_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = existing?.number ?? await nextNumber(supabase, "proforma", prefixFor("proforma", settings));
  const advance = existing?.advance_amount ?? defaultAdvance(src.grand_total);

  const proformaFields = {
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
    project_id: src.project_id,
    supplier_snapshot: snapshotOf(settings),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const proformaItems = (items ?? []).map((it, i) => ({
    sr_no: it.sr_no ?? i + 1,
    description: it.description,
    area: it.area,
    unit: it.unit,
    rate: it.rate,
    amount: it.amount,
    sort_order: it.sort_order ?? i,
  }));
  const proformaId = await saveGeneratedDocument(supabase, { ...proformaFields, status: "draft", created_by: user.id }, proformaItems);

  redirect(`/quotes/${proformaId}/edit?flash=${existing ? "regenerated" : "proforma"}`);
}

/** Create a fresh blank payment Receipt and open it for editing. */
export async function newReceipt() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const me = await getProfile();
  if (me && !canSeeReceipts(me.role)) throw new Error("Not authorized to create receipts");

  const { data: settings } = await supabase.from("company_settings").select(`receipt_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = await nextNumber(supabase, "receipt", prefixFor("receipt", settings));

  const { data: rc, error } = await insertDoc(supabase, { type: "receipt", number, doc_date: new Date().toISOString().slice(0, 10), status: "draft", vat_rate: 0, payment_method: "cash", supplier_snapshot: snapshotOf(settings), created_by: user.id });
  if (error) throw new Error(error.message);
  redirect(`/quotes/${rc.id}/edit`);
}

/** Generate a payment Receipt from a tax invoice or pro forma (acknowledges the
 *  amount paid; for a pro forma, defaults to its advance). Editable afterwards. */
export async function convertToReceipt(sourceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const me = await getProfile();
  if (me && !canSeeReceipts(me.role)) throw new Error("Not authorized to create receipts");

  const existing = await findGeneratedDocument(supabase, "receipt", sourceId);
  const regenerationError = existing && regenerationBlockedMessage("receipt", existing.status);
  if (regenerationError) throw new Error(regenerationError);
  const { data: src, error: sErr } = await supabase.from("documents").select("*").eq("id", sourceId).single();
  if (sErr || !src) throw new Error("Document not found");

  const { data: settings } = await supabase.from("company_settings").select(`receipt_prefix, ${SUPPLIER_COLS}`).eq("id", 1).maybeSingle();
  const number = existing?.number ?? await nextNumber(supabase, "receipt", prefixFor("receipt", settings));

  const isPf = src.type === "proforma";
  const amount = +(((isPf ? src.advance_amount : src.grand_total) ?? 0) as number).toFixed(2);
  const description = isPf ? "Advance Payment" : `Payment for ${src.number}`;
  const { data: generatedInvoice, error: invoiceError } = isPf
    ? await supabase.from("documents").select("id").eq("type", "invoice").eq("converted_from", sourceId).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  if (invoiceError) throw new Error(`Could not check the linked tax invoice: ${invoiceError.message}`);

  const receiptFields = {
    type: "receipt",
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
    payment_method: existing?.payment_method ?? "cash",
    subtotal: amount,
    discount: 0,
    vat_rate: 0,
    vat_amount: 0,
    grand_total: amount,
    amount_in_words: amountInWords(amount),
    converted_from: sourceId,
    project_id: src.project_id,
    applies_to_invoice_id: src.type === "invoice" ? src.id : generatedInvoice?.id ?? null,
    supplier_snapshot: snapshotOf(settings),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const receiptId = await saveGeneratedDocument(supabase, { ...receiptFields, status: "draft", created_by: user.id }, [{ sr_no: 1, description, amount, sort_order: 0 }]);

  redirect(`/quotes/${receiptId}/edit?flash=${existing ? "regenerated" : "receipt"}`);
}

/** Permanently delete a document and its line items. */
export async function deleteDocument(docId: string): Promise<DeleteDocumentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in and try again." };

  // Preserve generated-document links: a child must be removed before its source.
  const [docResult, generatedResult, appliedResult] = await Promise.all([
    supabase.from("documents").select("id, type, status").eq("id", docId).maybeSingle(),
    supabase.from("documents").select("id, type, number").eq("converted_from", docId),
    supabase.from("documents").select("id, type, number").eq("applies_to_invoice_id", docId),
  ]);
  const dependencyError = docResult.error || generatedResult.error || appliedResult.error;
  if (dependencyError) {
    console.error("Could not check linked documents before deletion", dependencyError);
    return { ok: false, error: "Could not check whether this document is safe to delete. Please try again." };
  }
  const doc = docResult.data;
  if (!doc) return { ok: false, error: "This document no longer exists." };
  if (!canModifyDocument(doc.type, doc.status)) {
    return { ok: false, error: doc.type === "invoice" ? "Change the tax invoice status back to Draft before deleting it." : "Only draft billing documents can be deleted." };
  }
  const generated = generatedResult.data;
  const applied = appliedResult.data;
  const type = doc?.type ?? "quote";
  const dependents = [...(generated ?? []), ...(applied ?? [])].filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index);
  const blocker = dependentDocumentDeleteError(dependents);
  if (blocker) return { ok: false, error: blocker };

  // Line items cascade only after the document delete succeeds.
  const { data: deleted, error } = await supabase.from("documents").delete().eq("id", docId).select("id").maybeSingle();
  if (error) {
    console.error("Could not delete document", { docId, error });
    return { ok: false, error: "Could not delete this draft. Please refresh and try again." };
  }
  if (!deleted) return { ok: false, error: "This draft could not be deleted. Check your access and try again." };
  revalidatePath("/quotes");
  return { ok: true, redirectTo: `/quotes?type=${type}&flash=deleted` };
}
