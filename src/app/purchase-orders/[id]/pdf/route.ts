import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@/utils/supabase/server";
import { PurchaseOrderDocument } from "@/components/pdf/PurchaseOrderPdf";

export const runtime = "nodejs";

function asset(file: string): string | undefined {
  try {
    return "data:image/png;base64," + fs.readFileSync(path.join(process.cwd(), "public", file)).toString("base64");
  } catch {
    return undefined;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [poRes, itemsRes, settingsRes] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("purchase_order_items").select("*").eq("purchase_order_id", id).order("sort_order"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (poRes.error || !poRes.data) return new Response("Purchase order not found", { status: 404 });

  const props = {
    po: poRes.data,
    items: itemsRes.data ?? [],
    settings: settingsRes.data ?? {},
    logoSrc: asset("logo-full.png"),
    stampSrc: asset("stamp.png"),
  } as unknown as Parameters<typeof PurchaseOrderDocument>[0];

  const pdf = await renderToBuffer(PurchaseOrderDocument(props));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Purchase-Order-${poRes.data.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
