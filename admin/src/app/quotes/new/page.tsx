import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { QuoteForm } from "@/components/QuoteForm";
import { AppShell } from "@/components/AppShell";

function nextQuoteNumber(numbers: string[], prefix: string) {
  let max = 0;
  for (const num of numbers) {
    const m = String(num).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(4, "0");
}

export default async function NewQuotePage(props: PageProps<"/quotes/new">) {
  const sp = await props.searchParams;
  const presetId = typeof sp.client === "string" ? sp.client : null;

  const supabase = await createClient();
  const [clientsRes, settingsRes, numbersRes] = await Promise.all([
    supabase.from("clients").select("id, name, trn, address, email, contact_person, contact_phone").order("name"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("documents").select("number").eq("type", "quote"),
  ]);

  const settings = settingsRes.data;
  const prefix = settings?.quote_prefix ?? "1000-";
  const nextNumber = nextQuoteNumber((numbersRes.data ?? []).map((d) => d.number), prefix);
  const presetClient = presetId ? (clientsRes.data ?? []).find((c) => c.id === presetId) : undefined;

  return (
    <AppShell
      active="documents"
      title="New Quotation"
      action={<Link href="/quotes" className="text-sm font-medium text-navy-600 hover:underline">← All documents</Link>}
    >
      <QuoteForm
        clients={clientsRes.data ?? []}
        nextNumber={nextNumber}
        defaults={{
          paymentTerms: (settings?.default_payment_terms ?? "").replace(/\\n/g, "\n"),
          validityDays: settings?.default_validity_days ?? 7,
          vatRate: settings?.vat_rate ?? 5,
        }}
        presetClient={presetClient}
      />
    </AppShell>
  );
}
