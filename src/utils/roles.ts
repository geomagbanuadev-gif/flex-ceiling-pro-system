// Pure role/access helpers — no server imports, so they're safe to unit-test
// and to use from both client and server components.

export const ROLE_OPTIONS = [
  { value: "super", label: "Super" },
  { value: "staff", label: "Full staff" },
  { value: "finance", label: "Finance" },
  { value: "quotes", label: "Quotes only" },
  { value: "invoices", label: "Invoices only" },
] as const;

export type Role = (typeof ROLE_OPTIONS)[number]["value"];

export const isRole = (value: string): value is Role => ROLE_OPTIONS.some((role) => role.value === value);
export const roleLabel = (value: string) => ROLE_OPTIONS.find((role) => role.value === value)?.label ?? value;

export const canSeeQuotes = (r: Role) => r === "super" || r === "staff" || r === "quotes";
export const canSeeInvoices = (r: Role) => r === "super" || r === "staff" || r === "invoices";
// Pro formas and receipts are billing/payment documents — same access group as tax invoices.
export const canSeeProformas = (r: Role) => r === "super" || r === "staff" || r === "invoices";
export const canSeeReceipts = (r: Role) => r === "super" || r === "staff" || r === "invoices";
// Procurement (suppliers + purchase orders) is internal buying — super/staff only.
export const canSeeProcurement = (r: Role) => r === "super" || r === "staff";
export const canSeeProjects = (r: Role) => r === "super" || r === "staff" || r === "finance";
export const canManageProjects = (r: Role) => r === "super" || r === "staff";
export const canSeeFinance = (r: Role) => r === "super" || r === "finance";

/** Whether a role may act on a given document type. */
export function canAccessType(role: Role, type: "quote" | "invoice" | "proforma" | "receipt"): boolean {
  if (role === "super" || role === "staff") return true;
  if (type === "quote") return role === "quotes";
  return role === "invoices"; // invoice + proforma + receipt
}
