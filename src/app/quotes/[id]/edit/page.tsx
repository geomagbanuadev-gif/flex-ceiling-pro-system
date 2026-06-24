import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { QuoteForm, type QuoteInitial } from "@/components/QuoteForm";
import { ReceiptForm, type ReceiptInitial } from "@/components/ReceiptForm";

export default async function EditDocumentPage(props: PageProps<"/quotes/[id]/edit">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [docRes, itemsRes, clientsRes, settingsRes] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).maybeSingle(),
    supabase.from("document_items").select("*").eq("document_id", id).order("sort_order"),
    supabase.from("clients").select("id, name, trn, address, email, contact_person, contact_phone").order("name"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const doc = docRes.data;
  if (!doc) notFound();
  const settings = settingsRes.data;
  const items = itemsRes.data ?? [];
  const clients = clientsRes.data ?? [];

  // Receipts use a dedicated, simpler form
  if (doc.type === "receipt") {
    const first = items[0];
    const receiptInitial: ReceiptInitial = {
      id: doc.id,
      clientId: doc.client_id,
      clientName: doc.client_name ?? "",
      clientTrn: doc.client_trn ?? "",
      clientAddress: doc.client_address ?? "",
      clientEmail: doc.client_email ?? "",
      contactPerson: doc.contact_person ?? "",
      contactPhone: doc.contact_phone ?? "",
      number: doc.number ?? "",
      date: doc.doc_date ?? new Date().toISOString().slice(0, 10),
      reference: doc.reference ?? "",
      paymentMethod: doc.payment_method ?? "cash",
      description: first?.description ?? "Advance Payment",
      amount: Number(first?.amount ?? doc.grand_total ?? 0),
      notes: doc.notes ?? "",
    };
    return (
      <AppShell
        active="receipts"
        title={`Edit Receipt ${doc.number}`}
        action={<Link href={`/quotes/${id}`} className="text-sm font-medium text-navy-600 hover:underline">← Cancel</Link>}
      >
        <ReceiptForm clients={clients} nextNumber={doc.number ?? ""} initial={receiptInitial} />
      </AppShell>
    );
  }

  const docWord = doc.type === "invoice" ? "Tax Invoice" : doc.type === "proforma" ? "Pro Forma" : "Quotation";

  const initial: QuoteInitial = {
    id: doc.id,
    type: doc.type === "invoice" ? "invoice" : doc.type === "proforma" ? "proforma" : "quote",
    clientId: doc.client_id,
    clientName: doc.client_name ?? "",
    clientTrn: doc.client_trn ?? "",
    clientAddress: doc.client_address ?? "",
    clientEmail: doc.client_email ?? "",
    contactPerson: doc.contact_person ?? "",
    contactPhone: doc.contact_phone ?? "",
    number: doc.number ?? "",
    date: doc.doc_date ?? new Date().toISOString().slice(0, 10),
    reference: doc.reference ?? "",
    paymentTerms: doc.payment_terms ?? "",
    validityDays: doc.validity_days ?? 7,
    vatRate: doc.vat_rate ?? 5,
    discount: doc.discount ?? 0,
    advanceAmount: doc.advance_amount ?? 0,
    notes: doc.notes ?? "",
    items: items.map((it) => ({
      description: it.description ?? "",
      area: it.area == null ? "" : String(it.area),
      unit: it.unit ?? "Sqm",
      rate: it.rate == null ? "" : String(it.rate),
      amount: it.amount == null ? "" : String(it.amount),
    })),
  };

  return (
    <AppShell
      active={doc.type === "invoice" ? "invoices" : doc.type === "proforma" ? "proforma" : "quotes"}
      title={`Edit ${docWord} ${doc.number}`}
      action={<Link href={`/quotes/${id}`} className="text-sm font-medium text-navy-600 hover:underline">← Cancel</Link>}
    >
      <QuoteForm
        clients={clients}
        nextNumber={doc.number ?? ""}
        defaults={{
          paymentTerms: (settings?.default_payment_terms ?? "").replace(/\\n/g, "\n"),
          validityDays: settings?.default_validity_days ?? 7,
          vatRate: settings?.vat_rate ?? 5,
        }}
        initial={initial}
      />
    </AppShell>
  );
}
