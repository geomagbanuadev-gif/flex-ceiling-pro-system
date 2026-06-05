"use client";

import { useState, useTransition } from "react";
import { saveSettings, type SettingsPayload } from "@/app/settings/actions";

type Settings = Partial<SettingsPayload>;

export function SettingsForm({ settings }: { settings: Settings }) {
  const [f, setF] = useState<SettingsPayload>({
    legal_name: settings.legal_name ?? "",
    address: settings.address ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    trn: settings.trn ?? "",
    bank_account_name: settings.bank_account_name ?? "",
    bank_account_no: settings.bank_account_no ?? "",
    bank_iban: settings.bank_iban ?? "",
    bank_currency: settings.bank_currency ?? "AED",
    bank_name: settings.bank_name ?? "",
    default_payment_terms: settings.default_payment_terms ?? "",
    default_validity_days: settings.default_validity_days ?? 7,
    quote_prefix: settings.quote_prefix ?? "",
    invoice_prefix: settings.invoice_prefix ?? "",
    vat_rate: settings.vat_rate ?? 5,
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof SettingsPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        await saveSettings(f);
        setMsg({ ok: true, text: "Settings saved." });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to save" });
      }
    });
  }

  const inp = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-navy focus:ring-1 focus:ring-navy";
  const lbl = "text-xs font-medium text-slate-600";
  const card = "rounded-xl border border-slate-200 bg-white p-6";
  const h = "text-sm font-semibold uppercase tracking-wide text-slate-500";

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={card}>
        <h2 className={h}>Company</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={lbl}>Legal name</label><input className={inp} value={f.legal_name} onChange={set("legal_name")} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Address</label><input className={inp} value={f.address} onChange={set("address")} /></div>
          <div><label className={lbl}>Email</label><input className={inp} value={f.email} onChange={set("email")} /></div>
          <div><label className={lbl}>Phone</label><input className={inp} value={f.phone} onChange={set("phone")} /></div>
          <div><label className={lbl}>TRN</label><input className={inp} value={f.trn} onChange={set("trn")} /></div>
        </div>
      </section>

      <section className={card}>
        <h2 className={h}>Bank details (printed on documents)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className={lbl}>Account name</label><input className={inp} value={f.bank_account_name} onChange={set("bank_account_name")} /></div>
          <div><label className={lbl}>Account no.</label><input className={inp} value={f.bank_account_no} onChange={set("bank_account_no")} /></div>
          <div><label className={lbl}>IBAN</label><input className={inp} value={f.bank_iban} onChange={set("bank_iban")} /></div>
          <div><label className={lbl}>Currency</label><input className={inp} value={f.bank_currency} onChange={set("bank_currency")} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Bank</label><input className={inp} value={f.bank_name} onChange={set("bank_name")} /></div>
        </div>
      </section>

      <section className={card}>
        <h2 className={h}>Document defaults</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className={lbl}>Quote number prefix</label><input className={inp} value={f.quote_prefix} onChange={set("quote_prefix")} /></div>
          <div><label className={lbl}>Invoice number prefix</label><input className={inp} value={f.invoice_prefix} onChange={set("invoice_prefix")} /></div>
          <div><label className={lbl}>VAT rate (%)</label><input className={inp} inputMode="decimal" value={f.vat_rate} onChange={set("vat_rate")} /></div>
          <div><label className={lbl}>Quote validity (days)</label><input className={inp} inputMode="numeric" value={f.default_validity_days} onChange={set("default_validity_days")} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Default payment terms</label><textarea rows={3} className={inp} value={f.default_payment_terms} onChange={set("default_payment_terms")} /></div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>}
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
