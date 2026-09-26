import { describe, expect, it } from "vitest";
import { bankPartyMatches, bankTimeFromDescription, parseBankTarget, remainingBankAmount } from "./bank";

describe("bank reconciliation helpers", () => {
  it("accepts only a supported target with a UUID", () => {
    expect(parseBankTarget("receipt:123e4567-e89b-42d3-a456-426614174000:suggested")).toEqual({
      type: "receipt", id: "123e4567-e89b-42d3-a456-426614174000", suggested: true,
    });
    expect(parseBankTarget("receipt:123e4567-e89b-42d3-a456-426614174000")?.suggested).toBe(false);
    expect(parseBankTarget("invoice:123e4567-e89b-42d3-a456-426614174000")).toBeNull();
    expect(parseBankTarget("receipt:not-a-uuid")).toBeNull();
  });

  it("only treats a recognizable party name as a name match", () => {
    expect(bankPartyMatches("SAVING ENERGY TECHNICAL SERVICES", "Saving Energy Technical Services LLC")).toBe(true);
    expect(bankPartyMatches("ALEX PABABAER", "Saving Energy Technical Services LLC")).toBe(false);
    expect(bankPartyMatches(null, "Saving Energy Technical Services LLC")).toBe(false);
  });

  it("rounds remaining money without returning a negative balance", () => {
    expect(remainingBankAmount(100, 20.005)).toBe(80);
    expect(remainingBankAmount(100, 110)).toBe(0);
  });

  it("shows only a real bank-provided time", () => {
    expect(bankTimeFromDescription("ATM CASH DEPOSIT 01-07-2026 19:24")).toBe("19:24");
    expect(bankTimeFromDescription("AANI FROM CLIENT")).toBe("");
  });
});
