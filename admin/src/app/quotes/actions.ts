"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
