import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { money2 } from "@/utils/format";
import { loadFinanceWorkspace } from "./data";

export default async function FinancePage(props: PageProps<"/finance">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await props.searchParams;
  const from = typeof search.from === "string" ? search.from : "";
  const to = typeof search.to === "string" ? search.to : "";
  const { summary, unappliedReceipts, unassignedCount } = await loadFinanceWorkspace({ from: from || undefined, to: to || undefined });
  const cards = [
    ["Invoiced net sales", summary.netSales, "Invoice value excluding VAT", "/quotes?type=invoice"],
    ["Money received", summary.moneyReceived, "Issued receipts in period", "/quotes?type=receipt"],
    ["Outstanding receivables", summary.receivables, "Live amount clients owe", "/finance/receivables"],
    ["Committed costs", summary.committedCosts, "PO and posted expense costs", "/finance/payables"],
    ["Money paid", summary.moneyPaid, "PO and expense payments in period", "/finance/payables"],
    ["Outstanding payables", summary.payables, "Live amount still owed", "/finance/payables"],
    ["Margin", summary.projectMargin, "Net sales minus committed costs", "/projects"],
    ["Net cash", summary.netCash, "Money received minus money paid", "/finance"],
  ] as const;
  return <AppShell active="finance" title="Finance" subtitle="Live balances plus invoiced margin and cash movement">
    <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"><label className="text-xs text-slate-500">From<input name="from" type="date" defaultValue={from} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><label className="text-xs text-slate-500">To<input name="to" type="date" defaultValue={to} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white">Apply period</button>{(from || to) && <Link href="/finance" className="px-2 py-2 text-sm text-slate-600">All time</Link>}<p className="basis-full text-xs text-slate-500">Period applies to sales, costs, and cash movement. Outstanding balances remain live.</p></form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, amount, detail, href]) => <Link key={label} href={href} className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold tabular-nums ${amount < 0 ? "text-red-600" : "text-slate-900"}`}>{money2(amount)}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Link>)}</div>
    {(unappliedReceipts.length > 0 || unassignedCount > 0) && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Reconciliation needed</p><p className="mt-1">{unappliedReceipts.length} issued receipt(s) are not applied to an invoice. {unassignedCount} record(s) are not assigned to a project.</p></div>}
  </AppShell>;
}
