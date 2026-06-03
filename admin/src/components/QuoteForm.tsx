"use client";

import { useMemo, useState, useTransition } from "react";
import { saveQuote, type QuotePayload } from "@/app/quotes/actions";

type Client = {
  id: string;
  name: string;
  trn: string | null;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
};

type Item = { description: string; area: string; unit: string; rate: string; amount: string };

const emptyItem = (): Item => ({ description: "", area: "", unit: "Sqm", rate: "", amount: "" });
const numOr0 = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export function QuoteForm({
  clients,
  nextNumber,
  defaults,
}: {
  clients: Client[];
  nextNumber: string;
  defaults: { paymentTerms: string; validityDays: number; vatRate: number };
}) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientTrn, setClientTrn] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [number, setNumber] = useState(nextNumber);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(defaults.paymentTerms);
  const [validityDays, setValidityDays] = useState(defaults.validityDays);
  const [vatRate, setVatRate] = useState(defaults.vatRate);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + numOr0(it.amount), 0);
    const vatAmount = +(subtotal * (vatRate / 100)).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), vatAmount, grandTotal: +(subtotal + vatAmount).toFixed(2) };
  }, [items, vatRate]);

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
      clientId,
      clientName,
      clientTrn,
      clientAddress,
      contactPerson,
      contactPhone,
      number,
      date,
      reference,
      paymentTerms,
      validityDays: Number(validityDays) || 0,
      notes,
      vatRate: Number(vatRate) || 0,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
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

  const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-navy focus:ring-1 focus:ring-navy";
  const lbl = "text-xs font-medium text-slate-600";

  return (
    <div className="space-y-6">
      {/* Client */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quotation details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Quote No.</label>
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
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Line items</h2>
          <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">+ Add row</button>
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
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span className="font-medium">AED {totals.subtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">VAT <input className="mx-1 w-12 rounded border border-slate-300 px-1 text-center" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />%</span><span className="font-medium">AED {totals.vatAmount.toLocaleString()}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold"><span>Grand Total</span><span>AED {totals.grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </section>

      {/* Terms */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Terms &amp; notes</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Payment terms</label>
            <textarea rows={3} className={inp + " mt-1.5"} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Quote validity (days)</label>
            <input type="number" className={inp + " mt-1.5"} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
            <label className={lbl + " mt-4 block"}>Internal notes (not printed)</label>
            <textarea rows={2} className={inp + " mt-1.5"} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" disabled={pending} onClick={submit} className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save quotation"}
        </button>
      </div>
    </div>
  );
}
