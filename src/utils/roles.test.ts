import { describe, it, expect } from "vitest";
import { canSeeQuotes, canSeeInvoices, canSeeProformas, canSeeReceipts, canAccessType, type Role } from "./roles";

const ROLES: Role[] = ["super", "staff", "quotes", "invoices"];

describe("role access helpers", () => {
  it("quotes visibility", () => {
    expect(ROLES.filter(canSeeQuotes)).toEqual(["super", "staff", "quotes"]);
  });
  it("invoices visibility", () => {
    expect(ROLES.filter(canSeeInvoices)).toEqual(["super", "staff", "invoices"]);
  });
  it("pro forma visibility matches invoices group", () => {
    expect(ROLES.filter(canSeeProformas)).toEqual(["super", "staff", "invoices"]);
  });
  it("receipt visibility matches invoices group", () => {
    expect(ROLES.filter(canSeeReceipts)).toEqual(["super", "staff", "invoices"]);
  });
});

describe("canAccessType matrix", () => {
  it("super and staff can access every type", () => {
    for (const type of ["quote", "invoice", "proforma", "receipt"] as const) {
      expect(canAccessType("super", type)).toBe(true);
      expect(canAccessType("staff", type)).toBe(true);
    }
  });

  it("quotes role: quotes only", () => {
    expect(canAccessType("quotes", "quote")).toBe(true);
    expect(canAccessType("quotes", "invoice")).toBe(false);
    expect(canAccessType("quotes", "proforma")).toBe(false);
    expect(canAccessType("quotes", "receipt")).toBe(false);
  });

  it("invoices role: tax invoices + pro formas + receipts, not quotes", () => {
    expect(canAccessType("invoices", "quote")).toBe(false);
    expect(canAccessType("invoices", "invoice")).toBe(true);
    expect(canAccessType("invoices", "proforma")).toBe(true);
    expect(canAccessType("invoices", "receipt")).toBe(true);
  });
});
