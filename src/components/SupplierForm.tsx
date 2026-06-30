"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveSupplier, type SupplierPayload } from "@/app/suppliers/actions";

type Supplier = Partial<SupplierPayload> & { id?: string };

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [trn, setTrn] = useState(supplier?.trn ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [contactPerson, setContactPerson] = useState(supplier?.contact_person ?? "");
  const [contactPhone, setContactPhone] = useState(supplier?.contact_phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [terms, setTerms] = useState(supplier?.default_payment_terms ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Supplier name is required."); return; }
    const payload: SupplierPayload = { id: supplier?.id, name, trn, email, contact_person: contactPerson, contact_phone: contactPhone, address, default_payment_terms: terms, notes };
    start(async () => {
      try { await saveSupplier(payload); }
      catch (e) { unstable_rethrow(e); setError(e instanceof Error ? e.message : "Failed to save"); }
    });
  }

  const inp = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const lbl = "text-xs font-medium text-slate-500";

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>Supplier name *</label>
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={lbl}>TRN</label>
          <input className={inp} value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="Tax Registration No." />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Contact person</label>
          <input className={inp} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Contact phone</label>
          <input className={inp} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Address</label>
          <input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Default payment terms</label>
          <input className={inp} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. 30 days net" />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Notes</label>
          <textarea rows={2} className={inp} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save supplier"}
        </button>
      </div>
    </form>
  );
}
