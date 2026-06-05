"use client";

import { useState, useTransition } from "react";
import { saveClient, type ClientPayload } from "@/app/clients/actions";

type Client = Partial<ClientPayload> & { id?: string };

export function ClientForm({ client }: { client?: Client }) {
  const [name, setName] = useState(client?.name ?? "");
  const [trn, setTrn] = useState(client?.trn ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [contactPerson, setContactPerson] = useState(client?.contact_person ?? "");
  const [contactPhone, setContactPhone] = useState(client?.contact_phone ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Client name is required."); return; }
    const payload: ClientPayload = { id: client?.id, name, trn, email, contact_person: contactPerson, contact_phone: contactPhone, address, notes };
    start(async () => {
      try {
        await saveClient(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const inp = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy";
  const lbl = "text-xs font-medium text-slate-600";

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>Client name *</label>
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={lbl}>TRN</label>
          <input className={inp} value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="15-digit Tax Registration No." />
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
          <label className={lbl}>Notes</label>
          <textarea rows={2} className={inp} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save client"}
        </button>
      </div>
    </form>
  );
}
