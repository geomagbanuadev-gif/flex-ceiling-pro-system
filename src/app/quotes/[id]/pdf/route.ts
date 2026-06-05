import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { renderDocumentPdf, pdfResponse } from "@/utils/pdf";

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

  const pdf = await renderDocumentPdf(docRes.data, itemsRes.data ?? [], settingsRes.data);
  return pdfResponse(pdf, docRes.data);
}
