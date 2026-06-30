"use client";

import { useState, useTransition } from "react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { addPurchasePayment, deletePurchasePayment } from "@/app/purchase-orders/actions";
import { useToast } from "./Toast";
import { balanceOwed, paymentStatus } from "@/utils/procurement";

type Payment = { id: string; payment_date: string | null; method: string | null; reference: string | null; amount: number | null; notes: string | null };
const money = (v: number | null | undefined) => "AED " + Number(v ?? 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PaymentLog({ poId, payments, grandTotal }: { poId: string; payments: Payment[]; grandTotal: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = balanceOwed(grandTotal, paid);
  const status = paymentStatus(grandTotal, paid);
  const statusCls = status === "paid" ? "bg-green-100 text-green-700" : status === "partial" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";

  function add() {
    if (!(parseFloat(amount) > 0)) { toast("Enter a payment amount", "error"); return; }
    start(async () => {
      try {
        await addPurchasePayment(poId, { date, method, reference, amount: parseFloat(amount), notes });
        setAmount(""); setReference(""); setNotes(""); setOpen(false); toast("Payment recorded"); router.refresh();
      } catch (e) { unstable_rethrow(e); toast(e instanceof Error ? e.message : "Failed", "error"); }
    });
  }
  function remove(id: string) {
    start(async () => {
      try { await deletePurchasePayment(id, poId); toast("Payment removed"); router.refresh(); }
      catch (e) { unstable_rethrow(e); toast(e instanceof Error ? e.message : "Failed", "error"); }
    });
  }

  const inp = "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments to supplier</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>{status}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-50 py-2"><span className="block font-semibold text-slate-900">{money(grandTotal)}</span><span className="text-xs text-slate-500">PO total</span></div>
        <div className="rounded-lg bg-slate-50 py-2"><span className="block font-semibold text-slate-900">{money(paid)}</span><span className="text-xs text-slate-500">Paid</span></div>
        <div className="rounded-lg bg-slate-50 py-2"><span className={`block font-semibold ${balance > 0 ? "text-red-600" : "text-green-700"}`}>{money(balance)}</span><span className="text-xs text-slate-500">Balance</span></div>
      </div>

      {payments.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100 text-sm">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium text-slate-800">{money(p.amount)}</span>
                <span className="ml-2 text-xs capitalize text-slate-500">{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                <span className="ml-2 text-xs text-slate-400">{p.payment_date}</span>
              </div>
              <button type="button" onClick={() => remove(p.id)} disabled={pending} className="text-xs text-red-500 hover:underline disabled:opacity-50">Remove</button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className={inp} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="bank">Bank transfer</option>
            </select>
            <input className={inp} inputMode="decimal" placeholder="Amount (AED)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={inp} placeholder="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <input className={inp + " w-full"} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="button" onClick={add} disabled={pending} className="rounded-lg bg-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-60">{pending ? "Saving…" : "Record payment"}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-navy-600 hover:text-navy">+ Record a payment</button>
      )}
    </div>
  );
}
