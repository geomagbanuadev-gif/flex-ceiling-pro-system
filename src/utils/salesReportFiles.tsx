import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import { SalesReportDocument } from "@/components/pdf/SalesReportPdf";
import { fmtDate } from "@/utils/format";
import type { SalesSnapshot } from "@/utils/salesReport";

export type SalesReportFileData = {
  name: string;
  companyName: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  statusLabel: string;
  snapshot: SalesSnapshot;
};

const NAVY = "0C2340";
const GOLD = "B08D57";
const CYAN = "D7F1FB";
const BORDER = "D8DEE9";

export const salesReportFilename = (name: string) =>
  name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "sales-invoice-report";

export const renderSalesReportPdf = (report: SalesReportFileData) =>
  renderToBuffer(<SalesReportDocument report={report} />);

const excelDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export async function renderSalesReportExcel(report: SalesReportFileData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = report.companyName;
  workbook.created = new Date(report.snapshot.generatedAt);
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheet = workbook.addWorksheet("Sales Report", {
    views: [{ state: "frozen", ySplit: 10, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 } },
  });
  sheet.properties.defaultRowHeight = 20;
  sheet.columns = [
    { key: "number", width: 15 }, { key: "type", width: 11 }, { key: "status", width: 12 }, { key: "date", width: 15 },
    { key: "client", width: 52 }, { key: "subtotal", width: 18 }, { key: "discount", width: 16 }, { key: "vat", width: 16 }, { key: "total", width: 18 },
  ];

  sheet.mergeCells("A2:I2");
  sheet.getCell("A2").value = report.companyName;
  sheet.getCell("A2").font = { name: "Arial", size: 14, bold: true, color: { argb: `FF${GOLD}` } };
  sheet.mergeCells("A3:I3");
  sheet.getCell("A3").value = "Sales Invoice Report";
  sheet.getCell("A3").font = { name: "Arial", size: 20, bold: true, color: { argb: `FF${NAVY}` } };
  sheet.mergeCells("A4:I4");
  sheet.getCell("A4").value = `${fmtDate(report.dateFrom)} - ${fmtDate(report.dateTo)} · ${report.currency} · ${report.statusLabel}`;
  sheet.getCell("A4").font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };
  sheet.getRow(5).height = 2;
  for (let col = 1; col <= 9; col++) sheet.getRow(5).getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GOLD}` } };

  const summaryGroups = [["A", "B", "Invoices"], ["C", "D", "Subtotal"], ["E", "F", "Discount"], ["G", "H", "VAT"], ["I", "I", "Grand total"]];
  for (const [start, end, label] of summaryGroups) {
    if (start !== end) {
      sheet.mergeCells(`${start}7:${end}7`);
      sheet.mergeCells(`${start}8:${end}8`);
    }
    const labelCell = sheet.getCell(`${start}7`);
    labelCell.value = label;
    labelCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF665745" } };
    labelCell.alignment = { horizontal: "center", vertical: "middle" };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F2EA" } };
    const valueCell = sheet.getCell(`${start}8`);
    valueCell.font = { name: "Arial", size: 12, bold: true, color: { argb: `FF${NAVY}` } };
    valueCell.alignment = { horizontal: "center", vertical: "middle" };
  }
  for (let row = 7; row <= 8; row++) for (let col = 1; col <= 9; col++) sheet.getRow(row).getCell(col).border = {
    top: { style: "thin", color: { argb: `FF${BORDER}` } }, bottom: { style: "thin", color: { argb: `FF${BORDER}` } },
    left: { style: "thin", color: { argb: `FF${BORDER}` } }, right: { style: "thin", color: { argb: `FF${BORDER}` } },
  };
  sheet.getRow(7).height = 24;
  sheet.getRow(8).height = 28;

  const headers = ["Number", "Type", "Status", "Date", "Client", "Subtotal", "Discount", "VAT", "Grand Total"];
  sheet.getRow(10).values = headers;
  sheet.getRow(10).height = 28;
  sheet.getRow(10).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { right: { style: "thin", color: { argb: "FFFFFFFF" } } };
  });

  const dataStart = 11;
  report.snapshot.rows.forEach((item, index) => {
    const row = sheet.getRow(dataStart + index);
    row.values = [item.number, "invoice", item.status, excelDate(item.doc_date), item.client_name || "-", item.subtotal, item.discount, item.vat_amount, item.grand_total];
    row.height = 22;
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, color: { argb: "FF172033" } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF56BCE8" } } };
      if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${CYAN}` } };
    });
    row.getCell(3).font = { name: "Arial", size: 10, color: { argb: item.status === "paid" ? "FF07834A" : "FF334155" } };
    row.getCell(4).numFmt = "d mmm yyyy";
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    for (let col = 6; col <= 9; col++) {
      row.getCell(col).numFmt = "#,##0.00;[Red]-#,##0.00;-";
      row.getCell(col).alignment = { horizontal: "right", vertical: "middle" };
    }
  });

  const dataEnd = dataStart + report.snapshot.rows.length - 1;
  const totalRow = Math.max(dataStart, dataEnd + 1);
  sheet.getCell(`E${totalRow}`).value = "TOTAL";
  sheet.getCell(`E${totalRow}`).font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${NAVY}` } };
  const totals = [report.snapshot.totals.subtotal, report.snapshot.totals.discount, report.snapshot.totals.vatAmount, report.snapshot.totals.grandTotal];
  ["F", "G", "H", "I"].forEach((column, index) => {
    const cell = sheet.getCell(`${column}${totalRow}`);
    cell.value = report.snapshot.rows.length ? { formula: `SUM(${column}${dataStart}:${column}${dataEnd})`, result: totals[index] } : totals[index];
    cell.numFmt = "#,##0.00;[Red]-#,##0.00;-";
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${NAVY}` } };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  });
  for (let col = 5; col <= 9; col++) sheet.getRow(totalRow).getCell(col).border = {
    top: { style: "medium", color: { argb: `FF${GOLD}` } },
    bottom: { style: "double", color: { argb: `FF${NAVY}` } },
  };

  const moneyFormat = `"${report.currency.replace(/"/g, "")}" #,##0.00`;
  sheet.getCell("A8").value = report.snapshot.totals.invoiceCount;
  sheet.getCell("A8").numFmt = "0";
  [["C8", `F${totalRow}`, totals[0]], ["E8", `G${totalRow}`, totals[1]], ["G8", `H${totalRow}`, totals[2]], ["I8", `I${totalRow}`, totals[3]]].forEach(([target, source, result]) => {
    const cell = sheet.getCell(String(target));
    cell.value = { formula: String(source), result: Number(result) };
    cell.numFmt = moneyFormat;
  });

  const footerRow = totalRow + 3;
  sheet.mergeCells(`A${footerRow}:I${footerRow}`);
  sheet.getCell(`A${footerRow}`).value = `Source: FlexCeiling Pro tax invoice records. Generated ${fmtDate(report.snapshot.generatedAt)}.`;
  sheet.getCell(`A${footerRow}`).font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
  sheet.autoFilter = { from: "A10", to: `I${Math.max(10, dataEnd)}` };
  sheet.pageSetup.printArea = `A1:I${footerRow}`;
  sheet.pageSetup.printTitlesRow = "10:10";
  sheet.headerFooter.oddFooter = "&LFlexCeiling Pro&CPage &P of &N&RGenerated &D";

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
