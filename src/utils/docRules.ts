// Pure, type-dependent document rules shared by the server actions — extracted
// so the document behaviour (pro forma / tax invoice / receipt) is unit-testable.
import { amountInWords } from "./amountInWords";

export type DocType = "quote" | "invoice" | "proforma" | "receipt";

const QUOTE_STATUSES = ["draft", "sent", "won", "ongoing", "lost"];
const INVOICE_STATUSES = ["draft", "sent", "paid", "lost"];
const PROFORMA_STATUSES = ["draft", "sent", "ongoing", "paid", "lost"];
const RECEIPT_STATUSES = ["draft", "issued"];
// Ongoing tracks accepted work on quotes and pro formas, not payment on invoices.
export const statusesFor = (type: string): string[] =>
  type === "quote" ? QUOTE_STATUSES : type === "proforma" ? PROFORMA_STATUSES : type === "receipt" ? RECEIPT_STATUSES : INVOICE_STATUSES;

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
