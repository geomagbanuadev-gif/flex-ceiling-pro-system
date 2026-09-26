import { describe, expect, it } from "vitest";
import { calculateExpenseItem, calculateExpenseTotals } from "./expense";

describe("expense item totals", () => {
  it("applies the discount before VAT", () => {
    expect(calculateExpenseItem({
      productCode: "SKU-1",
      description: "Equipment",
      quantity: 2,
      unit: "pcs",
      unitPrice: 100,
      discount: 20,
      vatRate: 5,
      serialNumber: "",
    })).toMatchObject({ netAmount: 180, vatAmount: 9, totalAmount: 189 });
  });

  it("sums itemized expenses using currency rounding", () => {
    expect(calculateExpenseTotals([
      { productCode: "", description: "One", quantity: 1, unit: "pcs", unitPrice: 33.333, discount: 0, vatRate: 5, serialNumber: "" },
      { productCode: "", description: "Two", quantity: 2, unit: "pcs", unitPrice: 10, discount: 1, vatRate: 0, serialNumber: "" },
    ])).toMatchObject({ subtotal: 52.33, vatAmount: 1.67, grandTotal: 54 });
  });
});
