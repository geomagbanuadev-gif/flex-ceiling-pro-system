import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "", status = sp.get("status") ?? "";

  let query = supabase.from("purchase_orders").select("id, number, status, po_date, expected_date, supplier_name, supplier_trn, reference, subtotal, discount, vat_amount, grand_total");
  if (q) query = query.or(`number.ilike.%${q}%,supplier_name.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  query = query.order("po_date", { ascending: false, nullsFirst: false }).limit(5000);
  const { data: pos } = await query;

  // paid per PO (RLS-scoped)
  const ids = (pos ?? []).map((p) => p.id);
  const paid = new Map<string, number>();
  if (ids.length) {
    const { data: pays } = await supabase.from("purchase_payments").select("purchase_order_id, amount").in("purchase_order_id", ids);
    for (const p of pays ?? []) paid.set(p.purchase_order_id, (paid.get(p.purchase_order_id) ?? 0) + (Number(p.amount) || 0));
  }

  const headers = ["PO Number", "Status", "Date", "Expected", "Supplier", "Supplier TRN", "Reference", "Subtotal", "Discount", "VAT", "Grand Total", "Paid", "Balance"];
  const rows = (pos ?? []).map((p) => {
    const pd = paid.get(p.id) ?? 0;
    const bal = (Number(p.grand_total) || 0) - pd;
    return [p.number, p.status, p.po_date, p.expected_date, p.supplier_name, p.supplier_trn, p.reference, p.subtotal, p.discount, p.vat_amount, p.grand_total, pd, bal].map(cell).join(",");
  });
  const csv = "﻿" + [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="flexceiling-purchase-orders.csv"` },
  });
}
