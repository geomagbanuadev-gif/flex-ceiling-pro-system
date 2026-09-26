"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { expensePaymentError, roundMoney, sumMoney } from "@/utils/finance";
import { calculateExpenseTotals, type ExpenseItemInput } from "@/utils/expense";

export type ExpensePayload = {
  id?: string;
  expenseDate: string;
  dueDate: string;
  categoryId: string;
  description: string;
  payeeName: string;
  supplierId: string | null;
  clientId: string | null;
  projectId: string | null;
  purchaseOrderId: string | null;
  supplierInvoiceNumber: string;
  status: "draft" | "posted" | "void";
  subtotal: number;
  vatAmount: number;
  vatRecoverable: boolean;
  reference: string;
  notes: string;
  items: ExpenseItemInput[];
};

async function requireFinance() {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) throw new Error("Not authorized for finance");
  return { profile, supabase: await createClient() };
}

export async function saveExpense(payload: ExpensePayload) {
  const { profile, supabase } = await requireFinance();
  if (!payload.expenseDate) throw new Error("Expense date is required");
  if (!payload.categoryId) throw new Error("Expense category is required");
  if (!payload.description.trim()) throw new Error("Description is required");
  if (![payload.subtotal, payload.vatAmount].every(Number.isFinite) || payload.subtotal < 0 || payload.vatAmount < 0) throw new Error("Amounts must be valid non-negative numbers");
  const itemTotals = calculateExpenseTotals(payload.items);
  for (const item of itemTotals.items) {
    if (!item.description.trim()) throw new Error("Every expense item needs a description");
    if (![item.quantity, item.unitPrice, item.discount, item.vatRate].every(Number.isFinite)) throw new Error("Item amounts must be valid numbers");
    if (item.quantity <= 0) throw new Error("Item quantity must be greater than zero");
    if (item.unitPrice < 0 || item.discount < 0 || item.vatRate < 0) throw new Error("Item amounts cannot be negative");
    if (item.netAmount < 0) throw new Error("An item discount cannot exceed its quantity × unit price");
  }
  if (payload.projectId) {
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", payload.projectId).maybeSingle();
    if (!project || project.client_id !== payload.clientId) throw new Error("The selected project must belong to the selected client");
  }
  if (payload.purchaseOrderId) {
    const { data: purchaseOrder } = await supabase.from("purchase_orders").select("supplier_id, project_id").eq("id", payload.purchaseOrderId).maybeSingle();
    if (!purchaseOrder) throw new Error("Purchase order not found");
    if (purchaseOrder.supplier_id && purchaseOrder.supplier_id !== payload.supplierId) throw new Error("The selected purchase order belongs to a different supplier");
    if (purchaseOrder.project_id && purchaseOrder.project_id !== payload.projectId) throw new Error("The selected purchase order belongs to a different project");
  }
  const hasItems = itemTotals.items.length > 0;
  const subtotal = hasItems ? itemTotals.subtotal : roundMoney(payload.subtotal);
  const vatAmount = hasItems ? itemTotals.vatAmount : roundMoney(payload.vatAmount);
  const fields = {
    expense_date: payload.expenseDate,
    due_date: payload.dueDate || null,
    category_id: payload.categoryId,
    description: payload.description.trim(),
    payee_name: payload.payeeName.trim() || null,
    supplier_id: payload.supplierId || null,
    client_id: payload.clientId || null,
    project_id: payload.projectId || null,
    purchase_order_id: payload.purchaseOrderId || null,
    supplier_invoice_number: payload.supplierInvoiceNumber.trim() || null,
    status: payload.status,
    subtotal,
    vat_amount: vatAmount,
    vat_recoverable: payload.vatRecoverable,
    grand_total: roundMoney(subtotal + vatAmount),
    reference: payload.reference.trim() || null,
    notes: payload.notes.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  };
  const items = itemTotals.items.map((item, index) => ({
    sort_order: index,
    product_code: item.productCode.trim() || null,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim() || "pcs",
    unit_price: roundMoney(item.unitPrice),
    discount: roundMoney(item.discount),
    vat_rate: item.vatRate,
    net_amount: item.netAmount,
    vat_amount: item.vatAmount,
    total_amount: item.totalAmount,
    serial_number: item.serialNumber.trim() || null,
  }));
  const { data: id, error } = await supabase.rpc("save_expense_with_items", {
    p_expense_id: payload.id ?? null,
    p_fields: { ...fields, created_by: profile.id },
    p_items: items,
  });
  if (error) throw new Error(error.message);
  redirect(`/expenses/${id}?flash=expense-saved`);
}

