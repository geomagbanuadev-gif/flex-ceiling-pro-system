import { createAdminClient } from "@/utils/supabase/admin";
import { fmtDate, money2 } from "@/utils/format";

// PUBLIC page: shows ONLY the one shared document (no app, no nav, no login).
export default async function SharePage(props: PageProps<"/share/[token]">) {
  const { token } = await props.params;

  let doc: { type: string; number: string; client_name: string | null; doc_date: string | null; grand_total: number | null } | null = null;
  if (token && token.length >= 24) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("documents")
      .select("type, number, client_name, doc_date, grand_total")
      .eq("share_token", token)
      .maybeSingle();
    doc = data;
  }

  if (!doc) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Link not available</p>
          <p className="mt-2 text-sm text-slate-500">This share link is invalid or has been turned off. Please ask the sender for a new link.</p>
        </div>
      </main>
    );
  }

  const title = doc.type === "invoice" ? "Tax Invoice" : "Quotation";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-navy text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FlexCeiling Pro" className="h-8 w-8 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">FlexCeiling Pro Solution General Trading FZ LLC</p>
            <p className="text-xs text-white/60">{title} {doc.number}</p>
          </div>
          <a
            href={`/share/${token}/pdf?download=1`}
            className="ml-auto shrink-0 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
          >
            Download
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-slate-600">{title} for <span className="font-semibold text-slate-900">{doc.client_name}</span></p>
          <p className="text-sm text-slate-500">{fmtDate(doc.doc_date)} · <span className="font-semibold text-slate-900">{money2(doc.grand_total)}</span></p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <iframe src={`/share/${token}/pdf`} className="h-[82vh] w-full rounded-lg" title={`${title} ${doc.number}`} />
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">If the document doesn&apos;t load, use the Download button above.</p>
      </div>
    </main>
  );
}
