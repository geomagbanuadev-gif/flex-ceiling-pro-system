import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { renderSalesReportExcel, renderSalesReportPdf, type SalesReportFileData } from "./salesReportFiles";

const report: SalesReportFileData = {
  name: "August sales",
  companyName: "FlexCeiling Pro",
  currency: "AED",
  dateFrom: "2026-08-01",
  dateTo: "2026-08-31",
  statusLabel: "Sent & paid",
  snapshot: {
    generatedAt: "2026-09-23T10:00:00.000Z",
    rows: [{ id: "1", number: "INV-0159", status: "paid", doc_date: "2026-08-31", client_name: "RIWAQ DECORATION", subtotal: 3300, discount: 0, vat_amount: 0, grand_total: 3300 }],
    totals: { invoiceCount: 1, subtotal: 3300, discount: 0, vatAmount: 0, grandTotal: 3300 },
  },
};

describe("sales report files", () => {
  it("creates a readable Excel report with the expected title and invoice", async () => {
    const bytes = await renderSalesReportExcel(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    const sheet = workbook.getWorksheet("Sales Report");

    expect(sheet?.getCell("A3").value).toBe("Sales Invoice Report");
    expect(sheet?.getCell("A11").value).toBe("INV-0159");
    expect(sheet?.getCell("I11").value).toBe(3300);
  });

  it("creates a PDF report", async () => {
    const bytes = await renderSalesReportPdf(report);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  });
});
