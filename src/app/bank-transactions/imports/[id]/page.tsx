import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { SubmitButton } from "@/components/SubmitButton";
import { bankStatusLabel, bankTimeFromDescription } from "@/utils/bank";
import { fmtDate, money2 } from "@/utils/format";
import { canSeeFinance, getProfile } from "@/utils/profile";
import { createClient } from "@/utils/supabase/server";
import { rollbackBankStatement } from "../../actions";

const related = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default async function BankImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: batch, error }, { data: transactions }] = await Promise.all([
    supabase.from("bank_statement_imports").select("*, bank_accounts(bank_name, account_name, account_last4, currency)").eq("id", id).maybeSingle(),
    supabase.from("bank_transactions").select("id, booking_date, direction, amount, description_raw, counterparty, reconciliation_status, source_page, source_order").eq("import_id", id).order("source_order"),
  ]);
  if (error) throw new Error(`Bank transactions require supabase/bank-transactions.sql: ${error.message}`);
  if (!batch) notFound();
  const account = related(batch.bank_accounts);
  const reconciled = (transactions ?? []).filter((item) => ["matched", "excluded"].includes(item.reconciliation_status)).length;
  const rollbackAction = rollbackBankStatement.bind(null, id);
  return <AppShell active="bank-transactions" title="Statement Import" subtitle={`${fmtDate(batch.period_from)} – ${fmtDate(batch.period_to)}`} action={<Link href="/bank-transactions/imports" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">All imports</Link>}>
    <section className="mb-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{batch.source_filename}</p><p className="mt-1 text-sm text-slate-500">{account ? `${account.bank_name} · ${account.account_name} · •••• ${account.account_last4} · ${account.currency}` : "Bank account unavailable"}</p><p className="mt-1 break-all text-xs text-slate-400">SHA-256: {batch.source_sha256}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">{batch.status}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-4">{[["Money out", money2(batch.withdrawal_total)], ["Money in", money2(batch.deposit_total)], ["Transactions", String(batch.transaction_count)], ["Reviewed", `${reconciled} / ${batch.transaction_count}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{value}</p></div>)}</div><p className="mt-3 text-xs text-slate-500">Validation: {Object.entries(batch.validation_result || {}).map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`).join(" · ") || "No validation result recorded"}</p>{profile.role === "super" && <form action={rollbackAction} className="mt-4 border-t border-slate-100 pt-4"><SubmitButton pendingLabel="Rolling back…" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700">Roll back unreconciled import</SubmitButton><p className="mt-1 text-xs text-slate-500">Blocked automatically if any transaction has a reconciliation link.</p></form>}</section>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{(transactions ?? []).map((row) => { const time = bankTimeFromDescription(row.description_raw); return <LinkRow key={row.id} href={`/bank-transactions/${row.id}`} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{row.source_order}</td><td className="whitespace-nowrap px-4 py-3">{fmtDate(row.booking_date)}{time && <span className="mt-0.5 block text-xs text-slate-400">{time}</span>}</td><td className="max-w-xl px-4 py-3"><Link href={`/bank-transactions/${row.id}`} className="font-semibold text-navy">{row.counterparty || "Bank transaction"}</Link><p className="line-clamp-1 text-xs text-slate-500">{row.description_raw}</p></td><td className="px-4 py-3">{bankStatusLabel(row.reconciliation_status)}</td><td className={`px-4 py-3 text-right font-medium tabular-nums ${row.direction === "credit" ? "text-emerald-700" : "text-red-700"}`}>{row.direction === "credit" ? "+" : "−"}{money2(row.amount)}</td></LinkRow>; })}</tbody></table></div>
  </AppShell>;
}
