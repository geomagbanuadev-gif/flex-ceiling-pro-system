import { describe, it, expect } from "vitest";
import { statusesFor, quoteStatusAfterInvoiceConversion, prefixFor, wordsForType, advanceForType, defaultAdvance, paymentAcknowledgment, invoiceAmountsForSource, dependentDocumentDeleteError, canRegenerateGeneratedDocument, regenerationBlockedMessage, allowedStatusTransitions, canModifyDocument } from "./docRules";

describe("statusesFor", () => {
  it("allows ongoing only for quotes and pro formas", () => {
    expect(statusesFor("quote")).toEqual(["draft", "sent", "won", "ongoing", "lost"]);
    expect(statusesFor("proforma")).toEqual(["draft", "sent", "ongoing", "paid", "lost"]);
    expect(statusesFor("invoice")).toEqual(["draft", "sent", "paid", "lost"]);
    expect(statusesFor("receipt")).toEqual(["draft", "issued", "void"]);
  });
});

describe("generated document safety", () => {
  it("allows regeneration only while the generated record is draft", () => {
    expect(canRegenerateGeneratedDocument("draft")).toBe(true);
    expect(canRegenerateGeneratedDocument("sent")).toBe(false);
    expect(canRegenerateGeneratedDocument("paid")).toBe(false);
    expect(canRegenerateGeneratedDocument("issued")).toBe(false);
    expect(regenerationBlockedMessage("receipt", "issued")).toContain("Only a draft receipt");
  });

  it("lets invoices return to draft while keeping other billing records protected", () => {
    expect(allowedStatusTransitions("invoice", "sent")).toContain("draft");
    expect(allowedStatusTransitions("invoice", "paid")).toEqual(["draft", "sent", "paid", "lost"]);
    expect(allowedStatusTransitions("receipt", "issued")).toEqual(["issued", "void"]);
    expect(allowedStatusTransitions("receipt", "void")).toEqual(["void"]);
  });

  it("allows billing documents to be edited or deleted only while draft", () => {
    expect(canModifyDocument("invoice", "draft")).toBe(true);
    expect(canModifyDocument("invoice", "paid")).toBe(false);
    expect(canModifyDocument("receipt", "issued")).toBe(false);
    expect(canModifyDocument("quote", "won")).toBe(true);
  });
});

describe("quoteStatusAfterInvoiceConversion", () => {
  it("preserves work already ongoing and otherwise marks the quote won", () => {
    expect(quoteStatusAfterInvoiceConversion("ongoing")).toBe("ongoing");
    expect(quoteStatusAfterInvoiceConversion("sent")).toBe("won");
  });
});

describe("prefixFor", () => {
  it("uses configured prefixes", () => {
    const s = { quote_prefix: "Q-", invoice_prefix: "INV-", proforma_prefix: "PF-", receipt_prefix: "RC-" };
    expect(prefixFor("quote", s)).toBe("Q-");
    expect(prefixFor("invoice", s)).toBe("INV-");
    expect(prefixFor("proforma", s)).toBe("PF-");
    expect(prefixFor("receipt", s)).toBe("RC-");
  });
  it("falls back to defaults when settings are missing", () => {
    expect(prefixFor("quote", null)).toBe("1000-");
    expect(prefixFor("invoice", {})).toBe("INV-");
    expect(prefixFor("proforma", undefined)).toBe("PF-");
    expect(prefixFor("receipt", {})).toBe("RCPT-");
  });
});

describe("paymentAcknowledgment", () => {
  it("describes a cash payment with amount + words + date", () => {
    const ack = paymentAcknowledgment("cash", 7467.6, "May 19, 2026");
    expect(ack).toContain("in Cash");
    expect(ack).toContain("AED 7,467.60");
    expect(ack).toContain("SEVEN THOUSAND FOUR HUNDRED SIXTY-SEVEN DIRHAMS AND SIXTY FILS ONLY");
    expect(ack).toContain("on May 19, 2026");
  });
  it("describes a cheque payment", () => {
    expect(paymentAcknowledgment("cheque", 1000)).toContain("by Cheque");
  });
});

describe("wordsForType", () => {
  it("prints amount-in-words for billing docs, not quotes", () => {
    expect(wordsForType("quote", 8846.25)).toBeNull();
    expect(wordsForType("invoice", 8846.25)).toContain("DIRHAM");
    expect(wordsForType("proforma", 8846.25)).toContain("DIRHAM");
  });
});

describe("advanceForType", () => {
  it("keeps an advance only for pro formas", () => {
    expect(advanceForType("proforma", 4646.25)).toBe(4646.25);
    expect(advanceForType("invoice", 4646.25)).toBe(0);
    expect(advanceForType("quote", 4646.25)).toBe(0);
    expect(advanceForType("proforma", null)).toBe(0);
  });
});

describe("defaultAdvance", () => {
  it("is 50% of the grand total", () => {
    expect(defaultAdvance(8000)).toBe(4000);
    expect(defaultAdvance(8846.5)).toBe(4423.25);
    expect(defaultAdvance(0)).toBe(0);
    expect(defaultAdvance(null)).toBe(0);
  });
});

describe("invoiceAmountsForSource", () => {
  it("converts a pro forma advance into a VAT-inclusive partial tax invoice", () => {
    expect(invoiceAmountsForSource({
      type: "proforma",
      subtotal: 27145,
      discount: 0,
      vat_rate: 5,
      vat_amount: 1357.25,
      grand_total: 28502.25,
      advance_amount: 14251.13,
    })).toEqual({
      partial: true,
      subtotal: 13572.5,
      discount: 0,
      vatRate: 5,
      vatAmount: 678.63,
      grandTotal: 14251.13,
    });
  });

  it("keeps quotation totals unchanged", () => {
    expect(invoiceAmountsForSource({
      type: "quote",
      subtotal: 1000,
      discount: 50,
      vat_rate: 5,
      vat_amount: 47.5,
      grand_total: 997.5,
      advance_amount: null,
    })).toEqual({
      partial: false,
      subtotal: 1000,
      discount: 50,
      vatRate: 5,
      vatAmount: 47.5,
      grandTotal: 997.5,
    });
  });
});

describe("dependentDocumentDeleteError", () => {
  it("explains which generated document must be removed first", () => {
    expect(dependentDocumentDeleteError([
      { type: "receipt", number: "RCPT-0125" },
    ])).toBe("Delete the linked Receipt RCPT-0125 first.");
  });

  it("allows deletion when there are no generated records", () => {
    expect(dependentDocumentDeleteError([])).toBeNull();
  });
});
