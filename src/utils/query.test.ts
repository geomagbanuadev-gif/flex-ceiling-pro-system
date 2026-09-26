import { describe, expect, it } from "vitest";
import { dateQueryParam, postgrestSearchTerm, uuidQueryParam } from "./query";

describe("query parameter safety", () => {
  it("accepts UUIDs and ignores malformed UUID filters", () => {
    expect(uuidQueryParam("d15b2fde-6954-48c2-8076-4753c73339b0")).toBe("d15b2fde-6954-48c2-8076-4753c73339b0");
    expect(uuidQueryParam("bad")).toBe("");
  });

  it("removes PostgREST filter control characters from search text", () => {
    expect(postgrestSearchTerm("fuel,(draft)'\"")).toBe("fuel  draft");
  });

  it("accepts real ISO dates and ignores malformed date filters", () => {
    expect(dateQueryParam("2026-09-26")).toBe("2026-09-26");
    expect(dateQueryParam("2026-02-31")).toBe("");
  });
});
