import "server-only";

import { createClient } from "@/utils/supabase/server";
import { agingBucket, calculateFinanceTotals, outstandingBalance, paidForExpense, paidForPurchaseOrder, paymentState, receivedForInvoice, roundMoney, type AgingBucket, type PaymentState } from "@/utils/finance";

export type ReceivableRow = { id: string; number: string; client: string; project: string; invoiceDate: string | null; dueDate: string | null; total: number; received: number; balance: number; excess: number; state: PaymentState; aging: AgingBucket; legacyPaid: boolean };
export type PayableRow = { id: string; href: string; source: "Purchase order" | "Expense"; number: string; payee: string; project: string; date: string | null; dueDate: string | null; total: number; paid: number; balance: number; state: PaymentState; aging: AgingBucket };
export type ExpenseReportRow = { id: string; date: string | null; description: string; payee: string; project: string; status: string; total: number; paid: number; balance: number };
export type ProjectReportRow = { id: string; name: string; client: string; netSales: number; costs: number; received: number; paid: number; margin: number; netCash: number };

const inRange = (date: string | null | undefined, from?: string, to?: string) => Boolean(date) && (!from || date! >= from) && (!to || date! <= to);

export async function loadFinanceWorkspace(filters: { from?: string; to?: string } = {}) {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("documents").select("id, number, type, status, doc_date, due_date, client_id, client_name, project_id, subtotal, discount, grand_total, applies_to_invoice_id"),
    supabase.from("purchase_orders").select("id, number, status, po_date, due_date, supplier_name, project_id, subtotal, discount, grand_total"),
    supabase.from("purchase_payments").select("purchase_order_id, payment_date, amount"),
    supabase.from("expenses").select("id, expense_date, due_date, description, payee_name, status, project_id, subtotal, vat_amount, vat_recoverable, grand_total"),
    supabase.from("expense_payments").select("expense_id, payment_date, amount"),
    supabase.from("projects").select("id, name, clients(name)"),
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(`Finance requires the finance migration: ${error.message}`);
  const documents = results[0].data ?? [];
  const purchaseOrders = results[1].data ?? [];
  const purchasePayments = results[2].data ?? [];
  const expenses = results[3].data ?? [];
  const expensePayments = results[4].data ?? [];
  const projects = results[5].data ?? [];
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const invoices = documents.filter((doc) => doc.type === "invoice" && (doc.status === "sent" || doc.status === "paid"));
  const receipts = documents.filter((doc) => doc.type === "receipt" && doc.status === "issued");
  const today = new Date().toISOString().slice(0, 10);

  const receivables: ReceivableRow[] = invoices.map((invoice) => {
    const received = receivedForInvoice(invoice.id, receipts);
    const legacyPaid = invoice.status === "paid" && received === 0;
    const balance = legacyPaid ? 0 : outstandingBalance(invoice.grand_total, received);
    return { id: invoice.id, number: invoice.number, client: invoice.client_name || "—", project: projectName.get(invoice.project_id) ?? "Unassigned", invoiceDate: invoice.doc_date, dueDate: invoice.due_date, total: roundMoney(invoice.grand_total), received, balance, excess: Math.max(roundMoney(received - (Number(invoice.grand_total) || 0)), 0), state: legacyPaid ? "paid" : paymentState(invoice.grand_total, received), aging: agingBucket(invoice.due_date, today), legacyPaid };
  });

  const poPayables: PayableRow[] = purchaseOrders.filter((po) => ["ordered", "partial", "received"].includes(po.status ?? "")).map((po) => {
    const paid = paidForPurchaseOrder(po.id, purchasePayments);
    return { id: po.id, href: `/purchase-orders/${po.id}`, source: "Purchase order", number: po.number, payee: po.supplier_name || "—", project: projectName.get(po.project_id) ?? "Unassigned", date: po.po_date, dueDate: po.due_date, total: roundMoney(po.grand_total), paid, balance: outstandingBalance(po.grand_total, paid), state: paymentState(po.grand_total, paid), aging: agingBucket(po.due_date, today) };
  });
  const expensePayables: PayableRow[] = expenses.filter((expense) => expense.status === "posted").map((expense) => {
    const paid = paidForExpense(expense.id, expensePayments);
    return { id: expense.id, href: `/expenses/${expense.id}`, source: "Expense", number: expense.description, payee: expense.payee_name || "—", project: projectName.get(expense.project_id) ?? "Unassigned", date: expense.expense_date, dueDate: expense.due_date, total: roundMoney(expense.grand_total), paid, balance: outstandingBalance(expense.grand_total, paid), state: paymentState(expense.grand_total, paid), aging: agingBucket(expense.due_date, today) };
  });
  const payables = [...poPayables, ...expensePayables].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const expenseRows: ExpenseReportRow[] = expenses.map((expense) => {
    const paid = paidForExpense(expense.id, expensePayments);
    return { id: expense.id, date: expense.expense_date, description: expense.description, payee: expense.payee_name || "—", project: projectName.get(expense.project_id) ?? "Unassigned", status: expense.status || "draft", total: roundMoney(expense.grand_total), paid, balance: outstandingBalance(expense.grand_total, paid) };
  });
  const projectRows: ProjectReportRow[] = projects.map((project) => {
    const docs = documents.filter((row) => row.project_id === project.id);
    const pos = purchaseOrders.filter((row) => row.project_id === project.id);
    const projectExpenses = expenses.filter((row) => row.project_id === project.id);
    const totals = calculateFinanceTotals({ invoices: docs.filter((row) => row.type === "invoice"), receipts: docs.filter((row) => row.type === "receipt"), purchaseOrders: pos, purchasePayments: purchasePayments.filter((payment) => pos.some((po) => po.id === payment.purchase_order_id)), expenses: projectExpenses, expensePayments: expensePayments.filter((payment) => projectExpenses.some((expense) => expense.id === payment.expense_id)) });
    const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
    return { id: project.id, name: project.name, client: client?.name ?? "—", netSales: totals.netSales, costs: totals.committedCosts, received: totals.moneyReceived, paid: totals.moneyPaid, margin: totals.projectMargin, netCash: totals.netCash };
  });

  const periodTotals = calculateFinanceTotals({
    invoices: invoices.filter((row) => inRange(row.doc_date, filters.from, filters.to)),
    receipts: receipts.filter((row) => inRange(row.doc_date, filters.from, filters.to)),
    purchaseOrders: purchaseOrders.filter((row) => inRange(row.po_date, filters.from, filters.to)),
    purchasePayments: purchasePayments.filter((row) => inRange(row.payment_date, filters.from, filters.to)),
    expenses: expenses.filter((row) => inRange(row.expense_date, filters.from, filters.to)),
    expensePayments: expensePayments.filter((row) => inRange(row.payment_date, filters.from, filters.to)),
  });
  const summary = { ...periodTotals, receivables: roundMoney(receivables.reduce((sum, row) => sum + row.balance, 0)), payables: roundMoney(payables.reduce((sum, row) => sum + row.balance, 0)) };
  return { summary, receivables, payables, expenseRows, projectRows, unappliedReceipts: receipts.filter((receipt) => !receipt.applies_to_invoice_id), unassignedCount: documents.filter((doc) => !doc.project_id).length + purchaseOrders.filter((po) => !po.project_id).length + expenses.filter((expense) => !expense.project_id).length };
}
