import "server-only";

import { createClient } from "@/utils/supabase/server";
import { bankPartyMatches, remainingBankAmount, type BankTargetType } from "@/utils/bank";
import { postgrestSearchTerm } from "@/utils/query";

export type BankTarget = {
  value: string;
  label: string;
  amount: number;
  date: string | null;
  suggested: boolean;
  reason: string;
};

type Candidate = {
  type: BankTargetType;
  id: string;
  label: string;
  amount: number;
  date: string | null;
  party: string | null;
};

const migrationError = (message: string) => new Error(`Bank transactions require supabase/bank-transactions.sql: ${message}`);
const related = <T>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;
const dateDistance = (a: string, b: string | null) => b ? Math.abs((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000) : 999;

export async function loadBankTransaction(id: string, rawTargetSearch = "") {
  const supabase = await createClient();
  const { data: transaction, error } = await supabase.from("bank_transactions").select("*, bank_accounts(bank_name, account_name, account_last4, currency), bank_statement_imports(id, source_filename, period_from, period_to)").eq("id", id).maybeSingle();
  if (error) throw migrationError(error.message);
  if (!transaction) return null;

  const [{ data: allocations, error: allocationError }, { data: events }] = await Promise.all([
    supabase.from("bank_transaction_allocations").select("id, amount, match_method, notes, receipt_id, purchase_payment_id, expense_payment_id, documents(number, doc_date, client_name, grand_total, applies_to_invoice_id), purchase_payments(payment_date, amount, purchase_orders(id, number, supplier_name)), expense_payments(payment_date, amount, expenses(id, description, payee_name))").eq("bank_transaction_id", id).order("created_at"),
    supabase.from("bank_reconciliation_events").select("id, action, details, created_at, created_by").eq("bank_transaction_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (allocationError) throw migrationError(allocationError.message);
  const allocatedAmount = (allocations ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const remaining = remainingBankAmount(Number(transaction.amount), allocatedAmount);
  const search = postgrestSearchTerm(rawTargetSearch);
  const candidates: Candidate[] = [];
  let invoiceSuggestions: { id: string; number: string; client: string; date: string | null; total: number }[] = [];
  const from = new Date(`${transaction.booking_date}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date(`${transaction.booking_date}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 7);

  if (transaction.direction === "credit") {
    let receiptQuery = supabase.from("documents").select("id, number, doc_date, client_name, grand_total").eq("type", "receipt").eq("status", "issued").order("doc_date", { ascending: false }).limit(50);
    if (search) receiptQuery = receiptQuery.or(`number.ilike.%${search}%,client_name.ilike.%${search}%`);
    const [{ data: receipts }, { data: invoices }] = await Promise.all([
      receiptQuery,
      supabase.from("documents").select("id, number, doc_date, client_name, grand_total").eq("type", "invoice").in("status", ["sent", "paid"]).eq("grand_total", transaction.amount).gte("doc_date", from.toISOString().slice(0, 10)).lte("doc_date", to.toISOString().slice(0, 10)).order("doc_date", { ascending: false }),
    ]);
    for (const receipt of receipts ?? []) candidates.push({
      type: "receipt", id: receipt.id, label: `${receipt.number} · ${receipt.client_name || "Unknown client"}`,
      amount: Number(receipt.grand_total), date: receipt.doc_date, party: receipt.client_name,
    });
    invoiceSuggestions = (invoices ?? []).map((invoice) => ({ id: invoice.id, number: invoice.number, client: invoice.client_name || "Unknown client", date: invoice.doc_date, total: Number(invoice.grand_total) }));
  } else {
    let purchaseQuery = supabase.from("purchase_payments").select("id, payment_date, amount, reference, purchase_orders(id, number, supplier_name)").order("payment_date", { ascending: false }).limit(50);
    let expenseQuery = supabase.from("expense_payments").select("id, payment_date, amount, reference, expenses(id, description, payee_name)").order("payment_date", { ascending: false }).limit(50);
    if (search) {
      const [{ data: matchingOrders }, { data: matchingExpenses }] = await Promise.all([
        supabase.from("purchase_orders").select("id").or(`number.ilike.%${search}%,supplier_name.ilike.%${search}%`).limit(50),
        supabase.from("expenses").select("id").or(`description.ilike.%${search}%,payee_name.ilike.%${search}%`).limit(50),
      ]);
      const orderIds = (matchingOrders ?? []).map((item) => item.id);
      const expenseRecordIds = (matchingExpenses ?? []).map((item) => item.id);
      purchaseQuery = purchaseQuery.or([`reference.ilike.%${search}%`, orderIds.length ? `purchase_order_id.in.(${orderIds.join(",")})` : ""].filter(Boolean).join(","));
      expenseQuery = expenseQuery.or([`reference.ilike.%${search}%`, expenseRecordIds.length ? `expense_id.in.(${expenseRecordIds.join(",")})` : ""].filter(Boolean).join(","));
    }
    const [{ data: purchasePayments }, { data: expensePayments }] = await Promise.all([purchaseQuery, expenseQuery]);
    for (const payment of purchasePayments ?? []) {
      const po = related(payment.purchase_orders);
      candidates.push({ type: "purchase_payment", id: payment.id, label: `${po?.number || "Purchase payment"} · ${po?.supplier_name || "Unknown supplier"}`, amount: Number(payment.amount), date: payment.payment_date, party: po?.supplier_name || null });
    }
    for (const payment of expensePayments ?? []) {
      const expense = related(payment.expenses);
      candidates.push({ type: "expense_payment", id: payment.id, label: `${expense?.description || "Expense payment"} · ${expense?.payee_name || "Unknown payee"}`, amount: Number(payment.amount), date: payment.payment_date, party: expense?.payee_name || null });
    }
  }

  const receiptIds = candidates.filter((item) => item.type === "receipt").map((item) => item.id);
  const purchaseIds = candidates.filter((item) => item.type === "purchase_payment").map((item) => item.id);
  const expenseIds = candidates.filter((item) => item.type === "expense_payment").map((item) => item.id);
  const empty = Promise.resolve({ data: [], error: null });
  const [receiptLinks, purchaseLinks, expenseLinks] = await Promise.all([
    receiptIds.length ? supabase.from("bank_transaction_allocations").select("receipt_id, amount").in("receipt_id", receiptIds) : empty,
    purchaseIds.length ? supabase.from("bank_transaction_allocations").select("purchase_payment_id, amount").in("purchase_payment_id", purchaseIds) : empty,
    expenseIds.length ? supabase.from("bank_transaction_allocations").select("expense_payment_id, amount").in("expense_payment_id", expenseIds) : empty,
  ]);
  const allocationErrorMessage = receiptLinks.error?.message || purchaseLinks.error?.message || expenseLinks.error?.message;
  if (allocationErrorMessage) throw migrationError(allocationErrorMessage);
  const used = new Map<string, number>();
  for (const row of receiptLinks.data ?? []) if ("receipt_id" in row && row.receipt_id) used.set(`receipt:${row.receipt_id}`, (used.get(`receipt:${row.receipt_id}`) || 0) + Number(row.amount));
  for (const row of purchaseLinks.data ?? []) if ("purchase_payment_id" in row && row.purchase_payment_id) used.set(`purchase_payment:${row.purchase_payment_id}`, (used.get(`purchase_payment:${row.purchase_payment_id}`) || 0) + Number(row.amount));
  for (const row of expenseLinks.data ?? []) if ("expense_payment_id" in row && row.expense_payment_id) used.set(`expense_payment:${row.expense_payment_id}`, (used.get(`expense_payment:${row.expense_payment_id}`) || 0) + Number(row.amount));

  const available = candidates.map((candidate) => ({ ...candidate, targetRemaining: remainingBankAmount(candidate.amount, used.get(`${candidate.type}:${candidate.id}`) || 0) })).filter((candidate) => candidate.targetRemaining > 0);
  const likely = available.filter((candidate) => candidate.targetRemaining === remaining && dateDistance(transaction.booking_date, candidate.date) <= 7 && bankPartyMatches(transaction.counterparty, candidate.party));
  const suggestedKey = likely.length === 1 ? `${likely[0].type}:${likely[0].id}` : "";
  const targets: BankTarget[] = available.map((candidate) => {
    const suggested = `${candidate.type}:${candidate.id}` === suggestedKey;
    const days = dateDistance(transaction.booking_date, candidate.date);
    return {
      value: `${candidate.type}:${candidate.id}${suggested ? ":suggested" : ""}`,
      label: `${candidate.label} · AED ${candidate.targetRemaining.toFixed(2)} remaining`,
      amount: candidate.targetRemaining,
      date: candidate.date,
      suggested,
      reason: suggested ? `Exact remaining amount · matching party · ${days === 0 ? "same date" : `${days} day${days === 1 ? "" : "s"} apart`}` : "",
    };
  });
  targets.sort((a, b) => Number(b.suggested) - Number(a.suggested) || dateDistance(transaction.booking_date, a.date) - dateDistance(transaction.booking_date, b.date));
  return { transaction, allocations: allocations ?? [], events: events ?? [], targets, invoiceSuggestions, allocatedAmount, remaining, targetSearch: search };
}
