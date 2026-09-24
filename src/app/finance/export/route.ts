import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { loadFinanceWorkspace } from "../data";
import { financeReportFilename, renderFinanceReportExcel, renderFinanceReportPdf, type FinanceExportData } from "@/utils/financeReportFiles";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) return new Response("Unauthorized", { status: 401 });
  const kind = request.nextUrl.searchParams.get("report");
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (!["receivables", "payables", "expenses", "projects"].includes(kind ?? "") || !["pdf", "xlsx"].includes(format)) return new Response("Invalid report", { status: 400 });
  const { receivables, payables, expenseRows, projectRows } = await loadFinanceWorkspace();
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const aging = request.nextUrl.searchParams.get("aging") ?? "";
  const source = request.nextUrl.searchParams.get("source") ?? "";
  const receivableRows = receivables.filter((row) => (!state || row.state === state) && (!aging || row.aging === aging));
  const payableRows = payables.filter((row) => (!state || row.state === state) && (!aging || row.aging === aging) && (!source || row.source === source));
  const supabase = await createClient();
  const { data: settings } = await supabase.from("company_settings").select("legal_name").eq("id", 1).maybeSingle();
  const companyName = settings?.legal_name || "FLEXCEILING PRO SOLUTIONS FZ LLC";
  const asOf = fmtDate(new Date().toISOString().slice(0, 10));
  let report: FinanceExportData;
  if (kind === "receivables") {
    report = { title: "Accounts Receivable Report", companyName, asOf, columns: [{ key: "number", label: "Invoice", width: 62 }, { key: "client", label: "Client", width: 130 }, { key: "project", label: "Project", width: 100 }, { key: "date", label: "Date", width: 65, align: "center" }, { key: "due", label: "Due date", width: 75, align: "center" }, { key: "aging", label: "Aging", width: 60 }, { key: "total", label: "Total", width: 72, align: "right" }, { key: "received", label: "Received", width: 72, align: "right" }, { key: "balance", label: "Balance", width: 72, align: "right" }], rows: receivableRows.map((row) => ({ key: row.id, values: { number: row.number, client: row.client, project: row.project, date: fmtDate(row.invoiceDate), due: row.dueDate ? fmtDate(row.dueDate) : "Not set", aging: row.aging.replaceAll("-", " "), total: money2(row.total), received: money2(row.received), balance: money2(row.balance) } })), summary: [["Invoices", String(receivableRows.length)], ["Total", money2(receivableRows.reduce((sum, row) => sum + row.total, 0))], ["Received", money2(receivableRows.reduce((sum, row) => sum + row.received, 0))], ["Balance", money2(receivableRows.reduce((sum, row) => sum + row.balance, 0))]] };
  } else if (kind === "payables") {
    report = { title: "Accounts Payable Report", companyName, asOf, columns: [{ key: "source", label: "Source", width: 70 }, { key: "number", label: "Reference", width: 95 }, { key: "payee", label: "Supplier / payee", width: 120 }, { key: "project", label: "Project", width: 95 }, { key: "date", label: "Date", width: 65, align: "center" }, { key: "due", label: "Due date", width: 70, align: "center" }, { key: "total", label: "Total", width: 70, align: "right" }, { key: "paid", label: "Paid", width: 70, align: "right" }, { key: "balance", label: "Balance", width: 70, align: "right" }], rows: payableRows.map((row) => ({ key: `${row.source}-${row.id}`, values: { source: row.source, number: row.number, payee: row.payee, project: row.project, date: fmtDate(row.date), due: row.dueDate ? fmtDate(row.dueDate) : "Not set", total: money2(row.total), paid: money2(row.paid), balance: money2(row.balance) } })), summary: [["Records", String(payableRows.length)], ["Total", money2(payableRows.reduce((sum, row) => sum + row.total, 0))], ["Paid", money2(payableRows.reduce((sum, row) => sum + row.paid, 0))], ["Balance", money2(payableRows.reduce((sum, row) => sum + row.balance, 0))]] };
  } else if (kind === "expenses") {
    report = { title: "Expense Report", companyName, asOf, columns: [{ key: "date", label: "Date", width: 65 }, { key: "description", label: "Description", width: 150 }, { key: "payee", label: "Payee", width: 105 }, { key: "project", label: "Project", width: 105 }, { key: "status", label: "Status", width: 60 }, { key: "total", label: "Total", width: 75, align: "right" }, { key: "paid", label: "Paid", width: 75, align: "right" }, { key: "balance", label: "Balance", width: 75, align: "right" }], rows: expenseRows.map((row) => ({ key: row.id, values: { date: fmtDate(row.date), description: row.description, payee: row.payee, project: row.project, status: row.status, total: money2(row.total), paid: money2(row.paid), balance: money2(row.balance) } })), summary: [["Expenses", String(expenseRows.length)], ["Total", money2(expenseRows.reduce((sum, row) => sum + row.total, 0))], ["Paid", money2(expenseRows.reduce((sum, row) => sum + row.paid, 0))], ["Balance", money2(expenseRows.reduce((sum, row) => sum + row.balance, 0))]] };
  } else {
    report = { title: "Project Profitability Report", companyName, asOf, columns: [{ key: "project", label: "Project", width: 125 }, { key: "client", label: "Client", width: 125 }, { key: "sales", label: "Net sales", width: 78, align: "right" }, { key: "costs", label: "Costs", width: 78, align: "right" }, { key: "received", label: "Received", width: 78, align: "right" }, { key: "paid", label: "Paid", width: 78, align: "right" }, { key: "margin", label: "Margin", width: 78, align: "right" }, { key: "cash", label: "Net cash", width: 78, align: "right" }], rows: projectRows.map((row) => ({ key: row.id, values: { project: row.name, client: row.client, sales: money2(row.netSales), costs: money2(row.costs), received: money2(row.received), paid: money2(row.paid), margin: money2(row.margin), cash: money2(row.netCash) } })), summary: [["Projects", String(projectRows.length)], ["Net sales", money2(projectRows.reduce((sum, row) => sum + row.netSales, 0))], ["Costs", money2(projectRows.reduce((sum, row) => sum + row.costs, 0))], ["Margin", money2(projectRows.reduce((sum, row) => sum + row.margin, 0))]] };
  }
  const name = financeReportFilename(report.title);
  if (format === "xlsx") { const file = await renderFinanceReportExcel(report); return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } }); }
  const file = await renderFinanceReportPdf(report); return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"` } });
}
