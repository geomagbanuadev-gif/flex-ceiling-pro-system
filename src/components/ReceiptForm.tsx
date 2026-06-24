"use client";

import { useState, useTransition } from "react";
import { saveQuote, type QuotePayload } from "@/app/quotes/actions";

type Client = {
  id: string;
  name: string;
  trn: string | null;
  address: string | null;
  email: string | null;
  contact_person: string | null;
  contact_phone: string | null;
};

export type ReceiptInitial = {
  id: string;
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
  paymentMethod: string;
  description: string;
  amount: number;
  notes: string;
};

const numOr0 = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export function ReceiptForm({
  clients,
  nextNumber,
  initial,
}: {
  clients: Client[];
  nextNumber: string;
  initial?: ReceiptInitial;
}) {
  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? null);
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientTrn, setClientTrn] = useState(initial?.clientTrn ?? "");
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [number, setNumber] = useState(initial?.number ?? nextNumber);
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || "cash");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [description, setDescription] = useState(initial?.description ?? "Advance Payment");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const total = numOr0(amount);

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) { setClientId(null); return; }
    setClientId(c.id);
    setClientName(c.name);
    setClientTrn(c.trn ?? "");
    setClientAddress(c.address ?? "");
    setClientEmail(c.email ?? "");
    setContactPerson(c.contact_person ?? "");
    setContactPhone(c.contact_phone ?? "");
  }

  function submit() {
    setError("");
    if (!clientName.trim()) { setError("Please enter the client (received from)."); return; }
    if (total <= 0) { setError("Please enter the amount received."); return; }
    const payload: QuotePayload = {
      id: initial?.id,
      type: "receipt",
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
      paymentTerms: "",
      validityDays: 0,
      notes,
      vatRate: 0,
      discount: 0,
      subtotal: total,
      vatAmount: 0,
      grandTotal: total,
      advanceAmount: 0,
      paymentMethod,
      items: [{ description, area: null, unit: "", rate: null, amount: total }],
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
  const section = "rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200";
  const h2 = "text-xs font-semibold uppercase tracking-wider text-slate-500";

  return (
    <div className="space-y-6">
      {/* Received from */}
      <section className={section}>
        <h2 className={h2}>Received from</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Select existing client (or type a new one below)</label>
            <select className={inp + " mt-1.5"} value={clientId ?? ""} onChange={(e) => pickClient(e.target.value)}>
              <option value="">— New client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div className="sm:col-span-2">
            <label className={lbl}>Address</label>
            <input className={inp + " mt-1.5"} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Receipt details */}
      <section className={section}>
        <h2 className={h2}>Receipt details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Receipt No.</label>
            <input className={inp + " mt-1.5"} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Payment date</label>
            <input type="date" className={inp + " mt-1.5"} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Payment method</label>
            <select className={inp + " mt-1.5"} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className={lbl}>{paymentMethod === "cheque" ? "Cheque details (no. / bank)" : "Reference (optional)"}</label>
            <input className={inp + " mt-1.5"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={paymentMethod === "cheque" ? "e.g. Cheque 123456 — RAK Bank" : ""} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Payment for</label>
            <input className={inp + " mt-1.5"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Advance Payment / Payment for INV-0123" />
          </div>
          <div>
            <label className={lbl}>Amount received (AED) *</label>
            <input className={inp + " mt-1.5"} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className={section}>
        <h2 className={h2}>Remarks / notes</h2>
        <textarea rows={2} className={inp + " mt-4"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remarks printed on the receipt." />
      </section>

      {/* Sticky total + save */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/85 px-5 py-3.5 shadow-[var(--shadow-pop)] backdrop-blur-md">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount received</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">AED {total.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button type="button" disabled={pending} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700 disabled:opacity-60">
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {pending ? "Saving…" : "Save receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
