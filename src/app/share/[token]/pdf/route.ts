import { NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { renderDocumentPdf, pdfResponse } from "@/utils/pdf";

export const runtime = "nodejs";

// PUBLIC route: no login. Returns ONLY the single document whose share_token
// matches exactly. The service-role client is used server-side only and the
// query is always constrained to the (unguessable) token.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 24) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("*").eq("share_token", token).maybeSingle();
  if (!doc) return new Response("This link is no longer valid.", { status: 404 });

  const [itemsRes, settingsRes] = await Promise.all([
    admin.from("document_items").select("*").eq("document_id", doc.id).order("sort_order"),
    admin.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const pdf = await renderDocumentPdf(doc, itemsRes.data ?? [], settingsRes.data);
  const download = req.nextUrl.searchParams.get("download") === "1";
  return pdfResponse(pdf, doc, download ? "attachment" : "inline");
}
