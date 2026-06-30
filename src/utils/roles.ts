// Pure role/access helpers — no server imports, so they're safe to unit-test
// and to use from both client and server components.

export type Role = "super" | "staff" | "quotes" | "invoices";

export const canSeeQuotes = (r: Role) => r === "super" || r === "staff" || r === "quotes";
export const canSeeInvoices = (r: Role) => r === "super" || r === "staff" || r === "invoices";
// Pro formas and receipts are billing/payment documents — same access group as tax invoices.
export const canSeeProformas = (r: Role) => r === "super" || r === "staff" || r === "invoices";
export const canSeeReceipts = (r: Role) => r === "super" || r === "staff" || r === "invoices";
// Procurement (suppliers + purchase orders) is internal buying — super/staff only.
export const canSeeProcurement = (r: Role) => r === "super" || r === "staff";

/** Whether a role may act on a given document type. */
export function canAccessType(role: Role, type: "quote" | "invoice" | "proforma" | "receipt"): boolean {
  if (role === "super" || role === "staff") return true;
  if (type === "quote") return role === "quotes";
  return role === "invoices"; // invoice + proforma + receipt
}
