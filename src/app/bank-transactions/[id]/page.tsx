import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FlashToast } from "@/components/FlashToast";
import { SubmitButton } from "@/components/SubmitButton";
import { BANK_CLASSIFICATIONS, bankStatusLabel } from "@/utils/bank";
import { fmtDate, money2 } from "@/utils/format";
import { canSeeFinance, getProfile } from "@/utils/profile";
import { reconcileBankTransaction, reviewBankTransaction, unreconcileBankTransaction } from "../actions";
import { loadBankTransaction } from "../data";

const related = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default async function BankTransactionDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ flash?: string; record?: string }> }) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const { id } = await params;
  const { flash, record = "" } = await searchParams;
  const data = await loadBankTransaction(id, record);
  if (!data) notFound();
  const { transaction, allocations, events, targets, invoiceSuggestions, allocatedAmount, remaining, targetSearch } = data;
  const account = related(transaction.bank_accounts);
  const statement = related(transaction.bank_statement_imports);
  const reviewAction = reviewBankTransaction.bind(null, id);
  const reconcileAction = reconcileBankTransaction.bind(null, id);

  return <AppShell active="bank-transactions" title="Bank Transaction" subtitle={`${fmtDate(transaction.booking_date)} · ${transaction.direction === "credit" ? "Money in" : "Money out"}`} action={<Link href="/bank-transactions" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Back to transactions</Link>}>
    {flash && <FlashToast />}
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{transaction.transaction_type || "Bank transaction"}</p><p className="mt-2 text-lg font-semibold text-slate-900">{transaction.counterparty || "No counterparty parsed"}</p></div><div className="text-right"><p className={`text-2xl font-semibold tabular-nums ${transaction.direction === "credit" ? "text-emerald-700" : "text-red-700"}`}>{transaction.direction === "credit" ? "+" : "−"}{money2(transaction.amount)}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${transaction.reconciliation_status === "matched" ? "bg-emerald-50 text-emerald-700" : transaction.reconciliation_status === "excluded" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{bankStatusLabel(transaction.reconciliation_status)}</span></div></div>
          <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Original statement description</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{transaction.description_raw}</dd></div><div className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Reference</dt><dd className="mt-1">{transaction.bank_reference || "—"}</dd></div><div><dt className="text-xs text-slate-500">Bank account</dt><dd className="mt-1">{account ? `${account.bank_name} · •••• ${account.account_last4}` : "—"}</dd></div><div><dt className="text-xs text-slate-500">Source</dt><dd className="mt-1">{statement ? <Link className="text-navy underline" href={`/bank-transactions/imports/${statement.id}`}>{statement.source_filename}</Link> : "—"}</dd></div><div><dt className="text-xs text-slate-500">Statement location</dt><dd className="mt-1">Page {transaction.source_page} · row {transaction.source_order}</dd></div></div></dl>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Linked records</h2><p className="mt-1 text-xs text-slate-500">{money2(allocatedAmount)} allocated · {money2(remaining)} remaining</p></div></div>
          <div className="mt-4 space-y-2">{allocations.map((allocation) => {
            const receipt = related(allocation.documents); const purchase = related(allocation.purchase_payments); const po = related(purchase?.purchase_orders ?? null); const expensePayment = related(allocation.expense_payments); const expense = related(expensePayment?.expenses ?? null);
            const href = receipt ? `/quotes/${allocation.receipt_id}` : po ? `/purchase-orders/${po.id}` : expense ? `/expenses/${expense.id}` : "#";
            const label = receipt ? `${receipt.number} · ${receipt.client_name || "Receipt"}` : po ? `${po.number} · ${po.supplier_name || "Purchase payment"}` : expense ? `${expense.description} · ${expense.payee_name || "Expense payment"}` : "Linked cash record";
            const removeAction = unreconcileBankTransaction.bind(null, id, allocation.id);
            return <div key={allocation.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><Link href={href} className="text-sm font-semibold text-navy">{label}</Link><p className="mt-0.5 text-xs text-slate-500">{allocation.match_method.replaceAll("_", " ")} · {money2(allocation.amount)}</p></div><form action={removeAction}><SubmitButton pendingLabel="Removing…" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">Remove link</SubmitButton></form></div>;
          })}{!allocations.length && <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No receipt or payment is linked yet.</p>}</div>
        </section>

        {transaction.reconciliation_status !== "excluded" && remaining > 0 && <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><h2 className="font-semibold text-slate-900">Reconcile this transaction</h2><p className="mt-1 text-sm text-slate-500">Link the bank movement to the cash record it proves. Only one unique amount, date, and party-name match is marked suggested.</p>
          <form className="mt-4 flex gap-2"><input name="record" defaultValue={targetSearch} placeholder="Search record number, party, or reference" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium">Search records</button>{targetSearch && <Link href={`/bank-transactions/${id}`} className="px-2 py-2 text-sm text-slate-500">Clear</Link>}</form>
          {targets.length ? <div className="mt-4 space-y-2">{targets.map((target) => <form key={target.value} action={reconcileAction} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_140px_auto] ${target.suggested ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><input type="hidden" name="target" value={target.value} /><div><p className="text-sm font-medium text-slate-800">{target.suggested && <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Suggested</span>}{target.label}</p>{target.reason && <p className="mt-1 text-xs text-emerald-700">{target.reason}</p>}</div><label className="text-xs text-slate-500">Amount<input name="amount" type="number" min="0.01" step="0.01" max={Math.min(remaining, target.amount)} defaultValue={Math.min(remaining, target.amount).toFixed(2)} required className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-900" /></label><div className="flex items-end"><SubmitButton pendingLabel="Linking…" className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">Link</SubmitButton></div></form>)}</div> : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No available {transaction.direction === "credit" ? "issued receipts" : "purchase or expense payments"}{targetSearch ? " matched that search" : " were found"}. Create the correct cash record or search for an older one, then link it here. <div className="mt-2 flex gap-3">{transaction.direction === "credit" ? <Link href="/quotes?type=receipt" className="font-semibold underline">Open receipts</Link> : <><Link href="/purchase-orders" className="font-semibold underline">Open purchase orders</Link><Link href="/expenses" className="font-semibold underline">Open expenses</Link></>}</div></div>}
          {invoiceSuggestions.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-800">Invoices with the same amount near this date</p><p className="mt-1 text-xs text-slate-500">An invoice is not cash evidence. Open it and generate or confirm its receipt before linking.</p><div className="mt-2 space-y-2">{invoiceSuggestions.map((invoice) => <Link key={invoice.id} href={`/quotes/${invoice.id}`} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-navy"><span>{invoice.number} · {invoice.client}</span><span className="tabular-nums">{money2(invoice.total)}</span></Link>)}</div></div>}
        </section>}
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><h2 className="font-semibold text-slate-900">Review</h2><form action={reviewAction} className="mt-4 space-y-3"><label className="block text-xs text-slate-500">Classification<select name="classification" defaultValue={transaction.classification || ""} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">Unclassified</option>{BANK_CLASSIFICATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs text-slate-500">Internal notes<textarea name="notes" defaultValue={transaction.notes || ""} rows={3} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><label className="flex items-center gap-2 text-sm text-slate-700"><input name="excluded" type="checkbox" defaultChecked={transaction.reconciliation_status === "excluded"} />Exclude from reconciliation</label><label className="block text-xs text-slate-500">Exclusion reason<input name="exclusionReason" defaultValue={transaction.exclusion_reason || ""} placeholder="Required when excluded" className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" /></label><SubmitButton pendingLabel="Saving…" className="w-full justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Save review</SubmitButton></form></section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><h2 className="font-semibold text-slate-900">Audit history</h2><div className="mt-3 space-y-3">{events.map((event) => <div key={event.id} className="border-l-2 border-slate-200 pl-3"><p className="text-sm font-medium capitalize text-slate-800">{event.action}</p><p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString("en-AE")}{event.created_by ? ` · reviewer ${event.created_by.slice(0, 8)}` : ""}</p></div>)}{!events.length && <p className="text-sm text-slate-500">No review activity yet.</p>}</div></section>
      </div>
    </div>
  </AppShell>;
}
