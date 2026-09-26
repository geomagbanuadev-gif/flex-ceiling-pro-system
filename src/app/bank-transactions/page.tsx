import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { Pagination } from "@/components/Pagination";
import { BANK_CLASSIFICATIONS, bankStatusLabel, bankTimeFromDescription } from "@/utils/bank";
import { fmtDate, money2 } from "@/utils/format";
import { PAGE_SIZES } from "@/utils/pagination";
import { canSeeFinance, getProfile } from "@/utils/profile";
import { dateQueryParam, postgrestSearchTerm, uuidQueryParam } from "@/utils/query";
import { createClient } from "@/utils/supabase/server";

type Search = { q?: string; direction?: string; status?: string; classification?: string; account?: string; from?: string; to?: string; page?: string; size?: string };

export default async function BankTransactionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const search = await searchParams;
  const q = postgrestSearchTerm(search.q || "");
  const direction = ["credit", "debit"].includes(search.direction || "") ? search.direction! : "";
  const status = ["unmatched", "partial", "matched", "excluded"].includes(search.status || "") ? search.status! : "";
  const classification = BANK_CLASSIFICATIONS.some(([value]) => value === search.classification) ? search.classification! : "";
  const account = uuidQueryParam(search.account);
  const dateFrom = dateQueryParam(search.from);
  const dateTo = dateQueryParam(search.to);
  const page = Math.max(1, parseInt(search.page || "") || 1);
  const requestedSize = parseInt(search.size || "") || 20;
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : 20;
  const from = (page - 1) * pageSize;
  const supabase = await createClient();
  let query = supabase.from("bank_transactions").select("id, booking_date, direction, amount, description_raw, counterparty, transaction_type, classification, reconciliation_status, bank_accounts(bank_name, account_last4, currency)", { count: "exact" }).order("booking_date", { ascending: false }).order("source_order", { ascending: false }).range(from, from + pageSize - 1);
  if (q) query = query.or(`description_raw.ilike.%${q}%,counterparty.ilike.%${q}%,bank_reference.ilike.%${q}%`);
  if (direction) query = query.eq("direction", direction);
  if (status) query = query.eq("reconciliation_status", status);
  if (classification) query = query.eq("classification", classification);
  if (account) query = query.eq("bank_account_id", account);
  if (dateFrom) query = query.gte("booking_date", dateFrom);
  if (dateTo) query = query.lte("booking_date", dateTo);
  const [{ data: rows, error, count }, { data: accounts }, { data: summary, error: summaryError }] = await Promise.all([
    query,
    supabase.from("bank_accounts").select("id, bank_name, account_last4, currency").eq("active", true).order("bank_name"),
    supabase.rpc("bank_transaction_summary", { p_from: dateFrom || null, p_to: dateTo || null, p_account: account || null, p_direction: direction || null, p_status: status || null, p_classification: classification || null, p_search: q || null }),
  ]);
  if (error || summaryError) throw new Error(`Bank transactions require supabase/bank-transactions.sql: ${error?.message || summaryError?.message}`);
  const totals = (summary || {}) as { count?: number; credits?: number; debits?: number; matched?: number; partial?: number; unmatched?: number; excluded?: number };
  return <AppShell active="bank-transactions" title="Bank Transactions" subtitle="Monthly statement activity and reconciliation" action={<Link href="/bank-transactions/imports" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium">Statement imports</Link>}>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Transactions", String(totals.count ?? 0)], ["Money in", money2(totals.credits ?? 0)], ["Money out", money2(totals.debits ?? 0)], ["Needs review", String((totals.unmatched ?? 0) + (totals.partial ?? 0))]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p></div>)}
    </div>
    <form className="mb-5 grid gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2 xl:grid-cols-4">
      <input name="q" defaultValue={q} placeholder="Search description, party, reference…" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      <select name="direction" defaultValue={direction} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Money in and out</option><option value="credit">Money in</option><option value="debit">Money out</option></select>
      <select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All reconciliation</option><option value="unmatched">Unmatched</option><option value="partial">Partially matched</option><option value="matched">Matched</option><option value="excluded">Excluded</option></select>
      <select name="classification" defaultValue={classification} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All classifications</option>{BANK_CLASSIFICATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select name="account" defaultValue={account} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All bank accounts</option>{(accounts ?? []).map((item) => <option key={item.id} value={item.id}>{item.bank_name} · •••• {item.account_last4} · {item.currency}</option>)}</select>
      <label className="text-xs text-slate-500">From<input name="from" type="date" defaultValue={dateFrom} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>
      <label className="text-xs text-slate-500">To<input name="to" type="date" defaultValue={dateTo} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label>
      <div className="flex items-end gap-2"><button className="rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white">Apply filters</button><Link href="/bank-transactions" className="px-3 py-2 text-sm text-slate-500">Clear</Link></div>
      {pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}
    </form>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Classification</th><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3 text-right">Money out</th><th className="px-4 py-3 text-right">Money in</th></tr></thead><tbody className="divide-y divide-slate-100">
      {(rows ?? []).map((row) => { const time = bankTimeFromDescription(row.description_raw); return <LinkRow key={row.id} href={`/bank-transactions/${row.id}`} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3">{fmtDate(row.booking_date)}{time && <span className="mt-0.5 block text-xs text-slate-400">{time}</span>}</td><td className="max-w-xl px-4 py-3"><Link href={`/bank-transactions/${row.id}`} className="font-semibold text-navy">{row.counterparty || row.transaction_type || "Bank transaction"}</Link><p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.description_raw}</p></td><td className="px-4 py-3">{BANK_CLASSIFICATIONS.find(([value]) => value === row.classification)?.[1] || "Unclassified"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.reconciliation_status === "matched" ? "bg-emerald-50 text-emerald-700" : row.reconciliation_status === "excluded" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{bankStatusLabel(row.reconciliation_status)}</span></td><td className="px-4 py-3 text-right font-medium tabular-nums text-red-700">{row.direction === "debit" ? money2(row.amount) : "—"}</td><td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-700">{row.direction === "credit" ? money2(row.amount) : "—"}</td></LinkRow>; })}
      {!rows?.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No bank transactions found.</td></tr>}
    </tbody></table></div>
    <Pagination page={page} pageSize={pageSize} total={count ?? 0} />
    <p className="mt-3 text-xs text-slate-500">Matched: {totals.matched ?? 0} · Partial: {totals.partial ?? 0} · Unmatched: {totals.unmatched ?? 0} · Excluded: {totals.excluded ?? 0}</p>
  </AppShell>;
}
