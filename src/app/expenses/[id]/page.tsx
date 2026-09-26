import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensePaymentLog } from "@/components/ExpensePaymentLog";
import { ExpenseAttachment } from "@/components/ExpenseAttachment";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { deleteExpense } from "@/app/expenses/actions";
import { fmtDate, money2 } from "@/utils/format";

export default async function ExpenseDetailPage(props: PageProps<"/expenses/[id]">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const { id } = await props.params;
  const search = await props.searchParams;
  const editing = search.edit === "1";
  const supabase = await createClient();
  const [{ data: expense }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from("expenses").select("*, expense_categories(name), clients(name), suppliers(name), projects(name)").eq("id", id).maybeSingle(),
    supabase.from("expense_items").select("*").eq("expense_id", id).order("sort_order"),
    supabase.from("expense_payments").select("*").eq("expense_id", id).order("payment_date", { ascending: false }),
  ]);
  if (!expense) notFound();
  const optionResults = editing ? await Promise.all([
    supabase.from("expense_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name, code, client_id").neq("status", "cancelled").order("name"),
    supabase.from("purchase_orders").select("id, number, supplier_id, project_id, status").order("po_date", { ascending: false }),
  ]) : [];
  const categories = optionResults[0]?.data ?? [];
  const clients = optionResults[1]?.data ?? [];
  const suppliers = optionResults[2]?.data ?? [];
  const projects = optionResults[3]?.data ?? [];
  const purchaseOrders = optionResults[4]?.data ?? [];
  const { data: linkedPurchaseOrder } = expense.purchase_order_id
    ? await supabase.from("purchase_orders").select("id, number").eq("id", expense.purchase_order_id).maybeSingle()
    : { data: null };
  const paymentIds = (payments ?? []).map((payment) => payment.id);
  const { data: bankAllocations } = paymentIds.length ? await supabase.from("bank_transaction_allocations").select("expense_payment_id, bank_transaction_id").in("expense_payment_id", paymentIds) : { data: [] };
  const bankLinks = Object.fromEntries((bankAllocations ?? []).map((allocation) => [allocation.expense_payment_id, allocation.bank_transaction_id]));
  const initial = {
    id: expense.id,
    expenseDate: expense.expense_date,
    dueDate: expense.due_date ?? "",
    categoryId: expense.category_id,
    description: expense.description,
    payeeName: expense.payee_name ?? "",
    supplierId: expense.supplier_id,
    clientId: expense.client_id,
    projectId: expense.project_id,
    purchaseOrderId: expense.purchase_order_id,
    supplierInvoiceNumber: expense.supplier_invoice_number ?? "",
    status: expense.status,
    subtotal: Number(expense.subtotal) || 0,
    vatAmount: Number(expense.vat_amount) || 0,
    vatRecoverable: Boolean(expense.vat_recoverable),
    reference: expense.reference ?? "",
    notes: expense.notes ?? "",
    items: (items ?? []).map((item) => ({ productCode: item.product_code ?? "", description: item.description, quantity: Number(item.quantity), unit: item.unit ?? "pcs", unitPrice: Number(item.unit_price), discount: Number(item.discount), vatRate: Number(item.vat_rate), serialNumber: item.serial_number ?? "" })),
  };
  const relationName = (value: { name: string } | { name: string }[] | null) => Array.isArray(value) ? value[0]?.name : value?.name;
  return <AppShell active="expenses" title={expense.description} action={<div className="flex flex-wrap gap-2"><Link href="/expenses" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">← Expenses</Link><Link href={editing ? `/expenses/${id}` : `/expenses/${id}?edit=1`} className="rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white">{editing ? "Close edit" : "Edit"}</Link>{expense.status === "draft" && <form action={deleteExpense.bind(null, id)}><button className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600">Delete draft</button></form>}</div>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">{editing ? <ExpenseForm categories={categories} clients={clients} suppliers={suppliers} projects={projects} purchaseOrders={purchaseOrders} expense={initial} /> : <section className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Date" value={fmtDate(expense.expense_date)} /><Detail label="Status" value={expense.status} /><Detail label="Category" value={relationName(expense.expense_categories) ?? "—"} /><Detail label="Payee" value={expense.payee_name || relationName(expense.suppliers) || "—"} /><Detail label="Supplier invoice" value={expense.supplier_invoice_number || "—"} /><Detail label="Client / project" value={relationName(expense.projects) || relationName(expense.clients) || "General overhead"} /><Detail label="Reference" value={expense.reference || "—"} /><Detail label="Due date" value={expense.due_date ? fmtDate(expense.due_date) : "Not set"} /><Detail label="VAT recoverable" value={expense.vat_recoverable ? "Yes" : "No"} /></div>{(items ?? []).length > 0 && <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Code / serial</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Discount</th><th className="px-3 py-2 text-right">VAT</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{(items ?? []).map((item) => <tr key={item.id}><td className="px-3 py-2">{item.description}</td><td className="px-3 py-2 text-slate-500">{[item.product_code, item.serial_number].filter(Boolean).join(" · ") || "—"}</td><td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td><td className="px-3 py-2 text-right">{money2(item.unit_price)}</td><td className="px-3 py-2 text-right">{money2(item.discount)}</td><td className="px-3 py-2 text-right">{money2(item.vat_amount)}</td><td className="px-3 py-2 text-right font-medium">{money2(item.total_amount)}</td></tr>)}</tbody></table></div>}<div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3"><Detail label="Subtotal" value={money2(expense.subtotal)} /><Detail label="VAT" value={money2(expense.vat_amount)} /><Detail label="Grand total" value={money2(expense.grand_total)} /></div>{expense.notes && <div className="mt-5"><p className="text-xs font-medium text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{expense.notes}</p></div>}</section>}<div className="space-y-6"><ExpenseAttachment expenseId={id} name={expense.attachment_name ?? null} size={expense.attachment_size == null ? null : Number(expense.attachment_size)} disabled={expense.status === "void"} />{linkedPurchaseOrder ? <section className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200"><h2 className="text-base font-semibold text-slate-900">Payment tracking</h2><p className="mt-2 text-sm text-slate-600">This supplier invoice is linked to <Link href={`/purchase-orders/${linkedPurchaseOrder.id}`} className="font-semibold text-navy">{linkedPurchaseOrder.number}</Link>. Record payments on the purchase order so costs are not counted twice.</p></section> : <ExpensePaymentLog expenseId={id} payments={payments ?? []} grandTotal={Number(expense.grand_total) || 0} status={expense.status} bankLinks={bankLinks} />}</div></div>
  </AppShell>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-xs font-medium text-slate-500">{label}</p><div className="mt-1 text-sm capitalize text-slate-800">{value}</div></div>;
}
