"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { expensePaymentError, roundMoney, sumMoney } from "@/utils/finance";

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
  status: "draft" | "posted" | "void";
  subtotal: number;
  vatAmount: number;
  vatRecoverable: boolean;
  reference: string;
  notes: string;
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
  if (payload.subtotal < 0 || payload.vatAmount < 0) throw new Error("Amounts cannot be negative");
  if (payload.projectId) {
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", payload.projectId).maybeSingle();
    if (!project || project.client_id !== payload.clientId) throw new Error("The selected project must belong to the selected client");
  }
  const fields = {
    expense_date: payload.expenseDate,
    due_date: payload.dueDate || null,
    category_id: payload.categoryId,
    description: payload.description.trim(),
    payee_name: payload.payeeName.trim() || null,
    supplier_id: payload.supplierId || null,
    client_id: payload.clientId || null,
    project_id: payload.projectId || null,
    status: payload.status,
    subtotal: roundMoney(payload.subtotal),
    vat_amount: roundMoney(payload.vatAmount),
    vat_recoverable: payload.vatRecoverable,
    grand_total: roundMoney(payload.subtotal + payload.vatAmount),
    reference: payload.reference.trim() || null,
    notes: payload.notes.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  };
  let id = payload.id;
  if (id) {
    const { error } = await supabase.from("expenses").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("expenses").insert({ ...fields, created_by: profile.id }).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  redirect(`/expenses/${id}?flash=expense-saved`);
}

export async function addExpensePayment(expenseId: string, payment: { date: string; method: string; reference: string; amount: number; notes: string }) {
  const { profile, supabase } = await requireFinance();
  if (!payment.date) throw new Error("Payment date is required");
  const amount = roundMoney(payment.amount);
  const [{ data: expense, error: expenseError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("expenses").select("status, grand_total").eq("id", expenseId).maybeSingle(),
    supabase.from("expense_payments").select("amount").eq("expense_id", expenseId),
  ]);
  if (expenseError || !expense) throw new Error(expenseError?.message ?? "Expense not found");
  if (paymentsError) throw new Error(paymentsError.message);
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
  const { data: expense } = await supabase.from("expenses").select("status").eq("id", id).maybeSingle();
  if (!expense || expense.status !== "draft") throw new Error("Only draft expenses can be deleted; void a posted expense instead");
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/expenses?flash=deleted");
}
