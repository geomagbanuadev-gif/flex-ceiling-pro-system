import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { fmtDate, money2 } from "@/utils/format";
import { loadFinanceWorkspace } from "../data";

export default async function ReceivablesPage(props: PageProps<"/finance/receivables">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await props.searchParams;
  const state = typeof search.state === "string" ? search.state : "";
  const aging = typeof search.aging === "string" ? search.aging : "";
  const exportQuery = new URLSearchParams({ report: "receivables" });
  if (state) exportQuery.set("state", state);
  if (aging) exportQuery.set("aging", aging);
  const { receivables } = await loadFinanceWorkspace();
  const rows = receivables.filter((row) => (!state || row.state === state) && (!aging || row.aging === aging));
  return <AppShell active="finance" title="Accounts Receivable" subtitle="Issued invoices less issued receipts" action={<div className="flex gap-2"><Link href="/finance" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">← Finance</Link><a href={`/finance/export?${exportQuery}&format=pdf`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">PDF</a><a href={`/finance/export?${exportQuery}&format=xlsx`} className="rounded-xl bg-navy px-4 py-2 text-sm text-white">Excel</a></div>}>
    <form className="mb-5 flex flex-wrap gap-2"><select name="state" defaultValue={state} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All payment states</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option></select><select name="aging" defaultValue={aging} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All aging</option><option value="current">Current</option><option value="1-30">1–30 days</option><option value="31-60">31–60 days</option><option value="61-90">61–90 days</option><option value="over-90">Over 90 days</option><option value="no-due-date">Due date not set</option></select><button className="rounded-xl bg-navy px-4 py-2 text-sm text-white">Filter</button></form>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Invoice date</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Aging</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3"><Link className="font-semibold text-navy" href={`/quotes/${row.id}`}>{row.number}</Link>{row.legacyPaid && <p className="text-[11px] text-amber-600">Legacy paid status; no linked receipt</p>}{row.excess > 0 && <p className="text-[11px] text-amber-600">Excess receipt {money2(row.excess)}</p>}</td><td className="px-4 py-3">{row.client}</td><td className="px-4 py-3">{row.project}</td><td className="px-4 py-3">{fmtDate(row.invoiceDate)}</td><td className="px-4 py-3">{row.dueDate ? fmtDate(row.dueDate) : "Due date not set"}</td><td className="px-4 py-3 capitalize">{row.aging.replaceAll("-", " ")}</td><td className="px-4 py-3 text-right tabular-nums">{money2(row.total)}</td><td className="px-4 py-3 text-right tabular-nums">{money2(row.received)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money2(row.balance)}</td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No receivables match these filters.</td></tr>}</tbody></table></div>
  </AppShell>;
}
