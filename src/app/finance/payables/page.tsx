import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { loadPayables } from "../data";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZES } from "@/utils/pagination";

export default async function PayablesPage(props: PageProps<"/finance/payables">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await props.searchParams;
  const state = typeof search.state === "string" ? search.state : "";
  const source = typeof search.source === "string" ? search.source : "";
  const aging = typeof search.aging === "string" ? search.aging : "";
  const page = Math.max(1, parseInt(typeof search.page === "string" ? search.page : "") || 1);
  const sizeRaw = parseInt(typeof search.size === "string" ? search.size : "") || 20;
  const pageSize = PAGE_SIZES.includes(sizeRaw) ? sizeRaw : 20;
  const exportQuery = new URLSearchParams({ report: "payables" });
  if (state) exportQuery.set("state", state);
  if (source) exportQuery.set("source", source);
  if (aging) exportQuery.set("aging", aging);
  const { rows, count } = await loadPayables({ state, source, aging, page, pageSize });
  return <AppShell active="finance" title="Accounts Payable" subtitle="Active purchase orders and posted expenses less payments" action={<div className="flex gap-2"><Link href="/finance" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">← Finance</Link><a href={`/finance/export?${exportQuery}&format=pdf`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">PDF</a><a href={`/finance/export?${exportQuery}&format=xlsx`} className="rounded-xl bg-navy px-4 py-2 text-sm text-white">Excel</a></div>}>
    <form className="mb-5 flex flex-wrap gap-2"><select name="source" defaultValue={source} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All sources</option><option>Purchase order</option><option>Expense</option></select><select name="state" defaultValue={state} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All payment states</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option></select><select name="aging" defaultValue={aging} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All aging</option><option value="current">Current</option><option value="1-30">1–30 days</option><option value="31-60">31–60 days</option><option value="61-90">61–90 days</option><option value="over-90">Over 90 days</option><option value="no-due-date">Due date not set</option></select>{pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}<button className="rounded-xl bg-navy px-4 py-2 text-sm text-white">Filter</button></form>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Supplier / payee</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Aging</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={`${row.source}-${row.id}`}><td className="px-4 py-3">{row.source}</td><td className="px-4 py-3"><Link className="font-semibold text-navy" href={row.href}>{row.number}</Link></td><td className="px-4 py-3">{row.payee}</td><td className="px-4 py-3">{row.project}</td><td className="px-4 py-3">{fmtDate(row.date)}</td><td className="px-4 py-3">{row.dueDate ? fmtDate(row.dueDate) : "Due date not set"}</td><td className="px-4 py-3 capitalize">{row.aging.replaceAll("-", " ")}</td><td className="px-4 py-3 text-right tabular-nums">{money2(row.total)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(row.paid)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money2(row.balance)}</td></tr>)}{!rows.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">No payables match these filters.</td></tr>}</tbody></table></div><Pagination page={page} pageSize={pageSize} total={count} />
  </AppShell>;
}
