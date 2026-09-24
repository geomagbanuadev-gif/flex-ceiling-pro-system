import Link from "next/link";
import { fmtDate, money2 } from "@/utils/format";
import { StatusBadge } from "./StatusBadge";
import type { SalesSnapshot } from "@/utils/salesReport";

export function SalesReportView({ snapshot }: { snapshot: SalesSnapshot }) {
  const cards = [
    ["Invoices", String(snapshot.totals.invoiceCount)],
    ["Subtotal", money2(snapshot.totals.subtotal)],
    ["Discount", money2(snapshot.totals.discount)],
    ["VAT", money2(snapshot.totals.vatAmount)],
    ["Total sales", money2(snapshot.totals.grandTotal)],
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Subtotal</th><th className="px-4 py-3 text-right">Discount</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {snapshot.rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3"><Link href={`/quotes/${row.id}`} className="font-semibold text-navy hover:text-navy-600">{row.number}</Link></td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(row.doc_date)}</td>
                <td className="px-4 py-3 text-slate-700">{row.client_name || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money2(row.subtotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money2(row.discount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money2(row.vat_amount)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{money2(row.grand_total)}</td>
              </tr>
            ))}
            {!snapshot.rows.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No sales invoices match this period and status.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
