import "server-only";

import { createClient } from "@/utils/supabase/server";
import { roundMoney, type AgingBucket, type FinanceTotals, type PaymentState } from "@/utils/finance";
import { postgrestSearchTerm } from "@/utils/query";

export type ReceivableRow = { id: string; number: string; client: string; project: string; invoiceDate: string | null; dueDate: string | null; total: number; received: number; balance: number; excess: number; state: PaymentState; aging: AgingBucket; legacyPaid: boolean };
export type PayableRow = { id: string; href: string; source: "Purchase order" | "Expense"; number: string; payee: string; project: string; date: string | null; dueDate: string | null; total: number; paid: number; balance: number; state: PaymentState; aging: AgingBucket };
export type ExpenseReportRow = { id: string; date: string | null; description: string; payee: string; project: string; status: string; total: number; paid: number; balance: number };
export type ProjectReportRow = { id: string; name: string; client: string; netSales: number; costs: number; received: number; paid: number; margin: number; netCash: number };

const migrationError = (message: string) => new Error(`Finance requires read-performance.sql: ${message}`);

export async function loadFinanceSummary(filters: { from?: string; to?: string } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finance_period_summary", { p_from: filters.from || null, p_to: filters.to || null });
  if (error) throw migrationError(error.message);
  const value = data as Record<string, number>;
  const summary: FinanceTotals = {
    netSales: roundMoney(value.netSales), moneyReceived: roundMoney(value.moneyReceived), receivables: roundMoney(value.receivables),
    committedCosts: roundMoney(value.committedCosts), moneyPaid: roundMoney(value.moneyPaid), payables: roundMoney(value.payables),
    projectMargin: roundMoney(value.projectMargin), netCash: roundMoney(value.netCash),
  };
  return { summary, unappliedReceiptCount: Number(value.unappliedReceiptCount) || 0, unassignedCount: Number(value.unassignedCount) || 0 };
}

export async function loadReceivables(filters: { state?: string; aging?: string; page?: number; pageSize?: number } = {}) {
  const supabase = await createClient();
  let query = supabase.from("finance_receivables").select("*", { count: "exact" }).order("invoice_date", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
  if (filters.state) query = query.eq("payment_state", filters.state);
  if (filters.aging) query = query.eq("aging", filters.aging);
  if (filters.page && filters.pageSize) query = query.range((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw migrationError(error.message);
  return { rows: (data ?? []).map((row): ReceivableRow => ({ id: row.id, number: row.number, client: row.client, project: row.project, invoiceDate: row.invoice_date, dueDate: row.due_date, total: Number(row.total), received: Number(row.received), balance: Number(row.balance), excess: Number(row.excess), state: row.payment_state as PaymentState, aging: row.aging as AgingBucket, legacyPaid: Boolean(row.legacy_paid) })), count: count ?? 0 };
}

export async function loadPayables(filters: { state?: string; aging?: string; source?: string; page?: number; pageSize?: number } = {}) {
  const supabase = await createClient();
  let query = supabase.from("finance_payables").select("*", { count: "exact" }).order("record_date", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
  if (filters.state) query = query.eq("payment_state", filters.state);
  if (filters.aging) query = query.eq("aging", filters.aging);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.page && filters.pageSize) query = query.range((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw migrationError(error.message);
  return { rows: (data ?? []).map((row): PayableRow => ({ id: row.id, href: row.source === "Expense" ? `/expenses/${row.id}` : `/purchase-orders/${row.id}`, source: row.source as PayableRow["source"], number: row.number, payee: row.payee, project: row.project, date: row.record_date, dueDate: row.due_date, total: Number(row.total), paid: Number(row.paid), balance: Number(row.balance), state: row.payment_state as PaymentState, aging: row.aging as AgingBucket })), count: count ?? 0 };
}

export async function loadExpenseReport(filters: { q?: string; status?: string; category?: string; supplier?: string; project?: string; from?: string; to?: string } = {}) {
  const supabase = await createClient();
  const q = postgrestSearchTerm(filters.q ?? "");
  let query = supabase.from("finance_expenses").select("*").order("record_date", { ascending: false }).order("id", { ascending: false });
  if (q) query = query.or(`description.ilike.%${q}%,payee.ilike.%${q}%,supplier_invoice_number.ilike.%${q}%,reference.ilike.%${q}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.supplier) query = query.eq("supplier_id", filters.supplier);
  if (filters.project) query = query.eq("project_id", filters.project);
  if (filters.from) query = query.gte("record_date", filters.from);
  if (filters.to) query = query.lte("record_date", filters.to);
  const { data, error } = await query;
  if (error) throw migrationError(error.message);
  return (data ?? []).map((row): ExpenseReportRow => ({ id: row.id, date: row.record_date, description: row.description, payee: row.payee, project: row.project, status: row.display_status, total: Number(row.total), paid: Number(row.paid), balance: Number(row.balance) }));
}

export async function loadProjectReport(filters: { q?: string; status?: string; client?: string } = {}) {
  const supabase = await createClient();
  const q = postgrestSearchTerm(filters.q ?? "");
  let query = supabase.from("project_finance_summary").select("*").order("name").order("id");
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.client) query = query.eq("client_id", filters.client);
  const { data, error } = await query;
  if (error) throw migrationError(error.message);
  return (data ?? []).map((row): ProjectReportRow => ({ id: row.id, name: row.name, client: row.client, netSales: Number(row.net_sales), costs: Number(row.costs), received: Number(row.received), paid: Number(row.paid), margin: Number(row.margin), netCash: Number(row.net_cash) }));
}
