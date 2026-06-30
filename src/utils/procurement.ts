// Pure helpers for purchase orders — unit-testable.

export const PO_STATUSES = ["draft", "ordered", "partial", "received", "cancelled"];

export const PO_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partial: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

/** Payment state of a PO from its total and what's been paid to the supplier. */
export function paymentStatus(grandTotal: number | null | undefined, paid: number | null | undefined): "unpaid" | "partial" | "paid" {
  const g = +(Number(grandTotal) || 0).toFixed(2);
  const p = +(Number(paid) || 0).toFixed(2);
  if (p <= 0) return "unpaid";
  if (p + 0.01 >= g) return "paid";
  return "partial";
}

/** Balance still owed to the supplier. */
export const balanceOwed = (grandTotal: number | null | undefined, paid: number | null | undefined): number =>
  +(((Number(grandTotal) || 0) - (Number(paid) || 0))).toFixed(2);
