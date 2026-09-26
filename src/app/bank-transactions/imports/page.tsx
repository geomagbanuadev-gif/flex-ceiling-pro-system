import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LinkRow } from "@/components/LinkRow";
import { fmtDate, money2 } from "@/utils/format";
import { canSeeFinance, getProfile } from "@/utils/profile";
import { createClient } from "@/utils/supabase/server";

const related = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default async function BankImportsPage() {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const supabase = await createClient();
  const { data: imports, error } = await supabase.from("bank_statement_imports").select("id, period_from, period_to, opening_balance, closing_balance, withdrawal_total, deposit_total, transaction_count, source_filename, status, imported_at, bank_accounts(bank_name, account_last4, currency)").order("period_from", { ascending: false });
  if (error) throw new Error(`Bank transactions require supabase/bank-transactions.sql: ${error.message}`);
  return <AppShell active="bank-transactions" title="Statement Imports" subtitle="Validated monthly bank statement batches" action={<Link href="/bank-transactions" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Bank transactions</Link>}>
    <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Controlled monthly import</p><p className="mt-1">Statements are validated with the local import script before a Super user writes them to the database. The application does not upload or expose the source PDFs.</p></div>
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200"><table className="w-full min-w-[800px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Account</th><th className="px-4 py-3 text-right">Rows</th><th className="px-4 py-3 text-right">Money out</th><th className="px-4 py-3 text-right">Money in</th></tr></thead><tbody className="divide-y divide-slate-100">
      {(imports ?? []).map((item) => { const account = related(item.bank_accounts); return <LinkRow key={item.id} href={`/bank-transactions/imports/${item.id}`} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3"><Link href={`/bank-transactions/imports/${item.id}`} className="font-semibold text-navy">{fmtDate(item.period_from)} – {fmtDate(item.period_to)}</Link></td><td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.source_filename}</td><td className="px-4 py-3">{account ? `${account.bank_name} · •••• ${account.account_last4}` : "—"}</td><td className="px-4 py-3 text-right tabular-nums">{item.transaction_count}</td><td className="px-4 py-3 text-right tabular-nums text-red-700">{money2(item.withdrawal_total)}</td><td className="px-4 py-3 text-right tabular-nums text-emerald-700">{money2(item.deposit_total)}</td></LinkRow>; })}
      {!imports?.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No bank statements imported yet.</td></tr>}
    </tbody></table></div>
  </AppShell>;
}
