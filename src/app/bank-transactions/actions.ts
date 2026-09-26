"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BANK_CLASSIFICATIONS, parseBankTarget } from "@/utils/bank";
import { canSeeFinance, getProfile } from "@/utils/profile";
import { uuidQueryParam } from "@/utils/query";
import { createClient } from "@/utils/supabase/server";

async function requireFinance() {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) throw new Error("Not authorized for finance");
  return createClient();
}

export async function reviewBankTransaction(transactionId: string, formData: FormData) {
  if (!uuidQueryParam(transactionId)) throw new Error("Invalid bank transaction");
  const classification = String(formData.get("classification") || "");
  if (classification && !BANK_CLASSIFICATIONS.some(([value]) => value === classification)) throw new Error("Invalid transaction classification");
  const excluded = formData.get("excluded") === "on";
  const reason = String(formData.get("exclusionReason") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  if (excluded && !reason) throw new Error("Enter a reason for excluding this transaction");
  const supabase = await requireFinance();
  const { error } = await supabase.rpc("review_bank_transaction", {
    p_transaction_id: transactionId,
    p_classification: classification || null,
    p_excluded: excluded,
    p_exclusion_reason: reason || null,
    p_notes: notes || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/bank-transactions/${transactionId}`);
  revalidatePath("/bank-transactions");
  redirect(`/bank-transactions/${transactionId}?flash=review-saved`);
}

export async function reconcileBankTransaction(transactionId: string, formData: FormData) {
  if (!uuidQueryParam(transactionId)) throw new Error("Invalid bank transaction");
  const target = parseBankTarget(formData.get("target"));
  if (!target) throw new Error("Choose a valid receipt or payment");
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid allocation amount");
  const method = target.suggested ? "suggested" : "manual";
  const supabase = await requireFinance();
  const { error } = await supabase.rpc("reconcile_bank_transaction", {
    p_transaction_id: transactionId,
    p_target_type: target.type,
    p_target_id: target.id,
    p_amount: Math.round(amount * 100) / 100,
    p_match_method: method,
    p_notes: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/bank-transactions/${transactionId}`);
  revalidatePath("/bank-transactions");
  redirect(`/bank-transactions/${transactionId}?flash=linked`);
}

export async function unreconcileBankTransaction(transactionId: string, allocationId: string) {
  if (!uuidQueryParam(transactionId) || !uuidQueryParam(allocationId)) throw new Error("Invalid reconciliation link");
  const supabase = await requireFinance();
  const { error } = await supabase.rpc("unreconcile_bank_transaction", { p_allocation_id: allocationId });
  if (error) throw new Error(error.message);
  revalidatePath(`/bank-transactions/${transactionId}`);
  revalidatePath("/bank-transactions");
}

export async function rollbackBankStatement(importId: string) {
  if (!uuidQueryParam(importId)) throw new Error("Invalid statement import");
  const profile = await getProfile();
  if (!profile || profile.role !== "super") throw new Error("Only Super can roll back statement imports");
  const supabase = await createClient();
  const { error } = await supabase.rpc("rollback_bank_statement", { p_import_id: importId });
  if (error) throw new Error(error.message);
  redirect("/bank-transactions/imports?flash=rolled-back");
}
