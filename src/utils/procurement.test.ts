import { describe, it, expect } from "vitest";
import { paymentStatus, balanceOwed, PO_STATUSES } from "./procurement";

describe("paymentStatus", () => {
  it("unpaid when nothing paid", () => {
    expect(paymentStatus(1000, 0)).toBe("unpaid");
    expect(paymentStatus(1000, null)).toBe("unpaid");
  });
  it("partial when some paid", () => {
    expect(paymentStatus(1000, 400)).toBe("partial");
  });
  it("paid when fully (or over) paid", () => {
    expect(paymentStatus(1000, 1000)).toBe("paid");
    expect(paymentStatus(1000, 1200)).toBe("paid");
  });
});

describe("balanceOwed", () => {
  it("is grand total minus paid", () => {
    expect(balanceOwed(1000, 400)).toBe(600);
    expect(balanceOwed(1000, 0)).toBe(1000);
    expect(balanceOwed(1000, 1000)).toBe(0);
  });
});

describe("PO_STATUSES", () => {
  it("covers the lifecycle", () => {
    expect(PO_STATUSES).toEqual(["draft", "ordered", "partial", "received", "cancelled"]);
  });
});
