"use client";

import { useMemo, useState, useTransition } from "react";
import { saveQuote, type QuotePayload } from "@/app/quotes/actions";
import { computeTotals } from "@/utils/totals";

type Client = {
  id: string;
  name: string;
  trn: string | null;
  address: string | null;
  email: string | null;
  contact_person: string | null;
  contact_phone: string | null;
};

type Item = { description: string; area: string; unit: string; rate: string; amount: string };

const emptyItem = (): Item => ({ description: "", area: "", unit: "Sqm", rate: "", amount: "" });
const numOr0 = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export type QuoteInitial = {
  id: string;
  type: "quote" | "invoice" | "proforma";
  clientId: string | null;
  clientName: string;
  clientTrn: string;
  clientAddress: string;
  clientEmail: string;
  contactPerson: string;
  contactPhone: string;
  number: string;
  date: string;
  reference: string;
  paymentTerms: string;
  validityDays: number;
  vatRate: number;
  discount: number;
  advanceAmount: number;
  notes: string;
  items: Item[];
};

export function QuoteForm({
  clients,
  nextNumber,
  defaults,
  initial,
  presetClient,
}: {
  clients: Client[];
  nextNumber: string;
  defaults: { paymentTerms: string; validityDays: number; vatRate: number };
  initial?: QuoteInitial;
  presetClient?: Client;
}) {
  const isInvoice = initial?.type === "invoice";
  const isProforma = initial?.type === "proforma";
  const docWord = isProforma ? "Pro Forma" : isInvoice ? "Tax Invoice" : "Quotation";

  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? presetClient?.id ?? null);
  const [clientName, setClientName] = useState(initial?.clientName ?? presetClient?.name ?? "");
  const [clientTrn, setClientTrn] = useState(initial?.clientTrn ?? presetClient?.trn ?? "");
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? presetClient?.address ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? presetClient?.email ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? presetClient?.contact_person ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? presetClient?.contact_phone ?? "");
  const [number, setNumber] = useState(initial?.number ?? nextNumber);
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? defaults.paymentTerms);
  const [validityDays, setValidityDays] = useState(initial?.validityDays ?? defaults.validityDays);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? defaults.vatRate);
  const [discount, setDiscount] = useState(String(initial?.discount ?? ""));
  const [advance, setAdvance] = useState(String(initial?.advanceAmount ?? ""));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<Item[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const totals = useMemo(
    () => computeTotals(items.map((it) => numOr0(it.amount)), { vatRate, discount: numOr0(discount), advance: numOr0(advance) }),
    [items, vatRate, discount, advance]
  );

  // Pro forma: advance (what the client pays now) + the remaining balance.
  const advanceAmount = totals.advanceAmount;
  const balanceDue = totals.balanceDue;
  const advancePct = totals.grandTotal ? Math.round((advanceAmount / totals.grandTotal) * 100) : 0;
  const setAdvancePct = (pct: number) => setAdvance(String(+(totals.grandTotal * (pct / 100)).toFixed(2)));

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) {
      setClientId(null);
      return;
    }
    setClientId(c.id);
    setClientName(c.name);
    setClientTrn(c.trn ?? "");
    setClientAddress(c.address ?? "");
    setClientEmail(c.email ?? "");
    setContactPerson(c.contact_person ?? "");
    setContactPhone(c.contact_phone ?? "");
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // auto-calc amount when area or rate changes (unless amount manually set)
      if (field === "area" || field === "rate") {
        const area = numOr0(field === "area" ? value : next[i].area);
        const rate = numOr0(field === "rate" ? value : next[i].rate);
        if (area && rate) next[i].amount = String(+(area * rate).toFixed(2));
      }
      return next;
    });
  }

  function submit() {
    setError("");
    if (!clientName.trim()) {
      setError("Please enter a client name.");
      return;
    }
    const payload: QuotePayload = {
      id: initial?.id,
      type: initial?.type ?? "quote",
      clientId,
      clientName,
      clientTrn,
      clientAddress,
      clientEmail,
      contactPerson,
      contactPhone,
      number,
      date,
      reference,
      paymentTerms,
      validityDays: Number(validityDays) || 0,
      notes,
      vatRate: Number(vatRate) || 0,
      discount: totals.discount,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      advanceAmount,
      items: items.map((it) => ({
        description: it.description,
        area: it.area === "" ? null : numOr0(it.area),
        unit: it.unit,
        rate: it.rate === "" ? null : numOr0(it.rate),
        amount: it.amount === "" ? null : numOr0(it.amount),
      })),
    };
    startTransition(async () => {
      try {
        await saveQuote(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <div className="space-y-6">
      {/* Client */}
      <section className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Client</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Select existing client (or type a new one below)</label>
            <select className={inp + " mt-1.5"} value={clientId ?? ""} onChange={(e) => pickClient(e.target.value)}>
              <option value="">— New client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Client name *</label>
            <input className={inp + " mt-1.5"} value={clientName} onChange={(e) => { setClientName(e.target.value); setClientId(null); }} />
          </div>
          <div>
            <label className={lbl}>TRN</label>
            <input className={inp + " mt-1.5"} value={clientTrn} onChange={(e) => setClientTrn(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input className={inp + " mt-1.5"} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="shown on Tax Invoice" />
          </div>
          <div>
            <label className={lbl}>Contact person</label>
            <input className={inp + " mt-1.5"} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Contact phone</label>
            <input className={inp + " mt-1.5"} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Address</label>
            <input className={inp + " mt-1.5"} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Quote details */}
      <section className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{docWord} details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>{isInvoice ? "Invoice No." : isProforma ? "Proforma No." : "Quote No."}</label>
            <input className={inp + " mt-1.5"} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Date</label>
            <input type="date" className={inp + " mt-1.5"} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Reference / scope</label>
            <input className={inp + " mt-1.5"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SUPPLY AND INSTALLATION OF STRETCH CEILING…" />
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Line items</h2>
            <p className="mt-0.5 text-xs text-slate-500">Tip: start a description line with <span className="font-mono text-red-500">*</span> to print that line in red.</p>
          </div>
          <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">+ Add row</button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-6">
                <textarea rows={2} className={inp} placeholder="Task description" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
              </div>
              <input className={inp + " col-span-3 sm:col-span-1"} placeholder="Area" inputMode="decimal" value={it.area} onChange={(e) => updateItem(i, "area", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-1"} placeholder="Unit" value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-1"} placeholder="Rate" inputMode="decimal" value={it.rate} onChange={(e) => updateItem(i, "rate", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-2"} placeholder="Amount" inputMode="decimal" value={it.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
              <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="col-span-12 text-left text-xs text-red-500 hover:underline sm:col-span-1 sm:text-center" aria-label="Remove row">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-xl bg-slate-50/80 p-4 text-sm ring-1 ring-slate-100">
            <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span className="font-medium tabular-nums">AED {totals.subtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Discount</span><span className="flex items-center gap-1">AED <input className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></span></div>
            <div className="flex items-center justify-between"><span className="flex items-center text-slate-500">VAT <input className="mx-1.5 w-12 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />%</span><span className="font-medium tabular-nums">AED {totals.vatAmount.toLocaleString()}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><span>Grand Total</span><span className="tabular-nums">AED {totals.grandTotal.toLocaleString()}</span></div>
            {isProforma && (
              <div className="mt-1 space-y-2 border-t border-dashed border-slate-300 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Advance Payment{advancePct ? <span className="ml-1 text-xs text-slate-500">({advancePct}%)</span> : null}</span>
                  <span className="flex items-center gap-1">AED <input className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums" inputMode="decimal" placeholder="0" value={advance} onChange={(e) => setAdvance(e.target.value)} /></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Quick:</span>
                  {[50, 40, 10, 100].map((pct) => (
                    <button key={pct} type="button" onClick={() => setAdvancePct(pct)} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:border-navy-600 hover:text-navy">{pct}%</button>
                  ))}
                </div>
                <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span className="tabular-nums">AED {balanceDue.toLocaleString()}</span></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Terms */}
      <section className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Terms &amp; notes</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Payment terms</label>
            <textarea rows={3} className={inp + " mt-1.5"} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Quote validity (days)</label>
            <input type="number" className={inp + " mt-1.5"} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
            <label className={lbl + " mt-4 block"}>Note — printed in red on the document</label>
            <textarea rows={2} className={inp + " mt-1.5"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Powder-coated color is subject to client's final approval before fabrication." />
          </div>
        </div>
      </section>

      {/* Sticky live summary + save */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/85 px-5 py-3.5 shadow-[var(--shadow-pop)] backdrop-blur-md">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{docWord} total</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">AED {totals.grandTotal.toLocaleString()}</span>
          {isProforma && <span className="text-xs font-medium text-red-600">· Balance AED {balanceDue.toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button type="button" disabled={pending} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700 disabled:opacity-60">
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {pending ? "Saving…" : initial ? "Save changes" : `Save ${docWord.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
