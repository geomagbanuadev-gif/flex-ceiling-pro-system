import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { paymentState, outstandingBalance } from "@/utils/finance";

export default async function ExpensesPage(props: PageProps<"/expenses">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await props.searchParams;
  const status = typeof search.status === "string" ? search.status : "";
  const supabase = await createClient();
  let query = supabase.from("expenses").select("id, expense_date, description, payee_name, status, grand_total, purchase_order_id, expense_categories(name), projects(name), clients(name)").order("expense_date", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: expenses, error } = await query;
  if (error) throw new Error(`Expenses require the finance migration: ${error.message}`);
  const ids = (expenses ?? []).map((expense) => expense.id);
  const { data: payments } = ids.length ? await supabase.from("expense_payments").select("expense_id, amount").in("expense_id", ids) : { data: [] };
  const paidByExpense = new Map<string, number>();
  for (const payment of payments ?? []) paidByExpense.set(payment.expense_id, (paidByExpense.get(payment.expense_id) ?? 0) + (Number(payment.amount) || 0));

  return <AppShell active="expenses" title="Expenses" subtitle="Operating costs and supplier invoice records" action={<div className="flex gap-2"><a href="/finance/export?report=expenses&format=pdf" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">PDF</a><a href="/finance/export?report=expenses&format=xlsx" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Excel</a><Link href="/expenses/new" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">+ New Expense</Link></div>}>
    <form className="mb-5 flex gap-2"><select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option></select><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">Filter</button></form>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Expense</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Client / project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">
      {(expenses ?? []).map((expense) => { const paid = paidByExpense.get(expense.id) ?? 0; const linked = Boolean(expense.purchase_order_id); const category = Array.isArray(expense.expense_categories) ? expense.expense_categories[0] : expense.expense_categories; const client = Array.isArray(expense.clients) ? expense.clients[0] : expense.clients; const project = Array.isArray(expense.projects) ? expense.projects[0] : expense.projects; return <LinkRow key={expense.id} href={`/expenses/${expense.id}`} className="hover:bg-slate-50"><td className="px-4 py-3">{fmtDate(expense.expense_date)}</td><td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/expenses/${expense.id}`}>{expense.description}</Link><p className="text-xs text-slate-500">{expense.payee_name || "No payee"}</p></td><td className="px-4 py-3">{category?.name ?? "—"}</td><td className="px-4 py-3">{project?.name || client?.name || "General overhead"}</td><td className="px-4 py-3 capitalize">{expense.status}</td><td className="px-4 py-3 capitalize">{linked ? "Tracked on PO" : paymentState(expense.grand_total, paid)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(expense.grand_total)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{linked ? "—" : money2(outstandingBalance(expense.grand_total, paid))}</td></LinkRow>; })}
      {!expenses?.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No expenses found.</td></tr>}
    </tbody></table></div>
  </AppShell>;
}
