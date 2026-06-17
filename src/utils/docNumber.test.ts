import { describe, it, expect } from "vitest";
import { nextDocNumber } from "./docNumber";

describe("nextDocNumber", () => {
  it("starts at 0001 when there are none", () => {
    expect(nextDocNumber([], "PF-")).toBe("PF-0001");
    expect(nextDocNumber([], "INV-")).toBe("INV-0001");
  });

  it("returns the next after the highest, regardless of order", () => {
    expect(nextDocNumber(["PF-0006", "PF-0010", "PF-0003"], "PF-")).toBe("PF-0011");
    expect(nextDocNumber(["1000-0095", "1000-0011"], "1000-")).toBe("1000-0096");
    expect(nextDocNumber(["INV-0011"], "INV-")).toBe("INV-0012");
  });

  it("ignores nulls and non-numeric entries", () => {
    expect(nextDocNumber([null, undefined, "abc", "PF-0002"], "PF-")).toBe("PF-0003");
  });

  it("pads to four digits and rolls past them", () => {
    expect(nextDocNumber(["INV-0099"], "INV-")).toBe("INV-0100");
    expect(nextDocNumber(["INV-9999"], "INV-")).toBe("INV-10000");
  });
});
