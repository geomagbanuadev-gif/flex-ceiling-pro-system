"use client";

import { useMemo, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveExpense, type ExpensePayload } from "@/app/expenses/actions";

type Option = { id: string; name: string };
type Project = Option & { code: string | null; client_id: string };

export function ExpenseForm({ categories, clients, suppliers, projects, expense }: { categories: Option[]; clients: Option[]; suppliers: Option[]; projects: Project[]; expense?: Partial<ExpensePayload> }) {
  const [value, setValue] = useState<ExpensePayload>({ id: expense?.id, expenseDate: expense?.expenseDate ?? new Date().toISOString().slice(0, 10), dueDate: expense?.dueDate ?? "", categoryId: expense?.categoryId ?? categories[0]?.id ?? "", description: expense?.description ?? "", payeeName: expense?.payeeName ?? "", supplierId: expense?.supplierId ?? null, clientId: expense?.clientId ?? null, projectId: expense?.projectId ?? null, status: expense?.status ?? "draft", subtotal: expense?.subtotal ?? 0, vatAmount: expense?.vatAmount ?? 0, vatRecoverable: expense?.vatRecoverable ?? false, reference: expense?.reference ?? "", notes: expense?.notes ?? "" });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const total = useMemo(() => value.subtotal + value.vatAmount, [value.subtotal, value.vatAmount]);
  const set = <K extends keyof ExpensePayload>(key: K, next: ExpensePayload[K]) => setValue((current) => ({ ...current, [key]: next }));
  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const label = "text-xs font-medium text-slate-500";

  function pickProject(id: string) {
    const project = projects.find((item) => item.id === id);
    setValue((current) => ({ ...current, projectId: id || null, clientId: project?.client_id ?? current.clientId }));
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    start(async () => { try { await saveExpense(value); } catch (caught) { unstable_rethrow(caught); setError(caught instanceof Error ? caught.message : "Could not save expense"); } });
  }
  return <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200"><div className="grid gap-4 sm:grid-cols-2">
    <div><label className={label}>Expense date *</label><input type="date" className={input} value={value.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} /></div>
    <div><label className={label}>Payment due date</label><input type="date" className={input} value={value.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
    <div><label className={label}>Category *</label><select className={input} value={value.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    <div><label className={label}>Status</label><select className={input} value={value.status} onChange={(e) => set("status", e.target.value as ExpensePayload["status"])}><option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option></select></div>
    <div className="sm:col-span-2"><label className={label}>Description *</label><input className={input} value={value.description} onChange={(e) => set("description", e.target.value)} /></div>
    <div><label className={label}>Payee name</label><input className={input} value={value.payeeName} onChange={(e) => set("payeeName", e.target.value)} /></div>
    <div><label className={label}>Known supplier</label><select className={input} value={value.supplierId ?? ""} onChange={(e) => set("supplierId", e.target.value || null)}><option value="">— None —</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
    <div><label className={label}>Client</label><select className={input} value={value.clientId ?? ""} onChange={(e) => setValue((current) => ({ ...current, clientId: e.target.value || null, projectId: current.projectId && projects.some((project) => project.id === current.projectId && project.client_id === e.target.value) ? current.projectId : null }))}><option value="">— General overhead —</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
    <div><label className={label}>Project</label><select className={input} value={value.projectId ?? ""} onChange={(e) => pickProject(e.target.value)}><option value="">— Unassigned —</option>{projects.filter((project) => !value.clientId || project.client_id === value.clientId).map((project) => <option key={project.id} value={project.id}>{project.code ? `${project.code} — ` : ""}{project.name}</option>)}</select></div>
    <div><label className={label}>Subtotal (AED)</label><input inputMode="decimal" className={input} value={value.subtotal || ""} onChange={(e) => set("subtotal", Number(e.target.value) || 0)} /></div>
    <div><label className={label}>VAT amount (AED)</label><input inputMode="decimal" className={input} value={value.vatAmount || ""} onChange={(e) => set("vatAmount", Number(e.target.value) || 0)} /><label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={value.vatRecoverable} onChange={(e) => set("vatRecoverable", e.target.checked)} /> VAT is recoverable</label></div>
    <div><label className={label}>Reference</label><input className={input} value={value.reference} onChange={(e) => set("reference", e.target.value)} /></div>
    <div><label className={label}>Grand total</label><div className={input + " bg-slate-50 font-semibold tabular-nums"}>AED {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</div></div>
    <div className="sm:col-span-2"><label className={label}>Notes</label><textarea rows={2} className={input} value={value.notes} onChange={(e) => set("notes", e.target.value)} /></div>
  </div>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}<div className="mt-5 flex justify-end"><button disabled={pending} className="rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save expense"}</button></div></form>;
}
