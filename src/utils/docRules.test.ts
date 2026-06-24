import { describe, it, expect } from "vitest";
import { statusesFor, prefixFor, wordsForType, advanceForType, defaultAdvance, paymentAcknowledgment } from "./docRules";

describe("statusesFor", () => {
  it("quotes use won/lost; billing docs use paid; receipts use issued", () => {
    expect(statusesFor("quote")).toContain("won");
    expect(statusesFor("quote")).not.toContain("paid");
    expect(statusesFor("invoice")).toContain("paid");
    expect(statusesFor("proforma")).toContain("paid");
    expect(statusesFor("proforma")).not.toContain("won");
    expect(statusesFor("receipt")).toEqual(["draft", "issued"]);
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
