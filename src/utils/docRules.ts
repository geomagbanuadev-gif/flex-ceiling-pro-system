// Pure, type-dependent document rules shared by the server actions — extracted
// so the document behaviour (pro forma / tax invoice / receipt) is unit-testable.
import { amountInWords } from "./amountInWords";

export type DocType = "quote" | "invoice" | "proforma" | "receipt";

const QUOTE_STATUSES = ["draft", "sent", "won", "ongoing", "lost"];
const INVOICE_STATUSES = ["draft", "sent", "paid", "lost"];
const PROFORMA_STATUSES = ["draft", "sent", "ongoing", "paid", "lost"];
const RECEIPT_STATUSES = ["draft", "issued", "void"];
// Ongoing tracks accepted work on quotes and pro formas, not payment on invoices.
export const statusesFor = (type: string): string[] =>
  type === "quote" ? QUOTE_STATUSES : type === "proforma" ? PROFORMA_STATUSES : type === "receipt" ? RECEIPT_STATUSES : INVOICE_STATUSES;

export function allowedStatusTransitions(type: string, current: string | null | undefined) {
  const status = current ?? "draft";
  const all = statusesFor(type);
  if (type === "quote" || status === "draft") return all;
  if (type === "receipt") return status === "issued" ? ["issued", "void"] : [status];
  if (type === "invoice" && status === "paid") return ["paid"];
  return all.filter((next) => next !== "draft");
}

export const canRegenerateGeneratedDocument = (status: string | null | undefined) => status === "draft";

export function regenerationBlockedMessage(type: DocType, status: string | null | undefined) {
  if (canRegenerateGeneratedDocument(status)) return null;
  const label = type === "invoice" ? "tax invoice" : type === "proforma" ? "pro forma" : "receipt";
  return `Only a draft ${label} can be regenerated. Duplicate it to create a revision.`;
}

/** Converting an ongoing quote to an invoice must not move it back to Won. */
export const quoteStatusAfterInvoiceConversion = (status: string | null): string =>
  status === "ongoing" ? "ongoing" : "won";

type Prefixes = { quote_prefix?: string | null; invoice_prefix?: string | null; proforma_prefix?: string | null; receipt_prefix?: string | null };
export const prefixFor = (type: DocType, s: Prefixes | null | undefined): string =>
  type === "invoice"
    ? s?.invoice_prefix ?? "INV-"
    : type === "proforma"
      ? s?.proforma_prefix ?? "PF-"
      : type === "receipt"
        ? s?.receipt_prefix ?? "RCPT-"
        : s?.quote_prefix ?? "1000-";

/** Amount-in-words is printed on billing docs (invoice + pro forma + receipt), not quotes. */
export const wordsForType = (type: string, grandTotal: number | null | undefined): string | null =>
  type === "quote" ? null : amountInWords(grandTotal);

/** The advance amount is only meaningful on a pro forma. */
export const advanceForType = (type: string, advance: number | null | undefined): number =>
  type === "proforma" ? Number(advance) || 0 : 0;

/** Default advance when generating a pro forma from a quote (50% of the total). */
export const defaultAdvance = (grandTotal: number | null | undefined): number =>
  +((Number(grandTotal) || 0) * 0.5).toFixed(2);

type InvoiceSourceAmounts = {
  type?: string | null;
  subtotal?: number | null;
  discount?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  grand_total?: number | null;
  advance_amount?: number | null;
};

/** A pro forma creates a tax invoice only for its VAT-inclusive advance. */
export function invoiceAmountsForSource(source: InvoiceSourceAmounts) {
  const vatRate = Math.max(Number(source.vat_rate) || 0, 0);
  if (source.type !== "proforma") {
    return {
      partial: false,
      subtotal: Number(source.subtotal) || 0,
      discount: Number(source.discount) || 0,
      vatRate,
      vatAmount: Number(source.vat_amount) || 0,
      grandTotal: Number(source.grand_total) || 0,
    };
  }

  const fullTotal = Math.max(Number(source.grand_total) || 0, 0);
  const grandTotal = +Math.min(Math.max(Number(source.advance_amount) || 0, 0), fullTotal).toFixed(2);
  const subtotal = +(grandTotal / (1 + vatRate / 100)).toFixed(2);
  return {
    partial: true,
    subtotal,
    discount: 0,
    vatRate,
    vatAmount: +(grandTotal - subtotal).toFixed(2),
    grandTotal,
  };
}

export function dependentDocumentDeleteError(documents: { type: string; number: string }[]): string | null {
  if (!documents.length) return null;
  const labels = documents.map((doc) => `${doc.type === "receipt" ? "Receipt" : doc.type === "invoice" ? "Tax Invoice" : doc.type === "proforma" ? "Pro Forma" : "Document"} ${doc.number}`);
  return `Delete the linked ${labels.join(", ")} first.`;
}

const money = (v: number | null | undefined) =>
  "AED " + Number(v ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The "Payment Acknowledgment" sentence printed on a receipt. */
export const paymentAcknowledgment = (
  method: string | null | undefined,
  amount: number | null | undefined,
  dateLabel?: string | null
): string => {
  const how = method === "cheque" ? "by Cheque" : "in Cash";
  return `We hereby confirm receipt of a payment ${how} amounting to ${money(amount)} (${amountInWords(amount)})${dateLabel ? ` on ${dateLabel}` : ""}.`;
};
