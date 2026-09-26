import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";

export async function GET(_: Request, context: RouteContext<"/expenses/[id]/attachment">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) return new NextResponse("Not authorized", { status: 403 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: expense } = await supabase.from("expenses").select("attachment_path, attachment_name, attachment_type").eq("id", id).maybeSingle();
  if (!expense?.attachment_path) return new NextResponse("Attachment not found", { status: 404 });
  const { data, error } = await supabase.storage.from("expense-attachments").download(expense.attachment_path);
  if (error || !data) return new NextResponse("Attachment not found", { status: 404 });
  const encodedName = encodeURIComponent(expense.attachment_name ?? "supplier-invoice");
  return new NextResponse(data, {
    headers: {
      "Content-Type": expense.attachment_type ?? data.type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
