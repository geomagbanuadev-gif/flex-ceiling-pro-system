import { describe, expect, it } from "vitest";
import {
  calculateFinanceTotals,
  expenseMarginCost,
  outstandingBalance,
  paymentState,
  agingBucket,
  receivedForInvoice,
  expensePaymentError,
} from "./finance";

describe("finance balance rules", () => {
  it("clamps an overpayment instead of returning a negative balance", () => {
    expect(outstandingBalance(100, 125)).toBe(0);
    expect(paymentState(100, 125)).toBe("paid");
  });

  it("counts only issued receipts allocated to the invoice", () => {
    expect(receivedForInvoice("invoice-1", [
      { status: "issued", grand_total: 4000, applies_to_invoice_id: "invoice-1" },
      { status: "issued", grand_total: 6500, applies_to_invoice_id: "invoice-1" },
      { status: "draft", grand_total: 500, applies_to_invoice_id: "invoice-1" },
      { status: "issued", grand_total: 250, applies_to_invoice_id: "invoice-2" },
    ])).toBe(10500);
  });

  it("excludes recoverable VAT from margin cost", () => {
    expect(expenseMarginCost({ subtotal: 500, vat_amount: 25, vat_recoverable: true })).toBe(500);
    expect(expenseMarginCost({ subtotal: 500, vat_amount: 25, vat_recoverable: false })).toBe(525);
  });
});

describe("expense payment validation", () => {
  it("requires a posted expense and prevents overpayment", () => {
    expect(expensePaymentError("draft", 100, 0, 25)).toContain("posted");
    expect(expensePaymentError("posted", 100, 80, 20)).toBeNull();
    expect(expensePaymentError("posted", 100, 80, 20.01)).toContain("remaining balance");
  });
});

describe("agingBucket", () => {
  it("uses calendar-day aging and keeps missing due dates explicit", () => {
    expect(agingBucket(null, "2026-09-24")).toBe("no-due-date");
    expect(agingBucket("2026-09-24", "2026-09-24")).toBe("current");
    expect(agingBucket("2026-09-01", "2026-09-24")).toBe("1-30");
    expect(agingBucket("2026-07-01", "2026-09-24")).toBe("61-90");
    expect(agingBucket("2026-01-01", "2026-09-24")).toBe("over-90");
  });
});

describe("calculateFinanceTotals", () => {
  it("keeps project margin and cash movement separate", () => {
    const totals = calculateFinanceTotals({
      invoices: [{ id: "inv", status: "sent", subtotal: 20000, discount: 0, grand_total: 21000 }],
      receipts: [{ status: "issued", grand_total: 10000, applies_to_invoice_id: "inv" }],
      purchaseOrders: [{ id: "po", status: "ordered", subtotal: 8000, discount: 0, grand_total: 8400 }],
      purchasePayments: [{ purchase_order_id: "po", amount: 4000 }],
      expenses: [{ id: "expense", status: "posted", subtotal: 2000, vat_amount: 0, vat_recoverable: false, grand_total: 2000 }],
      expensePayments: [{ expense_id: "expense", amount: 1000 }],
    });

    expect(totals).toEqual({
      netSales: 20000,
      moneyReceived: 10000,
      receivables: 11000,
      committedCosts: 10000,
      moneyPaid: 5000,
      payables: 5400,
      projectMargin: 10000,
      netCash: 5000,
    });
  });

  it("excludes draft, lost, cancelled, and void records", () => {
    const totals = calculateFinanceTotals({
      invoices: [
        { id: "draft", status: "draft", subtotal: 100, discount: 0, grand_total: 105 },
        { id: "lost", status: "lost", subtotal: 100, discount: 0, grand_total: 105 },
      ],
      receipts: [{ status: "void", grand_total: 100, applies_to_invoice_id: "draft" }],
      purchaseOrders: [{ id: "po", status: "cancelled", subtotal: 100, discount: 0, grand_total: 105 }],
      purchasePayments: [],
      expenses: [{ id: "expense", status: "void", subtotal: 100, vat_amount: 5, vat_recoverable: false, grand_total: 105 }],
      expensePayments: [],
    });
    expect(totals).toEqual({ netSales: 0, moneyReceived: 0, receivables: 0, committedCosts: 0, moneyPaid: 0, payables: 0, projectMargin: 0, netCash: 0 });
  });
});
