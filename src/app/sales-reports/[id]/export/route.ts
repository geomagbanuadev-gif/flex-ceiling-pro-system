import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canSeeInvoices, getProfile } from "@/utils/profile";
import { SALES_STATUS_LABELS, normalizeSalesStatus, type SalesRow, type SalesSnapshot } from "@/utils/salesReport";
import { renderSalesReportExcel, renderSalesReportPdf, salesReportFilename, type SalesReportFileData } from "@/utils/salesReportFiles";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile?.active || !canSeeInvoices(profile.role)) return new Response("Unauthorized", { status: 401 });

  const [reportRes, settingsRes] = await Promise.all([
    supabase.from("sales_reports").select("*").eq("id", id).maybeSingle(),
    supabase.from("company_settings").select("legal_name, bank_currency").eq("id", 1).maybeSingle(),
  ]);
  const report = reportRes.data;
  if (!report) return new Response("Sales report not found", { status: 404 });

  const rows = (Array.isArray(report.invoice_rows) ? report.invoice_rows : []) as SalesRow[];
  const snapshot: SalesSnapshot = {
    generatedAt: report.created_at,
    rows,
    totals: { invoiceCount: Number(report.invoice_count ?? rows.length), subtotal: Number(report.subtotal ?? 0), discount: Number(report.discount ?? 0), vatAmount: Number(report.vat_amount ?? 0), grandTotal: Number(report.grand_total ?? 0) },
  };
  const status = normalizeSalesStatus(report.status_filter);
  const fileData: SalesReportFileData = {
    name: report.name || "Sales Invoice Report",
    companyName: settingsRes.data?.legal_name || "FLEXCEILING PRO SOLUTIONS FZ LLC",
    currency: settingsRes.data?.bank_currency || "AED",
    dateFrom: report.date_from,
    dateTo: report.date_to,
    statusLabel: SALES_STATUS_LABELS[status],
    snapshot,
  };
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  const filename = salesReportFilename(fileData.name);

  if (format === "xlsx") {
    const file = await renderSalesReportExcel(fileData);
    return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
  }
  if (format !== "pdf") return new Response("Unsupported report format", { status: 400 });

  const file = await renderSalesReportPdf(fileData);
  const disposition = req.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
}
