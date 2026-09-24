import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { renderFinanceReportExcel, renderFinanceReportPdf, type FinanceExportData } from "./financeReportFiles";

const report: FinanceExportData = {
  title: "Accounts Receivable Report",
  companyName: "FlexCeiling Pro",
  asOf: "24 Sep 2026",
  columns: [{ key: "number", label: "Invoice", width: 70 }, { key: "balance", label: "Balance", width: 70, align: "right", money: true }],
  rows: [{ key: "1", values: { number: "INV-0162", balance: 315 } }],
  summary: [["Invoices", "1"], ["Balance", "AED 315.00"]],
};

describe("finance report files", () => {
  it("creates a readable Excel report", async () => {
    const bytes = await renderFinanceReportExcel(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    const sheet = workbook.getWorksheet("Accounts Receivable Report");
    expect(sheet?.getCell("A3").value).toBe("Accounts Receivable Report");
    expect(sheet?.getCell("A9").value).toBe("INV-0162");
    expect(sheet?.getCell("B9").value).toBe(315);
  });

  it("creates a PDF report", async () => {
    const bytes = await renderFinanceReportPdf(report);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  });
});
