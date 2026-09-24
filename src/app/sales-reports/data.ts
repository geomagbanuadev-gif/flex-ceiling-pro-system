import "server-only";
import { createClient } from "@/utils/supabase/server";
import { salesTotals, type SalesRange, type SalesRow, type SalesSnapshot, type SalesStatusFilter } from "@/utils/salesReport";

export async function loadSalesSnapshot(range: SalesRange, status: SalesStatusFilter): Promise<SalesSnapshot> {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("id, number, status, doc_date, client_name, subtotal, discount, vat_amount, grand_total")
    .eq("type", "invoice")
    .gte("doc_date", range.from)
    .lte("doc_date", range.to)
    .order("doc_date", { ascending: false })
    .order("number", { ascending: false });

  if (status === "active") query = query.in("status", ["sent", "paid"]);
  else if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Could not generate sales report: ${error.message}`);

  const rows: SalesRow[] = (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    doc_date: row.doc_date,
    client_name: row.client_name,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    vat_amount: Number(row.vat_amount ?? 0),
    grand_total: Number(row.grand_total ?? 0),
  }));

  return { generatedAt: new Date().toISOString(), rows, totals: salesTotals(rows) };
}
