import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SORT_COLS = ["doc_date", "number", "grand_total", "client_name"];
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Export the (filtered) document list as CSV. Uses the authenticated client,
// so RLS still limits rows to what the user is allowed to see.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const str = (k: string) => sp.get(k) ?? "";
  const q = str("q"), type = str("type"), status = str("status"), client = str("client");
  const from = str("from"), to = str("to"), min = str("min"), max = str("max");

  let query = supabase
    .from("documents")
    .select("number, type, status, doc_date, client_name, client_trn, subtotal, discount, vat_amount, grand_total");
  if (q) query = query.or(`client_name.ilike.%${q}%,number.ilike.%${q}%`);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (client) query = query.eq("client_id", client);
  if (from) query = query.gte("doc_date", from);
  if (to) query = query.lte("doc_date", to);
  if (min) query = query.gte("grand_total", Number(min));
  if (max) query = query.lte("grand_total", Number(max));
  const sort = SORT_COLS.includes(str("sort")) ? str("sort") : "doc_date";
  query = query.order(sort, { ascending: str("dir") === "asc", nullsFirst: false }).limit(5000);

  const { data } = await query;
  const headers = ["Number", "Type", "Status", "Date", "Client", "Client TRN", "Subtotal", "Discount", "VAT", "Grand Total"];
  const rows = (data ?? []).map((d) =>
    [d.number, d.type, d.status, d.doc_date, d.client_name, d.client_trn, d.subtotal, d.discount, d.vat_amount, d.grand_total].map(cell).join(",")
  );
  const csv = "﻿" + [headers.join(","), ...rows].join("\n"); // BOM so Excel reads UTF-8

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flexceiling-documents.csv"`,
    },
  });
}
