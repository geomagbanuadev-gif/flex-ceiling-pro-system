import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@/utils/supabase/server";
import { QuoteDocument } from "@/components/pdf/QuotePdf";

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

  let logoSrc: string | undefined;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "logo-mark.png"));
    logoSrc = "data:image/png;base64," + buf.toString("base64");
  } catch {
    // logo optional
  }

  const pdf = await renderToBuffer(
    QuoteDocument({ doc: docRes.data, items: itemsRes.data ?? [], settings: settingsRes.data ?? {}, logoSrc })
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Quotation-${docRes.data.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
