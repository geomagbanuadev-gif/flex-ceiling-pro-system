import type { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canSeeInvoices, getProfile } from "@/utils/profile";
import { loadSalesSnapshot } from "../data";
import { SALES_STATUS_LABELS, normalizeSalesStatus } from "@/utils/salesReport";
import { renderSalesReportExcel, renderSalesReportPdf, salesReportFilename, type SalesReportFileData } from "@/utils/salesReportFiles";

export const runtime = "nodejs";

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf());

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile?.active || !canSeeInvoices(profile.role)) return new Response("Unauthorized", { status: 401 });

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!validDate(from) || !validDate(to) || from > to) return new Response("Invalid report date range", { status: 400 });

  const status = normalizeSalesStatus(req.nextUrl.searchParams.get("status") ?? "active");
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "xlsx") return new Response("Unsupported report format", { status: 400 });

  const supabase = await createClient();
  const [snapshot, settingsRes] = await Promise.all([
    loadSalesSnapshot({ from, to }, status),
    supabase.from("company_settings").select("legal_name, bank_currency").eq("id", 1).maybeSingle(),
  ]);
  const report: SalesReportFileData = {
    name: `Sales Invoice Report ${from} to ${to}`,
    companyName: settingsRes.data?.legal_name || "FLEXCEILING PRO SOLUTIONS FZ LLC",
    currency: settingsRes.data?.bank_currency || "AED",
    dateFrom: from,
    dateTo: to,
    statusLabel: SALES_STATUS_LABELS[status],
    snapshot,
  };
  const filename = salesReportFilename(report.name);

  if (format === "xlsx") {
    const file = await renderSalesReportExcel(report);
    return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
  }

  const file = await renderSalesReportPdf(report);
  const disposition = req.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
}
