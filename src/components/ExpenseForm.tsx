"use client";

import { useMemo, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveExpense, type ExpensePayload } from "@/app/expenses/actions";
import { calculateExpenseTotals, type ExpenseItemInput } from "@/utils/expense";

type Option = { id: string; name: string };
type Project = Option & { code: string | null; client_id: string };
type PurchaseOrder = { id: string; number: string; supplier_id: string | null; project_id: string | null; status: string | null };

const emptyItem = (): ExpenseItemInput => ({ productCode: "", description: "", quantity: 1, unit: "pcs", unitPrice: 0, discount: 0, vatRate: 5, serialNumber: "" });

export function ExpenseForm({ categories, clients, suppliers, projects, purchaseOrders, expense }: {
  categories: Option[];
  clients: Option[];
  suppliers: Option[];
  projects: Project[];
  purchaseOrders: PurchaseOrder[];
  expense?: Partial<ExpensePayload>;
}) {
  const [value, setValue] = useState<ExpensePayload>({
    id: expense?.id,
    expenseDate: expense?.expenseDate ?? new Date().toISOString().slice(0, 10),
    dueDate: expense?.dueDate ?? "",
    categoryId: expense?.categoryId ?? categories[0]?.id ?? "",
    description: expense?.description ?? "",
    payeeName: expense?.payeeName ?? "",
    supplierId: expense?.supplierId ?? null,
    clientId: expense?.clientId ?? null,
    projectId: expense?.projectId ?? null,
    purchaseOrderId: expense?.purchaseOrderId ?? null,
    supplierInvoiceNumber: expense?.supplierInvoiceNumber ?? "",
    status: expense?.status ?? "draft",
    subtotal: expense?.subtotal ?? 0,
    vatAmount: expense?.vatAmount ?? 0,
    vatRecoverable: expense?.vatRecoverable ?? false,
    reference: expense?.reference ?? "",
    notes: expense?.notes ?? "",
    items: expense?.items ?? [],
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const itemTotals = useMemo(() => calculateExpenseTotals(value.items), [value.items]);
  const itemized = value.items.length > 0;
  const subtotal = itemized ? itemTotals.subtotal : value.subtotal;
  const vatAmount = itemized ? itemTotals.vatAmount : value.vatAmount;
  const total = subtotal + vatAmount;
  const set = <K extends keyof ExpensePayload>(key: K, next: ExpensePayload[K]) => setValue((current) => ({ ...current, [key]: next }));
  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15 disabled:bg-slate-50 disabled:text-slate-500";
  const compactInput = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const label = "text-xs font-medium text-slate-500";

  function pickProject(id: string) {
    const project = projects.find((item) => item.id === id);
    const purchaseOrder = purchaseOrders.find((item) => item.id === value.purchaseOrderId);
    setValue((current) => ({ ...current, projectId: id || null, clientId: project?.client_id ?? current.clientId, purchaseOrderId: purchaseOrder?.project_id && purchaseOrder.project_id !== (id || null) ? null : current.purchaseOrderId }));
  }

  function pickSupplier(id: string) {
    const purchaseOrder = purchaseOrders.find((item) => item.id === value.purchaseOrderId);
    setValue((current) => ({ ...current, supplierId: id || null, purchaseOrderId: purchaseOrder?.supplier_id && purchaseOrder.supplier_id !== (id || null) ? null : current.purchaseOrderId }));
  }

  function pickPurchaseOrder(id: string) {
    const purchaseOrder = purchaseOrders.find((item) => item.id === id);
    const project = projects.find((item) => item.id === purchaseOrder?.project_id);
    setValue((current) => ({
      ...current,
      purchaseOrderId: id || null,
      supplierId: purchaseOrder?.supplier_id ?? current.supplierId,
      projectId: purchaseOrder?.project_id ?? current.projectId,
      clientId: project?.client_id ?? current.clientId,
    }));
  }

  function updateItem(index: number, key: keyof ExpenseItemInput, next: string | number) {
    setValue((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: next } : item) }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    start(async () => {
      try {
        await saveExpense({ ...value, subtotal, vatAmount });
      } catch (caught) {
        unstable_rethrow(caught);
        setError(caught instanceof Error ? caught.message : "Could not save expense");
      }
    });
  }

  return <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className={label}>Expense date *</label><input type="date" className={input} value={value.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} /></div>
      <div><label className={label}>Payment due date</label><input type="date" className={input} value={value.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
      <div><label className={label}>Category *</label><select className={input} value={value.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div><label className={label}>Status</label><select className={input} value={value.status} onChange={(e) => set("status", e.target.value as ExpensePayload["status"])}><option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option></select></div>
      <div className="sm:col-span-2"><label className={label}>Description *</label><input className={input} value={value.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div><label className={label}>Payee name</label><input className={input} value={value.payeeName} onChange={(e) => set("payeeName", e.target.value)} /></div>
      <div><label className={label}>Known supplier</label><select className={input} value={value.supplierId ?? ""} onChange={(e) => pickSupplier(e.target.value)}><option value="">— None —</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div><label className={label}>Supplier invoice number</label><input className={input} value={value.supplierInvoiceNumber} onChange={(e) => set("supplierInvoiceNumber", e.target.value)} placeholder="e.g. SI-10482" /></div>
      <div><label className={label}>Related purchase order</label><select className={input} value={value.purchaseOrderId ?? ""} onChange={(e) => pickPurchaseOrder(e.target.value)}><option value="">— None —</option>{purchaseOrders.filter((po) => !value.supplierId || !po.supplier_id || po.supplier_id === value.supplierId).map((po) => <option key={po.id} value={po.id} disabled={po.status === "cancelled" && po.id !== value.purchaseOrderId}>{po.number}{po.status === "cancelled" ? " (cancelled)" : ""}</option>)}</select><p className="mt-1.5 text-xs text-slate-400">Reference only; payment and payable tracking stays on the PO.</p></div>
      <div><label className={label}>Client</label><select className={input} value={value.clientId ?? ""} onChange={(e) => setValue((current) => ({ ...current, clientId: e.target.value || null, projectId: current.projectId && projects.some((project) => project.id === current.projectId && project.client_id === e.target.value) ? current.projectId : null }))}><option value="">— General overhead —</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      <div><label className={label}>Project</label><select className={input} value={value.projectId ?? ""} onChange={(e) => pickProject(e.target.value)}><option value="">— Unassigned —</option>{projects.filter((project) => !value.clientId || project.client_id === value.clientId).map((project) => <option key={project.id} value={project.id}>{project.code ? `${project.code} — ` : ""}{project.name}</option>)}</select></div>
      <div><label className={label}>Reference</label><input className={input} value={value.reference} onChange={(e) => set("reference", e.target.value)} /></div>
    </div>

    <div className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-slate-900">Expense items</h2><p className="mt-1 text-xs text-slate-500">Optional for supplier invoices. Leave empty for salary, petrol, rent, and other simple expenses.</p></div>
        <button type="button" onClick={() => set("items", [...value.items, emptyItem()])} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-navy">+ Add item</button>
      </div>
      {itemized && <div className="mt-4 space-y-3">{itemTotals.items.map((calculated, index) => <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Description *</label><input className={compactInput} value={value.items[index].description} onChange={(e) => updateItem(index, "description", e.target.value)} /></div>
          <div><label className={label}>Product code</label><input className={compactInput} value={value.items[index].productCode} onChange={(e) => updateItem(index, "productCode", e.target.value)} /></div>
          <div><label className={label}>Serial number</label><input className={compactInput} value={value.items[index].serialNumber} onChange={(e) => updateItem(index, "serialNumber", e.target.value)} /></div>
          <div className="flex items-end"><button type="button" onClick={() => set("items", value.items.filter((_, itemIndex) => itemIndex !== index))} className="mb-0.5 text-sm font-medium text-red-600">Remove</button></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div><label className={label}>Quantity</label><input type="number" min="0.0001" step="any" className={compactInput} value={value.items[index].quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} /></div>
          <div><label className={label}>Unit</label><input className={compactInput} value={value.items[index].unit} onChange={(e) => updateItem(index, "unit", e.target.value)} /></div>
          <div><label className={label}>Unit price</label><input type="number" min="0" step="0.01" className={compactInput} value={value.items[index].unitPrice || ""} onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))} /></div>
          <div><label className={label}>Discount</label><input type="number" min="0" step="0.01" className={compactInput} value={value.items[index].discount || ""} onChange={(e) => updateItem(index, "discount", Number(e.target.value))} /></div>
          <div><label className={label}>VAT %</label><input type="number" min="0" step="0.01" className={compactInput} value={value.items[index].vatRate} onChange={(e) => updateItem(index, "vatRate", Number(e.target.value))} /></div>
          <div><label className={label}>Line total</label><div className={compactInput + " bg-white font-semibold tabular-nums"}>AED {calculated.totalAmount.toFixed(2)}</div></div>
        </div>
      </div>)}</div>}
    </div>

    <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
      <div><label className={label}>Subtotal (AED)</label><input type="number" min="0" step="0.01" disabled={itemized} className={input} value={subtotal || ""} onChange={(e) => set("subtotal", Number(e.target.value) || 0)} /></div>
      <div><label className={label}>VAT amount (AED)</label><input type="number" min="0" step="0.01" disabled={itemized} className={input} value={vatAmount || ""} onChange={(e) => set("vatAmount", Number(e.target.value) || 0)} /><label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={value.vatRecoverable} onChange={(e) => set("vatRecoverable", e.target.checked)} /> VAT is recoverable</label></div>
      <div><label className={label}>Grand total</label><div className={input + " bg-slate-50 font-semibold tabular-nums"}>AED {total.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      <div><label className={label}>Notes</label><textarea rows={2} className={input} value={value.notes} onChange={(e) => set("notes", e.target.value)} /></div>
    </div>
    {!value.id && <p className="mt-4 text-xs text-slate-500">After saving, you can attach the supplier invoice PDF or image to this expense.</p>}
    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="mt-5 flex justify-end"><button disabled={pending} className="rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save expense"}</button></div>
  </form>;
}
