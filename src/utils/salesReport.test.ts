import { describe, expect, it } from "vitest";
import { salesRange, salesTotals, type SalesRow } from "./salesReport";

describe("sales reports", () => {
  const now = new Date("2026-09-23T12:00:00Z");

  it("builds weekly, 14-day, monthly and custom ranges", () => {
    expect(salesRange({ period: "week", anchor: "2026-09-23" }, now)).toEqual({ from: "2026-09-21", to: "2026-09-27" });
    expect(salesRange({ period: "biweekly", anchor: "2026-09-23" }, now)).toEqual({ from: "2026-09-10", to: "2026-09-23" });
    expect(salesRange({ period: "month", anchor: "2026-02-12" }, now)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(salesRange({ period: "custom", from: "2026-07-01", to: "2026-07-31" }, now)).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("totals the saved invoice snapshot", () => {
    const row = (subtotal: number, discount: number, vat_amount: number, grand_total: number): SalesRow => ({
      id: crypto.randomUUID(), number: "INV-0001", status: "paid", doc_date: "2026-09-23", client_name: "Client",
      subtotal, discount, vat_amount, grand_total,
    });
    expect(salesTotals([row(100, 10, 4.5, 94.5), row(200, 0, 10, 210)])).toEqual({
      invoiceCount: 2, subtotal: 300, discount: 10, vatAmount: 14.5, grandTotal: 304.5,
    });
  });
});
