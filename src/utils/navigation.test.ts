import { describe, expect, it } from "vitest";
import { safeDocumentListPath } from "./navigation";

describe("safeDocumentListPath", () => {
  it("keeps document filters without accepting another destination", () => {
    expect(safeDocumentListPath("/quotes?type=invoice&q=INV-0163&page=2", "/quotes")).toBe("/quotes?type=invoice&q=INV-0163&page=2");
    expect(safeDocumentListPath("//example.com", "/quotes?type=invoice")).toBe("/quotes?type=invoice");
    expect(safeDocumentListPath("/quotes-other", "/quotes")).toBe("/quotes");
  });
});
