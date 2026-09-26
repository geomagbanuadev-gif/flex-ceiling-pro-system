import { uuidQueryParam } from "./query";

export const BANK_CLASSIFICATIONS = [
  ["customer_receipt", "Customer receipt"],
  ["supplier_payment", "Supplier payment"],
  ["expense_payment", "Expense payment"],
  ["bank_fee", "Bank fee"],
  ["internal_transfer", "Internal transfer"],
  ["cash_movement", "Cash movement"],
  ["refund", "Refund"],
  ["owner_funding", "Owner funding"],
  ["other", "Other"],
] as const;

export type BankTargetType = "receipt" | "purchase_payment" | "expense_payment";

export function parseBankTarget(value: unknown): { type: BankTargetType; id: string; suggested: boolean } | null {
  if (typeof value !== "string") return null;
  const [type, id, marker, extra] = value.split(":");
  if (extra || (marker && marker !== "suggested") || !["receipt", "purchase_payment", "expense_payment"].includes(type) || !uuidQueryParam(id)) return null;
  return { type: type as BankTargetType, id, suggested: marker === "suggested" };
}

export const bankStatusLabel = (value: string) => value === "partial" ? "Partially matched" : value.charAt(0).toUpperCase() + value.slice(1);
export const remainingBankAmount = (amount: number, allocated: number) => Math.max(0, Math.round((amount - allocated) * 100) / 100);

export function bankPartyMatches(bankParty: string | null, recordParty: string | null): boolean {
  const clean = (value: string | null) => (value || "").toUpperCase()
    .replace(/\b(?:FZ[- ]?LLC|L\.L\.C|LLC|CO|COMPANY)\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const bank = clean(bankParty);
  const record = clean(recordParty);
  return bank.length >= 8 && record.length >= 8 && (bank === record || bank.includes(record) || record.includes(bank));
}

export function bankTimeFromDescription(description: string): string {
  return description.match(/(?:^|\s)([01]\d|2[0-3]):[0-5]\d(?:\s|$)/)?.[0].trim() ?? "";
}
