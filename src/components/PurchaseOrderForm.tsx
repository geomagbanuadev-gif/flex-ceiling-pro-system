"use client";

import { useMemo, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { savePurchaseOrder, type PoPayload } from "@/app/purchase-orders/actions";
import { computeTotals } from "@/utils/totals";

type Supplier = { id: string; name: string; trn: string | null; address: string | null; email: string | null; contact_person: string | null; contact_phone: string | null };
type Item = { description: string; quantity: string; unit: string; unitPrice: string; amount: string };

const emptyItem = (): Item => ({ description: "", quantity: "", unit: "pcs", unitPrice: "", amount: "" });
const numOr0 = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export type PoInitial = {
  id: string;
  supplierId: string | null;
  supplierName: string; supplierTrn: string; supplierAddress: string; supplierEmail: string;
  contactPerson: string; contactPhone: string;
  number: string; poDate: string; expectedDate: string; reference: string;
  vatRate: number; discount: number; notes: string;
  items: Item[];
};

export function PurchaseOrderForm({ suppliers, nextNumber, defaults, initial }: {
  suppliers: Supplier[]; nextNumber: string; defaults: { vatRate: number }; initial?: PoInitial;
}) {
  const [supplierId, setSupplierId] = useState<string | null>(initial?.supplierId ?? null);
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [supplierTrn, setSupplierTrn] = useState(initial?.supplierTrn ?? "");
  const [supplierAddress, setSupplierAddress] = useState(initial?.supplierAddress ?? "");
  const [supplierEmail, setSupplierEmail] = useState(initial?.supplierEmail ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [number, setNumber] = useState(initial?.number ?? nextNumber);
  const [poDate, setPoDate] = useState(initial?.poDate ?? new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState(initial?.expectedDate ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? defaults.vatRate);
  const [discount, setDiscount] = useState(String(initial?.discount ?? ""));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<Item[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const totals = useMemo(
    () => computeTotals(items.map((it) => numOr0(it.amount)), { vatRate, discount: numOr0(discount) }),
    [items, vatRate, discount]
  );

  function pickSupplier(id: string) {
    const s = suppliers.find((x) => x.id === id);
    if (!s) { setSupplierId(null); return; }
    setSupplierId(s.id); setSupplierName(s.name); setSupplierTrn(s.trn ?? ""); setSupplierAddress(s.address ?? "");
    setSupplierEmail(s.email ?? ""); setContactPerson(s.contact_person ?? ""); setContactPhone(s.contact_phone ?? "");
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = numOr0(field === "quantity" ? value : next[i].quantity);
        const price = numOr0(field === "unitPrice" ? value : next[i].unitPrice);
        if (qty && price) next[i].amount = String(+(qty * price).toFixed(2));
      }
      return next;
    });
  }

  function submit() {
    setError("");
    if (!supplierName.trim()) { setError("Please choose or enter a supplier."); return; }
    const payload: PoPayload = {
      id: initial?.id, supplierId, supplierName, supplierTrn, supplierAddress, supplierEmail,
      contactPerson, contactPhone, number, poDate, expectedDate, reference, notes,
      vatRate: Number(vatRate) || 0, discount: totals.discount, subtotal: totals.subtotal,
      vatAmount: totals.vatAmount, grandTotal: totals.grandTotal,
      items: items.map((it) => ({
        description: it.description, quantity: it.quantity === "" ? null : numOr0(it.quantity),
        unit: it.unit, unitPrice: it.unitPrice === "" ? null : numOr0(it.unitPrice), amount: it.amount === "" ? null : numOr0(it.amount),
      })),
    };
    start(async () => {
      try { await savePurchaseOrder(payload); }
      catch (e) { unstable_rethrow(e); setError(e instanceof Error ? e.message : "Failed to save"); }
    });
  }

  const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const lbl = "text-xs font-medium text-slate-500";
  const section = "rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200";
  const h2 = "text-xs font-semibold uppercase tracking-wider text-slate-500";

  return (
    <div className="space-y-6">
      <section className={section}>
        <h2 className={h2}>Supplier</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Select existing supplier (or type a new one below)</label>
            <select className={inp + " mt-1.5"} value={supplierId ?? ""} onChange={(e) => pickSupplier(e.target.value)}>
              <option value="">— New supplier —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Supplier name *</label>
            <input className={inp + " mt-1.5"} value={supplierName} onChange={(e) => { setSupplierName(e.target.value); setSupplierId(null); }} />
          </div>
          <div>
            <label className={lbl}>TRN</label>
            <input className={inp + " mt-1.5"} value={supplierTrn} onChange={(e) => setSupplierTrn(e.target.value)} />
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
            <input className={inp + " mt-1.5"} value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Purchase order details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>PO No.</label>
            <input className={inp + " mt-1.5"} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Order date</label>
              <input type="date" className={inp + " mt-1.5"} value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Expected delivery</label>
              <input type="date" className={inp + " mt-1.5"} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Reference / project</label>
            <input className={inp + " mt-1.5"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. materials for INDOORS HIGH FINISHING job" />
          </div>
        </div>
      </section>

      <section className={section}>
        <div className="flex items-center justify-between">
          <h2 className={h2}>Materials</h2>
          <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">+ Add row</button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <textarea rows={2} className={inp + " col-span-12 sm:col-span-5"} placeholder="Material / description" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-1"} placeholder="Qty" inputMode="decimal" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-1"} placeholder="Unit" value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-2"} placeholder="Unit price" inputMode="decimal" value={it.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
              <input className={inp + " col-span-3 sm:col-span-2"} placeholder="Amount" inputMode="decimal" value={it.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
              <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="col-span-12 text-left text-xs text-red-500 hover:underline sm:col-span-1 sm:text-center">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-xl bg-slate-50/80 p-4 text-sm ring-1 ring-slate-100">
            <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span className="font-medium tabular-nums">AED {totals.subtotal.toLocaleString()}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Discount</span><span className="flex items-center gap-1">AED <input className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right tabular-nums" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></span></div>
            <div className="flex items-center justify-between"><span className="flex items-center text-slate-500">VAT <input className="mx-1.5 w-12 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />%</span><span className="font-medium tabular-nums">AED {totals.vatAmount.toLocaleString()}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><span>Grand Total</span><span className="tabular-nums">AED {totals.grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Notes</h2>
        <textarea rows={2} className={inp + " mt-4"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes printed on the PO." />
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/85 px-5 py-3.5 shadow-[var(--shadow-pop)] backdrop-blur-md">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">PO total</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">AED {totals.grandTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button type="button" disabled={pending} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700 disabled:opacity-60">
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {pending ? "Saving…" : "Save purchase order"}
          </button>
        </div>
      </div>
    </div>
  );
}
