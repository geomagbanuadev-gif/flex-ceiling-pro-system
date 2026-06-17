// Single source of truth for document money math (quotes, pro formas, invoices).
// Pure + rounded to 2 decimals so the form, the stored row, and the PDF all agree.

export type Totals = {
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  advanceAmount: number; // pro forma: amount due now
  balanceDue: number; // pro forma: grand total − advance
};

const round2 = (n: number) => +(Number(n) || 0).toFixed(2);

export function computeTotals(
  amounts: number[],
  opts: { vatRate?: number; discount?: number; advance?: number } = {}
): Totals {
  const vatRate = Number(opts.vatRate) || 0;
  const subtotal = round2(amounts.reduce((s, a) => s + (Number(a) || 0), 0));
  // a discount can never be negative nor exceed the subtotal
  const discount = round2(Math.min(Math.max(Number(opts.discount) || 0, 0), subtotal));
  const taxable = subtotal - discount;
  const vatAmount = round2(taxable * (vatRate / 100));
  const grandTotal = round2(taxable + vatAmount);
  // an advance can never be negative nor exceed the grand total
  const advanceAmount = round2(Math.min(Math.max(Number(opts.advance) || 0, 0), grandTotal));
  const balanceDue = round2(grandTotal - advanceAmount);
  return { subtotal, discount, vatAmount, grandTotal, advanceAmount, balanceDue };
}
