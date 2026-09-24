// Finance rules live here so pages, dashboards, and exports cannot drift apart.

export type PaymentState = "unpaid" | "partial" | "paid";
export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "over-90" | "no-due-date";

export type FinanceInvoice = {
  id: string;
  status: string | null;
  subtotal: number | null;
  discount: number | null;
  grand_total: number | null;
};

export type FinanceReceipt = {
  status: string | null;
  grand_total: number | null;
  applies_to_invoice_id?: string | null;
};

export type FinancePurchaseOrder = {
  id: string;
  status: string | null;
  subtotal: number | null;
  discount: number | null;
  grand_total: number | null;
};

export type FinancePayment = {
  amount: number | null;
  purchase_order_id?: string | null;
  expense_id?: string | null;
};

export type FinanceExpense = {
  id: string;
  status: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  vat_recoverable: boolean | null;
  grand_total: number | null;
};

export const roundMoney = (value: number | null | undefined) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const sumMoney = (values: Array<number | null | undefined>) =>
  roundMoney(values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0));

export const outstandingBalance = (total: number | null | undefined, paid: number | null | undefined) =>
  Math.max(roundMoney((Number(total) || 0) - (Number(paid) || 0)), 0);

export function paymentState(total: number | null | undefined, paid: number | null | undefined): PaymentState {
  const amount = roundMoney(paid);
  if (amount <= 0) return "unpaid";
  return outstandingBalance(total, amount) <= 0 ? "paid" : "partial";
}

export function agingBucket(dueDate: string | null | undefined, asOf: string): AgingBucket {
  if (!dueDate) return "no-due-date";
  const days = Math.floor((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "over-90";
}

export const isFinanceInvoice = (invoice: Pick<FinanceInvoice, "status">) =>
  invoice.status === "sent" || invoice.status === "paid";

export const isIssuedReceipt = (receipt: Pick<FinanceReceipt, "status">) => receipt.status === "issued";

export const isActivePurchaseOrder = (po: Pick<FinancePurchaseOrder, "status">) =>
  po.status === "ordered" || po.status === "partial" || po.status === "received";

export const isPostedExpense = (expense: Pick<FinanceExpense, "status">) => expense.status === "posted";

export function expensePaymentError(status: string | null | undefined, total: number, alreadyPaid: number, amount: number) {
  if (status !== "posted") return "Payments can only be recorded for posted expenses";
  const remaining = outstandingBalance(total, alreadyPaid);
  if (roundMoney(amount) <= 0) return "Payment amount must be greater than zero";
  if (roundMoney(amount) > remaining) return `Payment exceeds the remaining balance of AED ${remaining.toFixed(2)}`;
  return null;
}

export const invoiceNetSales = (invoice: Pick<FinanceInvoice, "subtotal" | "discount">) =>
  roundMoney((Number(invoice.subtotal) || 0) - (Number(invoice.discount) || 0));

export const purchaseOrderNetCost = (po: Pick<FinancePurchaseOrder, "subtotal" | "discount">) =>
  roundMoney((Number(po.subtotal) || 0) - (Number(po.discount) || 0));

export const expenseMarginCost = (expense: Pick<FinanceExpense, "subtotal" | "vat_amount" | "vat_recoverable">) =>
  roundMoney((Number(expense.subtotal) || 0) + (expense.vat_recoverable ? 0 : Number(expense.vat_amount) || 0));

export function receivedForInvoice(invoiceId: string, receipts: FinanceReceipt[]) {
  return sumMoney(
    receipts
      .filter((receipt) => isIssuedReceipt(receipt) && receipt.applies_to_invoice_id === invoiceId)
      .map((receipt) => receipt.grand_total),
  );
}

export function paidForPurchaseOrder(purchaseOrderId: string, payments: FinancePayment[]) {
  return sumMoney(
    payments.filter((payment) => payment.purchase_order_id === purchaseOrderId).map((payment) => payment.amount),
  );
}

export function paidForExpense(expenseId: string, payments: FinancePayment[]) {
  return sumMoney(payments.filter((payment) => payment.expense_id === expenseId).map((payment) => payment.amount));
}

export type FinanceTotals = {
  netSales: number;
  moneyReceived: number;
  receivables: number;
  committedCosts: number;
  moneyPaid: number;
  payables: number;
  projectMargin: number;
  netCash: number;
};

export function calculateFinanceTotals(input: {
  invoices: FinanceInvoice[];
  receipts: FinanceReceipt[];
  purchaseOrders: FinancePurchaseOrder[];
  purchasePayments: FinancePayment[];
  expenses: FinanceExpense[];
  expensePayments: FinancePayment[];
}): FinanceTotals {
  const invoices = input.invoices.filter(isFinanceInvoice);
  const receipts = input.receipts.filter(isIssuedReceipt);
  const purchaseOrders = input.purchaseOrders.filter(isActivePurchaseOrder);
  const expenses = input.expenses.filter(isPostedExpense);

  const netSales = sumMoney(invoices.map(invoiceNetSales));
  const moneyReceived = sumMoney(receipts.map((receipt) => receipt.grand_total));
  const receivables = sumMoney(
    invoices.map((invoice) => outstandingBalance(invoice.grand_total, receivedForInvoice(invoice.id, receipts))),
  );
  const committedCosts = sumMoney([
    ...purchaseOrders.map(purchaseOrderNetCost),
    ...expenses.map(expenseMarginCost),
  ]);
  const moneyPaid = sumMoney([
    ...input.purchasePayments.map((payment) => payment.amount),
    ...input.expensePayments.map((payment) => payment.amount),
  ]);
  const payables = sumMoney([
    ...purchaseOrders.map((po) => outstandingBalance(po.grand_total, paidForPurchaseOrder(po.id, input.purchasePayments))),
    ...expenses.map((expense) => outstandingBalance(expense.grand_total, paidForExpense(expense.id, input.expensePayments))),
  ]);

  return {
    netSales,
    moneyReceived,
    receivables,
    committedCosts,
    moneyPaid,
    payables,
    projectMargin: roundMoney(netSales - committedCosts),
    netCash: roundMoney(moneyReceived - moneyPaid),
  };
}
