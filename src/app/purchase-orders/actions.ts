"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { amountInWords } from "@/utils/amountInWords";
import { nextDocNumber } from "@/utils/docNumber";
import { getProfile, canSeeProcurement } from "@/utils/profile";

async function requireProcurement() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) throw new Error("Not authorized for procurement");
  return { supabase, user };
}

async function nextPoNumber(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: settings } = await supabase.from("company_settings").select("po_prefix").eq("id", 1).maybeSingle();
  const { data: nums } = await supabase.from("purchase_orders").select("number");
  return nextDocNumber((nums ?? []).map((n) => n.number), settings?.po_prefix ?? "PO-");
}

export type PoItemInput = { description: string; quantity: number | null; unit: string; unitPrice: number | null; amount: number | null };

export type PoPayload = {
  id?: string;
  supplierId: string | null;
  supplierName: string;
  supplierTrn: string;
  supplierAddress: string;
  supplierEmail: string;
  contactPerson: string;
  contactPhone: string;
  number: string;
  poDate: string;
  expectedDate: string;
  reference: string;
  notes: string;
  vatRate: number;
  discount: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  items: PoItemInput[];
};

export async function savePurchaseOrder(p: PoPayload) {
  const { supabase, user } = await requireProcurement();

  // find-or-create supplier by name
  let supplierId = p.supplierId;
  if (!supplierId && p.supplierName.trim()) {
    const { data: existing } = await supabase.from("suppliers").select("id").ilike("name", p.supplierName.trim()).limit(1).maybeSingle();
    if (existing) supplierId = existing.id;
    else {
      const { data: created } = await supabase.from("suppliers").insert({
        name: p.supplierName.trim(), trn: p.supplierTrn || null, address: p.supplierAddress || null,
        email: p.supplierEmail || null, contact_person: p.contactPerson || null, contact_phone: p.contactPhone || null,
        created_by: user.id,
      }).select("id").single();
      supplierId = created?.id ?? null;
    }
  }

  const fields = {
    number: p.number,
    supplier_id: supplierId,
    supplier_name: p.supplierName,
    supplier_trn: p.supplierTrn || null,
    supplier_address: p.supplierAddress || null,
    supplier_email: p.supplierEmail || null,
    contact_person: p.contactPerson || null,
    contact_phone: p.contactPhone || null,
    po_date: p.poDate || null,
    expected_date: p.expectedDate || null,
    reference: p.reference || null,
    subtotal: p.subtotal,
    discount: p.discount || 0,
    vat_rate: p.vatRate,
    vat_amount: p.vatAmount,
    grand_total: p.grandTotal,
    amount_in_words: amountInWords(p.grandTotal),
    notes: p.notes || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let id = p.id;
  if (id) {
    const { error } = await supabase.from("purchase_orders").update(fields).eq("id", id);
    if (error) throw new Error(`Could not save purchase order: ${error.message}`);
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
  } else {
    const { data, error } = await supabase.from("purchase_orders").insert({ ...fields, status: "draft", created_by: user.id }).select("id").single();
    if (error) throw new Error(`Could not create purchase order: ${error.message}`);
    id = data.id;
  }

  const items = p.items
    .filter((it) => it.description.trim() || it.amount)
    .map((it, i) => ({
      purchase_order_id: id, sr_no: i + 1, description: it.description,
      quantity: it.quantity, unit: it.unit || "pcs", unit_price: it.unitPrice, amount: it.amount, sort_order: i,
    }));
  if (items.length) {
    const { error } = await supabase.from("purchase_order_items").insert(items);
    if (error) throw new Error(`Could not save line items: ${error.message}`);
  }

  redirect(`/purchase-orders/${id}?flash=saved`);
}

/** Create a blank PO (optionally pre-set to a supplier) and open it for editing. */
export async function newPurchaseOrder(supplierId?: string) {
  const { supabase, user } = await requireProcurement();
  const number = await nextPoNumber(supabase);

  let snap: Record<string, unknown> = {};
  if (supplierId) {
    const { data: s } = await supabase.from("suppliers").select("*").eq("id", supplierId).maybeSingle();
    if (s) snap = { supplier_id: s.id, supplier_name: s.name, supplier_trn: s.trn, supplier_address: s.address, supplier_email: s.email, contact_person: s.contact_person, contact_phone: s.contact_phone };
  }

  const { data, error } = await supabase.from("purchase_orders").insert({ number, po_date: new Date().toISOString().slice(0, 10), status: "draft", vat_rate: 5, created_by: user.id, ...snap }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/purchase-orders/${data.id}/edit`);
}

export async function updatePoStatus(id: string, status: string) {
  const { supabase, user } = await requireProcurement();
  const allowed = ["draft", "ordered", "partial", "received", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  const { error } = await supabase.from("purchase_orders").update({ status, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/purchase-orders");
}

export async function deletePurchaseOrder(id: string) {
  const { supabase } = await requireProcurement();
  await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
  await supabase.from("purchase_payments").delete().eq("purchase_order_id", id);
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/purchase-orders?flash=deleted");
}

/** Record a payment to the supplier against a PO. */
export async function addPurchasePayment(poId: string, payment: { date: string; method: string; reference: string; amount: number; notes: string }) {
  const { supabase, user } = await requireProcurement();
  if (!(Number(payment.amount) > 0)) throw new Error("Enter a payment amount");
  const { error } = await supabase.from("purchase_payments").insert({
    purchase_order_id: poId, payment_date: payment.date || null, method: payment.method || "cash",
    reference: payment.reference || null, amount: Number(payment.amount), notes: payment.notes || null, created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/purchase-orders/${poId}`);
}

export async function deletePurchasePayment(paymentId: string, poId: string) {
  const { supabase } = await requireProcurement();
  const { error } = await supabase.from("purchase_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/purchase-orders/${poId}`);
}
