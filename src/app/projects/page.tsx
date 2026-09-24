import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeProjects } from "@/utils/profile";
import { calculateFinanceTotals } from "@/utils/finance";
import { money2 } from "@/utils/format";

export default async function ProjectsPage() {
  const profile = await getProfile();
  if (!profile || !canSeeProjects(profile.role)) redirect("/");
  const showFinance = profile.role === "super";
  const supabase = await createClient();
  const { data: projects, error } = await supabase.from("projects").select("id, code, name, status, client_id, clients(name)").order("name");
  if (error) throw new Error(`Projects require the finance migration: ${error.message}`);
  const ids = (projects ?? []).map((project) => project.id);
  const [{ data: documents }, { data: purchaseOrders }, { data: expenses }] = ids.length ? await Promise.all([
    supabase.from("documents").select("id, type, status, project_id, subtotal, discount, grand_total, applies_to_invoice_id").in("project_id", ids),
    supabase.from("purchase_orders").select("id, status, project_id, subtotal, discount, grand_total").in("project_id", ids),
    showFinance ? supabase.from("expenses").select("id, status, project_id, subtotal, vat_amount, vat_recoverable, grand_total").in("project_id", ids) : Promise.resolve({ data: [] }),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const poIds = (purchaseOrders ?? []).map((po) => po.id);
  const expenseIds = (expenses ?? []).map((expense) => expense.id);
  const [{ data: purchasePayments }, { data: expensePayments }] = await Promise.all([
    poIds.length ? supabase.from("purchase_payments").select("purchase_order_id, amount").in("purchase_order_id", poIds) : Promise.resolve({ data: [] }),
    expenseIds.length ? supabase.from("expense_payments").select("expense_id, amount").in("expense_id", expenseIds) : Promise.resolve({ data: [] }),
  ]);

  return (
    <AppShell active="projects" title="Projects" subtitle="Sales, purchases, expenses, and cash grouped by client job" action={<div className="flex gap-2">{showFinance && <><a href="/finance/export?report=projects&format=pdf" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">PDF</a><a href="/finance/export?report=projects&format=xlsx" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Excel</a></>}<Link href="/projects/new" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">+ New Project</Link></div>}>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th>{showFinance && <><th className="px-4 py-3 text-right">Net sales</th><th className="px-4 py-3 text-right">Costs</th><th className="px-4 py-3 text-right">Margin</th><th className="px-4 py-3 text-right">Net cash</th></>}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(projects ?? []).map((project) => {
              const docs = (documents ?? []).filter((doc) => doc.project_id === project.id);
              const pos = (purchaseOrders ?? []).filter((po) => po.project_id === project.id);
              const projectExpenses = (expenses ?? []).filter((expense) => expense.project_id === project.id);
              const totals = calculateFinanceTotals({
                invoices: docs.filter((doc) => doc.type === "invoice"),
                receipts: docs.filter((doc) => doc.type === "receipt"),
                purchaseOrders: pos,
                purchasePayments: (purchasePayments ?? []).filter((payment) => pos.some((po) => po.id === payment.purchase_order_id)),
                expenses: projectExpenses,
                expensePayments: (expensePayments ?? []).filter((payment) => projectExpenses.some((expense) => expense.id === payment.expense_id)),
              });
              const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
              return <LinkRow key={project.id} href={`/projects/${project.id}`} className="hover:bg-slate-50"><td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/projects/${project.id}`}>{project.name}</Link>{project.code && <span className="ml-2 text-xs text-slate-400">{project.code}</span>}</td><td className="px-4 py-3 text-slate-600">{client?.name ?? "—"}</td><td className="px-4 py-3 capitalize text-slate-600">{project.status}</td>{showFinance && <><td className="px-4 py-3 text-right tabular-nums">{money2(totals.netSales)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(totals.committedCosts)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${totals.projectMargin < 0 ? "text-red-600" : "text-green-700"}`}>{money2(totals.projectMargin)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(totals.netCash)}</td></>}</LinkRow>;
            })}
            {!projects?.length && <tr><td colSpan={showFinance ? 7 : 3} className="px-4 py-12 text-center text-slate-500">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
