"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canSeeInvoices, getProfile } from "@/utils/profile";
import { fmtDate } from "@/utils/format";
import { loadSalesSnapshot } from "./data";
import { normalizeSalesPeriod, normalizeSalesStatus } from "@/utils/salesReport";

const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export async function saveSalesReport(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getProfile();
  if (!user || !profile?.active || !canSeeInvoices(profile.role)) throw new Error("Not authorized to save sales reports");

  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!isDate(from) || !isDate(to) || from > to) throw new Error("Invalid report date range");

  const period = normalizeSalesPeriod(String(formData.get("period") ?? "custom"));
  const status = normalizeSalesStatus(String(formData.get("status") ?? "active"));
  const requestedName = String(formData.get("name") ?? "").trim();
  const name = (requestedName || `Sales Report — ${fmtDate(from)} to ${fmtDate(to)}`).slice(0, 120);
  const snapshot = await loadSalesSnapshot({ from, to }, status);

  const { data, error } = await supabase.from("sales_reports").insert({
    name,
    period_type: period,
    date_from: from,
    date_to: to,
    status_filter: status,
    invoice_count: snapshot.totals.invoiceCount,
    subtotal: snapshot.totals.subtotal,
    discount: snapshot.totals.discount,
    vat_amount: snapshot.totals.vatAmount,
    grand_total: snapshot.totals.grandTotal,
    invoice_rows: snapshot.rows,
    created_by: user.id,
  }).select("id").single();

  if (error) {
    if (/sales_reports/i.test(error.message)) throw new Error("Sales report storage is not set up yet. Run supabase/sales-reports.sql first.");
    throw new Error(`Could not save sales report: ${error.message}`);
  }
  redirect(`/sales-reports/${data.id}?flash=saved`);
}
