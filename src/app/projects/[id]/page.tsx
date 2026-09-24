import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectForm } from "@/components/ProjectForm";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeProjects } from "@/utils/profile";
import { calculateFinanceTotals } from "@/utils/finance";
import { fmtDate, money2 } from "@/utils/format";

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  const profile = await getProfile();
  if (!profile || !canSeeProjects(profile.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: project }, { data: clients }, { data: documents }, { data: purchaseOrders }, { data: expenses }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("documents").select("id, number, type, status, doc_date, client_name, subtotal, discount, grand_total, applies_to_invoice_id").eq("project_id", id).order("doc_date", { ascending: false }),
    supabase.from("purchase_orders").select("id, number, status, po_date, supplier_name, subtotal, discount, grand_total").eq("project_id", id).order("po_date", { ascending: false }),
    supabase.from("expenses").select("id, expense_date, description, status, subtotal, vat_amount, vat_recoverable, grand_total").eq("project_id", id).order("expense_date", { ascending: false }),
  ]);
  if (!project) notFound();
  const poIds = (purchaseOrders ?? []).map((po) => po.id);
  const expenseIds = (expenses ?? []).map((expense) => expense.id);
  const [{ data: purchasePayments }, { data: expensePayments }] = await Promise.all([
    poIds.length ? supabase.from("purchase_payments").select("purchase_order_id, amount").in("purchase_order_id", poIds) : Promise.resolve({ data: [] }),
    expenseIds.length ? supabase.from("expense_payments").select("expense_id, amount").in("expense_id", expenseIds) : Promise.resolve({ data: [] }),
  ]);
  const totals = calculateFinanceTotals({ invoices: (documents ?? []).filter((doc) => doc.type === "invoice"), receipts: (documents ?? []).filter((doc) => doc.type === "receipt"), purchaseOrders: purchaseOrders ?? [], purchasePayments: purchasePayments ?? [], expenses: expenses ?? [], expensePayments: expensePayments ?? [] });
  const cards = [["Net sales", totals.netSales], ["Received", totals.moneyReceived], ["Committed costs", totals.committedCosts], ["Money paid", totals.moneyPaid], ["Margin", totals.projectMargin], ["Net cash", totals.netCash]] as const;

  return <AppShell active="projects" title={project.name} subtitle={project.code || "Client project"} action={<Link href="/projects" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">← Projects</Link>}>
    {profile.role === "super" && <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([label, amount]) => <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-semibold tabular-nums ${label === "Margin" && amount < 0 ? "text-red-600" : "text-slate-900"}`}>{money2(amount)}</p></div>)}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6">
      <ProjectTable title="Sales documents" empty="No sales documents linked." headers={["Number", "Type", "Date", "Status", "Total"]} rows={(documents ?? []).map((doc) => [<Link key={doc.id} className="font-semibold text-navy" href={`/quotes/${doc.id}`}>{doc.number}</Link>, doc.type, fmtDate(doc.doc_date), doc.status, money2(doc.grand_total)])} />
      <ProjectTable title="Purchase orders" empty="No purchase orders linked." headers={["Number", "Supplier", "Date", "Status", "Total"]} rows={(purchaseOrders ?? []).map((po) => [<Link key={po.id} className="font-semibold text-navy" href={`/purchase-orders/${po.id}`}>{po.number}</Link>, po.supplier_name || "—", fmtDate(po.po_date), po.status, money2(po.grand_total)])} />
      {profile.role === "super" && <ProjectTable title="Expenses" empty="No expenses linked." headers={["Date", "Description", "Status", "Total"]} rows={(expenses ?? []).map((expense) => [fmtDate(expense.expense_date), <Link key={expense.id} className="font-semibold text-navy" href={`/expenses/${expense.id}`}>{expense.description}</Link>, expense.status, money2(expense.grand_total)])} />}
    </div><div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Project details</h2><ProjectForm clients={clients ?? []} project={{ id: project.id, clientId: project.client_id, code: project.code ?? "", name: project.name, status: project.status, startDate: project.start_date ?? "", endDate: project.end_date ?? "", notes: project.notes ?? "" }} /></div></div>
  </AppShell>;
}

function ProjectTable({ title, headers, rows, empty }: { title: string; headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <section><h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2><div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 capitalize text-slate-700">{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>}</tbody></table></div></section>;
}
