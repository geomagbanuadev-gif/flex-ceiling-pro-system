"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { amountInWords } from "@/utils/amountInWords";

export type QuoteItemInput = {
  description: string;
  area: number | null;
  unit: string;
  rate: number | null;
  amount: number | null;
};

export type QuotePayload = {
  id?: string;
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
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
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

  const docFields = {
    type: "quote" as const,
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
    status: "draft",
    payment_terms: p.paymentTerms || null,
    validity_days: p.validityDays || null,
    subtotal: p.subtotal,
    vat_rate: p.vatRate,
    vat_amount: p.vatAmount,
    grand_total: p.grandTotal,
    notes: p.notes || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let docId = p.id;
  if (docId) {
    await supabase.from("documents").update(docFields).eq("id", docId);
    await supabase.from("document_items").delete().eq("document_id", docId);
  } else {
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({ ...docFields, created_by: user.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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
  if (items.length) await supabase.from("document_items").insert(items);

  redirect(`/quotes/${docId}`);
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
  const { data: settings } = await supabase.from("company_settings").select("invoice_prefix").eq("id", 1).maybeSingle();
  const prefix = settings?.invoice_prefix ?? "INV-";
  const { data: nums } = await supabase.from("documents").select("number").eq("type", "invoice");
  let max = 0;
  for (const n of nums ?? []) {
    const m = String(n.number).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const number = prefix + String(max + 1).padStart(4, "0");

  const { data: inv, error } = await supabase
    .from("documents")
    .insert({
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
      subtotal: quote.subtotal,
      vat_rate: quote.vat_rate,
      vat_amount: quote.vat_amount,
      grand_total: quote.grand_total,
      amount_in_words: amountInWords(quote.grand_total),
      converted_from: quoteId,
      created_by: user.id,
    })
    .select("id")
    .single();
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

  // mark the quote as won/converted
  await supabase.from("documents").update({ status: "won" }).eq("id", quoteId);

  redirect(`/quotes/${inv.id}`);
}
