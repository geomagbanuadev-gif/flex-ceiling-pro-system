import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { paymentState, outstandingBalance } from "@/utils/finance";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";
import { dateQueryParam, postgrestSearchTerm, uuidQueryParam } from "@/utils/query";

export default async function ExpensesPage(props: PageProps<"/expenses">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await props.searchParams;
  const status = typeof search.status === "string" ? search.status : "";
  const q = postgrestSearchTerm(typeof search.q === "string" ? search.q : "");
  const category = uuidQueryParam(search.category);
  const supplier = uuidQueryParam(search.supplier);
  const project = uuidQueryParam(search.project);
  const dateFrom = dateQueryParam(search.from);
  const dateTo = dateQueryParam(search.to);
  const page = Math.max(1, parseInt(typeof search.page === "string" ? search.page : "") || 1);
  const requestedSize = parseInt(typeof search.size === "string" ? search.size : "") || 20;
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 20;
  const from = (page - 1) * pageSize;
  const supabase = await createClient();
  let query = supabase.from("expenses").select("id, expense_date, description, payee_name, status, grand_total, purchase_order_id, expense_categories(name), projects(name), clients(name)", { count: "exact" }).order("expense_date", { ascending: false }).order("id", { ascending: false }).range(from, from + pageSize - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`description.ilike.%${q}%,payee_name.ilike.%${q}%,supplier_invoice_number.ilike.%${q}%,reference.ilike.%${q}%`);
  if (category) query = query.eq("category_id", category);
  if (supplier) query = query.eq("supplier_id", supplier);
  if (project) query = query.eq("project_id", project);
  if (dateFrom) query = query.gte("expense_date", dateFrom);
  if (dateTo) query = query.lte("expense_date", dateTo);
  const [{ data: expenses, error, count }, { data: categories }, { data: suppliers }, { data: projects }] = await Promise.all([
    query,
    supabase.from("expense_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name, code").neq("status", "cancelled").order("name"),
  ]);
  if (error) throw new Error(`Expenses require the finance migration: ${error.message}`);
  const ids = (expenses ?? []).map((expense) => expense.id);
  const { data: payments } = ids.length ? await supabase.from("expense_payments").select("expense_id, amount").in("expense_id", ids) : { data: [] };
  const paidByExpense = new Map<string, number>();
  for (const payment of payments ?? []) paidByExpense.set(payment.expense_id, (paidByExpense.get(payment.expense_id) ?? 0) + (Number(payment.amount) || 0));

  const exportQuery = new URLSearchParams({ report: "expenses" });
  for (const [key, value] of Object.entries({ q, status, category, supplier, project, from: dateFrom, to: dateTo })) if (value) exportQuery.set(key, value);

  return <AppShell active="expenses" title="Expenses" subtitle="Operating costs and supplier invoice records" action={<div className="flex gap-2"><a href={`/finance/export?${exportQuery}&format=pdf`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">PDF</a><a href={`/finance/export?${exportQuery}&format=xlsx`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Excel</a><Link href="/expenses/new" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">+ New Expense</Link></div>}>
    <form className="mb-5 grid gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2 xl:grid-cols-4"><input name="q" defaultValue={q} placeholder="Search expense, payee, invoice…" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option></select><select name="category" defaultValue={category} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All categories</option>{(categories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="supplier" defaultValue={supplier} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All suppliers</option>{(suppliers ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="project" defaultValue={project} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All projects</option>{(projects ?? []).map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} — ` : ""}{item.name}</option>)}</select><label className="text-xs text-slate-500">From<input name="from" type="date" defaultValue={dateFrom} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><label className="text-xs text-slate-500">To<input name="to" type="date" defaultValue={dateTo} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><div className="flex items-end gap-2"><button className="rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white">Apply filters</button><Link href="/expenses" className="px-3 py-2 text-sm text-slate-500">Clear</Link></div>{pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}</form>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Expense</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Client / project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">
      {(expenses ?? []).map((expense) => { const paid = paidByExpense.get(expense.id) ?? 0; const linked = Boolean(expense.purchase_order_id); const category = Array.isArray(expense.expense_categories) ? expense.expense_categories[0] : expense.expense_categories; const client = Array.isArray(expense.clients) ? expense.clients[0] : expense.clients; const project = Array.isArray(expense.projects) ? expense.projects[0] : expense.projects; return <LinkRow key={expense.id} href={`/expenses/${expense.id}`} className="hover:bg-slate-50"><td className="px-4 py-3">{fmtDate(expense.expense_date)}</td><td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/expenses/${expense.id}`}>{expense.description}</Link><p className="text-xs text-slate-500">{expense.payee_name || "No payee"}</p></td><td className="px-4 py-3">{category?.name ?? "—"}</td><td className="px-4 py-3">{project?.name || client?.name || "General overhead"}</td><td className="px-4 py-3 capitalize">{expense.status}</td><td className="px-4 py-3 capitalize">{linked ? "Tracked on PO" : paymentState(expense.grand_total, paid)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(expense.grand_total)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{linked ? "—" : money2(outstandingBalance(expense.grand_total, paid))}</td></LinkRow>; })}
      {!expenses?.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No expenses found.</td></tr>}
    </tbody></table></div><Pagination page={page} pageSize={pageSize} total={count ?? 0} />
  </AppShell>;
}
