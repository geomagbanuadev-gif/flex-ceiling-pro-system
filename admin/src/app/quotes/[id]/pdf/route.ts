import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@/utils/supabase/server";
import { QuoteDocument } from "@/components/pdf/QuotePdf";
import { InvoiceDocument } from "@/components/pdf/InvoicePdf";

function asset(file: string): string | undefined {
  try {
    return "data:image/png;base64," + fs.readFileSync(path.join(process.cwd(), "public", file)).toString("base64");
  } catch {
    return undefined;
  }
}

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [docRes, itemsRes, settingsRes] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("document_items").select("*").eq("document_id", id).order("sort_order"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (docRes.error || !docRes.data) {
    return new Response("Document not found", { status: 404 });
  }

  const logoSrc = asset("logo-mark.png");
  const stampSrc = asset("stamp.png");

  const doc = docRes.data;
  const items = itemsRes.data ?? [];
  // Prefer the supplier details frozen onto the document at issue time;
  // fall back to current company settings for older docs without a snapshot.
  const settings = doc.supplier_snapshot ?? settingsRes.data ?? {};
  const isInvoice = doc.type === "invoice";

  const element = isInvoice
    ? InvoiceDocument({ doc, items, settings, logoSrc, stampSrc })
    : QuoteDocument({ doc, items, settings, logoSrc, stampSrc });
  const pdf = await renderToBuffer(element);

  const prefix = isInvoice ? "Tax-Invoice" : "Quotation";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prefix}-${doc.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
