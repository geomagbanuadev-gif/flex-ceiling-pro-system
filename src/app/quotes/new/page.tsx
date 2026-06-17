import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { QuoteForm } from "@/components/QuoteForm";
import { AppShell } from "@/components/AppShell";
import { getProfile, canSeeQuotes } from "@/utils/profile";
import { nextDocNumber } from "@/utils/docNumber";

export default async function NewQuotePage(props: PageProps<"/quotes/new">) {
  const me = await getProfile();
  if (me && !canSeeQuotes(me.role)) redirect("/quotes");

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
  const nextNumber = nextDocNumber((numbersRes.data ?? []).map((d) => d.number), prefix);
  const presetClient = presetId ? (clientsRes.data ?? []).find((c) => c.id === presetId) : undefined;

  return (
    <AppShell
      active="quotes"
      title="New Quotation"
      action={<Link href="/quotes?type=quote" className="text-sm font-medium text-navy-600 hover:underline">← All quotations</Link>}
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
