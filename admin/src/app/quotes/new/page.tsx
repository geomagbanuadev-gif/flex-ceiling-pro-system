import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { QuoteForm } from "@/components/QuoteForm";

function nextQuoteNumber(numbers: string[], prefix: string) {
  let max = 0;
  for (const num of numbers) {
    const m = String(num).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(4, "0");
}

export default async function NewQuotePage() {
  const supabase = await createClient();
  const [clientsRes, settingsRes, numbersRes] = await Promise.all([
    supabase.from("clients").select("id, name, trn, address, contact_person, contact_phone").order("name"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("documents").select("number").eq("type", "quote"),
  ]);

  const settings = settingsRes.data;
  const prefix = settings?.quote_prefix ?? "1000-";
  const nextNumber = nextQuoteNumber((numbersRes.data ?? []).map((d) => d.number), prefix);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">← Dashboard</Link>
            <h1 className="text-base font-semibold text-slate-900">New Quotation</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <QuoteForm
          clients={clientsRes.data ?? []}
          nextNumber={nextNumber}
          defaults={{
            paymentTerms: (settings?.default_payment_terms ?? "").replace(/\\n/g, "\n"),
            validityDays: settings?.default_validity_days ?? 7,
            vatRate: settings?.vat_rate ?? 5,
          }}
        />
      </main>
    </div>
  );
}
