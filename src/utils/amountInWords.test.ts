import { describe, it, expect } from "vitest";
import { amountInWords } from "./amountInWords";

describe("amountInWords", () => {
  it("writes the AL SHUAA grand total with fils", () => {
    expect(amountInWords(8846.25)).toBe(
      "EIGHT THOUSAND EIGHT HUNDRED FORTY-SIX DIRHAMS AND TWENTY-FIVE FILS ONLY"
    );
  });

  it("handles zero and singular dirham", () => {
    expect(amountInWords(0)).toBe("ZERO DIRHAMS ONLY");
    expect(amountInWords(1)).toBe("ONE DIRHAM ONLY");
  });

  it("handles round hundreds and thousands", () => {
    expect(amountInWords(100)).toBe("ONE HUNDRED DIRHAMS ONLY");
    expect(amountInWords(1575)).toBe("ONE THOUSAND FIVE HUNDRED SEVENTY-FIVE DIRHAMS ONLY");
  });

  it("writes fils-only amounts", () => {
    expect(amountInWords(0.5)).toBe("ZERO DIRHAMS AND FIFTY FILS ONLY");
  });

  it("treats null/undefined as zero", () => {
    expect(amountInWords(null)).toBe("ZERO DIRHAMS ONLY");
    expect(amountInWords(undefined)).toBe("ZERO DIRHAMS ONLY");
  });
});
