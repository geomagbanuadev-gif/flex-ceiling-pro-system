import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import { FinanceReportPdf } from "@/components/pdf/FinanceReportPdf";

export type FinanceExportData = {
  title: string;
  companyName: string;
  asOf: string;
  columns: { key: string; label: string; width: number; align?: "left" | "center" | "right"; money?: boolean }[];
  rows: { key: string; values: Record<string, string | number> }[];
  summary: [string, string][];
};

export const financeReportFilename = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "finance-report";
export const renderFinanceReportPdf = (report: FinanceExportData) => renderToBuffer(<FinanceReportPdf report={report} />);

export async function renderFinanceReportExcel(report: FinanceExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.companyName;
  const sheet = workbook.addWorksheet(report.title.slice(0, 31), { views: [{ state: "frozen", ySplit: 8, showGridLines: false }] });
  sheet.columns = report.columns.map((column) => ({ key: column.key, width: Math.max(12, Math.round(column.width / 5)) }));
  sheet.mergeCells(2, 1, 2, report.columns.length); sheet.getCell(2, 1).value = report.companyName; sheet.getCell(2, 1).font = { bold: true, size: 13, color: { argb: "FFB08D57" } };
  sheet.mergeCells(3, 1, 3, report.columns.length); sheet.getCell(3, 1).value = report.title; sheet.getCell(3, 1).font = { bold: true, size: 20, color: { argb: "FF0C2340" } };
  sheet.mergeCells(4, 1, 4, report.columns.length); sheet.getCell(4, 1).value = `As of ${report.asOf} · AED`; sheet.getCell(4, 1).font = { italic: true, color: { argb: "FF64748B" } };
  report.summary.forEach(([label, value], index) => { const cell = sheet.getCell(6, index + 1); cell.value = `${label}: ${value}`; cell.font = { bold: true, color: { argb: "FF0C2340" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F2EA" } }; });
  const header = sheet.getRow(8); header.values = report.columns.map((column) => column.label); header.height = 25; header.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C2340" } }; cell.alignment = { horizontal: "center" }; });
  const moneyKeys = new Set(["total", "received", "balance", "paid", "sales", "costs", "margin", "cash"]);
  report.rows.forEach((item, index) => { const row = sheet.addRow(report.columns.map((column) => { const value = item.values[column.key] ?? "-"; return moneyKeys.has(column.key) && typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) || 0 : value; })); row.height = 21; report.columns.forEach((column, columnIndex) => { if (column.money || moneyKeys.has(column.key)) { row.getCell(columnIndex + 1).numFmt = '"AED" #,##0.00;[Red]-"AED" #,##0.00'; row.getCell(columnIndex + 1).alignment = { horizontal: "right" }; } }); if (index % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF8FC" } }; }); });
  sheet.autoFilter = { from: { row: 8, column: 1 }, to: { row: Math.max(8, 8 + report.rows.length), column: report.columns.length } };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
