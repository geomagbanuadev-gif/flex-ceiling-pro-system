import { describe, it, expect } from "vitest";
import { computeTotals } from "./totals";

describe("computeTotals", () => {
  it("sums amounts and applies VAT (quote)", () => {
    const t = computeTotals([1000, 500], { vatRate: 5 });
    expect(t.subtotal).toBe(1500);
    expect(t.vatAmount).toBe(75);
    expect(t.grandTotal).toBe(1575);
    expect(t.advanceAmount).toBe(0);
    expect(t.balanceDue).toBe(1575);
  });

  it("matches the AL SHUAA pro forma sample (33.7 x 250)", () => {
    const lineAmount = 33.7 * 250; // 8425
    const t = computeTotals([lineAmount], { vatRate: 5, advance: 4646.25 });
    expect(t.subtotal).toBe(8425);
    expect(t.vatAmount).toBe(421.25);
    expect(t.grandTotal).toBe(8846.25);
    expect(t.advanceAmount).toBe(4646.25);
    expect(t.balanceDue).toBe(4200); // grand − advance
  });

  it("applies a discount before VAT", () => {
    const t = computeTotals([1000], { vatRate: 5, discount: 100 });
    expect(t.subtotal).toBe(1000);
    expect(t.discount).toBe(100);
    expect(t.vatAmount).toBe(45); // 900 * 5%
    expect(t.grandTotal).toBe(945);
  });

  it("clamps a discount to the subtotal and never goes negative", () => {
    expect(computeTotals([500], { discount: 9999 }).discount).toBe(500);
    expect(computeTotals([500], { discount: -50 }).discount).toBe(0);
  });

  it("clamps the advance to the grand total (balance never negative)", () => {
    const t = computeTotals([1000], { vatRate: 0, advance: 5000 });
    expect(t.advanceAmount).toBe(1000);
    expect(t.balanceDue).toBe(0);
  });

  it("handles an empty/zero document", () => {
    const t = computeTotals([], { vatRate: 5 });
    expect(t).toMatchObject({ subtotal: 0, vatAmount: 0, grandTotal: 0, balanceDue: 0 });
  });

  it("rounds to 2 decimals", () => {
    const t = computeTotals([33.333, 33.333, 33.334], { vatRate: 0 });
    expect(t.subtotal).toBe(100);
  });
});
