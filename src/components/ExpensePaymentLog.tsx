"use client";

import { useState, useTransition } from "react";
import { addExpensePayment, deleteExpensePayment } from "@/app/expenses/actions";
import { fmtDate, money2 } from "@/utils/format";
import { outstandingBalance } from "@/utils/finance";

type Payment = { id: string; payment_date: string; method: string | null; reference: string | null; amount: number; notes: string | null };

export function ExpensePaymentLog({ expenseId, payments, grandTotal, status }: { expenseId: string; payments: Payment[]; grandTotal: number; status: string }) {
  const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const balance = outstandingBalance(grandTotal, paid);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), method: "bank transfer", reference: "", amount: "", notes: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = "rounded-lg border border-slate-200 px-3 py-2 text-sm";
  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><div className="flex justify-between"><h2 className="font-semibold">Payments</h2><span className="text-sm text-slate-600">Balance <strong>{money2(balance)}</strong></span></div>
    <div className="mt-4 space-y-2">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{fmtDate(payment.payment_date)} · {payment.method || "Payment"}{payment.reference ? ` · ${payment.reference}` : ""}</span><span className="flex items-center gap-3 font-medium">{money2(payment.amount)}<button type="button" className="text-xs text-red-600" onClick={() => start(() => deleteExpensePayment(payment.id, expenseId))}>Remove</button></span></div>)}{!payments.length && <p className="text-sm text-slate-500">No payments recorded.</p>}</div>
    {status !== "posted" ? <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Post this expense before recording a payment.</p> : balance <= 0 ? <p className="mt-4 text-sm font-medium text-green-700">This expense is fully paid.</p> : <><div className="mt-4 grid gap-2 sm:grid-cols-2"><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>bank transfer</option><option>cash</option><option>cheque</option><option>card</option></select><input className={input} placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /><input className={input} inputMode="decimal" placeholder={`Amount (max ${balance.toFixed(2)})`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><input className={input + " sm:col-span-2"} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}<button type="button" disabled={pending} className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60" onClick={() => { setError(""); start(async () => { try { await addExpensePayment(expenseId, { ...form, amount: Number(form.amount) }); setForm({ ...form, reference: "", amount: "", notes: "" }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add payment"); } }); }}>{pending ? "Saving…" : "Add payment"}</button></>}
  </section>;
}