const EXPENSE_ATTACHMENT_BUCKET = "expense-attachments";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function saveExpenseAttachment(expenseId: string, attachment: { path: string; name: string; type: string; size: number }) {
  const { profile, supabase } = await requireFinance();
  if (!attachment.name.trim() || attachment.size <= 0) throw new Error("Choose a PDF, JPG, or PNG file");
  if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) throw new Error("Only PDF, JPG, and PNG files are supported");
  if (attachment.size > MAX_ATTACHMENT_SIZE) throw new Error("Attachment must be 10 MB or smaller");
  if (!attachment.path.startsWith(`${expenseId}/`) || attachment.path.includes("..")) throw new Error("Invalid attachment path");

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("attachment_path, status")
    .eq("id", expenseId)
    .maybeSingle();
  if (expenseError || !expense) throw new Error(expenseError?.message ?? "Expense not found");
  if (expense.status === "void") throw new Error("A void expense cannot receive a new attachment");

  const { error: updateError } = await supabase.from("expenses").update({
    attachment_path: attachment.path,
    attachment_name: attachment.name,
    attachment_type: attachment.type,
    attachment_size: attachment.size,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  }).eq("id", expenseId);
  if (updateError) throw new Error(updateError.message);
  if (expense.attachment_path) await supabase.storage.from(EXPENSE_ATTACHMENT_BUCKET).remove([expense.attachment_path]);
  revalidatePath(`/expenses/${expenseId}`);
}

export async function removeExpenseAttachment(expenseId: string) {
  const { profile, supabase } = await requireFinance();
  const { data: expense, error: expenseError } = await supabase.from("expenses").select("attachment_path, status").eq("id", expenseId).maybeSingle();
  if (expenseError || !expense) throw new Error(expenseError?.message ?? "Expense not found");
  if (expense.status === "void") throw new Error("A void expense attachment cannot be removed");
  if (!expense.attachment_path) return;

  const { error } = await supabase.from("expenses").update({
    attachment_path: null,
    attachment_name: null,
    attachment_type: null,
    attachment_size: null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  }).eq("id", expenseId);
  if (error) throw new Error(error.message);
  await supabase.storage.from(EXPENSE_ATTACHMENT_BUCKET).remove([expense.attachment_path]);
  revalidatePath(`/expenses/${expenseId}`);
}

export async function addExpensePayment(expenseId: string, payment: { date: string; method: string; reference: string; amount: number; notes: string }) {
  const { profile, supabase } = await requireFinance();
  if (!payment.date) throw new Error("Payment date is required");
  const amount = roundMoney(payment.amount);
  const [{ data: expense, error: expenseError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("expenses").select("status, grand_total, purchase_order_id").eq("id", expenseId).maybeSingle(),
    supabase.from("expense_payments").select("amount").eq("expense_id", expenseId),
  ]);
  if (expenseError || !expense) throw new Error(expenseError?.message ?? "Expense not found");
  if (paymentsError) throw new Error(paymentsError.message);
  if (expense.purchase_order_id) throw new Error("Record this payment on the linked purchase order to avoid double-counting");
  const validationError = expensePaymentError(expense.status, Number(expense.grand_total), sumMoney((payments ?? []).map((row) => row.amount)), amount);
  if (validationError) throw new Error(validationError);
  const { error } = await supabase.from("expense_payments").insert({ expense_id: expenseId, payment_date: payment.date, method: payment.method || null, reference: payment.reference || null, amount, notes: payment.notes || null, created_by: profile.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/expenses");
  revalidatePath("/finance");
}

export async function deleteExpensePayment(paymentId: string, expenseId: string) {
  const { supabase } = await requireFinance();
  const { error } = await supabase.from("expense_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteExpense(id: string) {
  const { supabase } = await requireFinance();
  const { data: expense } = await supabase.from("expenses").select("status, attachment_path").eq("id", id).maybeSingle();
  if (!expense || expense.status !== "draft") throw new Error("Only draft expenses can be deleted; void a posted expense instead");
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (expense.attachment_path) await supabase.storage.from(EXPENSE_ATTACHMENT_BUCKET).remove([expense.attachment_path]);
  redirect("/expenses?flash=deleted");
}
