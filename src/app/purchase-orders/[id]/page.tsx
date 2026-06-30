import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { PoStatusControl } from "@/components/PoStatusControl";
import { PaymentLog } from "@/components/PaymentLog";
import { DeletePoButton } from "@/components/DeletePoButton";
import { getProfile, canSeeProcurement } from "@/utils/profile";
import { fmtDate } from "@/utils/format";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default async function PoDetailPage(props: PageProps<"/purchase-orders/[id]">) {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!po) notFound();
  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("purchase_order_items").select("*").eq("purchase_order_id", id).order("sort_order"),
    supabase.from("purchase_payments").select("*").eq("purchase_order_id", id).order("payment_date", { ascending: false }),
  ]);

  const auditIds = [po.created_by, po.updated_by].filter(Boolean);
  const { data: profs } = auditIds.length ? await supabase.from("profiles").select("id, email").in("id", auditIds) : { data: [] as { id: string; email: string }[] };
  const emailOf = (uid: string | null) => profs?.find((p) => p.id === uid)?.email ?? null;

  return (
    <AppShell
      active="purchase-orders"
      title={`Purchase Order ${po.number}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Link href="/purchase-orders" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">← Back</Link>
          <Link href={`/purchase-orders/${id}/edit`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">Edit</Link>
          <a href={`/purchase-orders/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-navy-700"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>Open / Print PDF</a>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-medium">Status</span>
          <PoStatusControl poId={id} current={po.status} />
          {po.expected_date && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Expected {fmtDate(po.expected_date)}</span>}
        </div>
        <DeletePoButton id={id} label={`Purchase Order ${po.number}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-2xl bg-white p-5 text-sm shadow-[var(--shadow-card)] ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{po.supplier_name}</p>
            {po.supplier_trn && <p className="text-slate-600">TRN: {po.supplier_trn}</p>}
            {po.supplier_email && <p className="text-slate-600">{po.supplier_email}</p>}
            {po.contact_person && <p className="text-slate-600">{po.contact_person}{po.contact_phone ? ` · ${po.contact_phone}` : ""}</p>}
            {po.supplier_address && <p className="text-slate-600">{po.supplier_address}</p>}
            {po.reference && <p className="mt-2 text-slate-500">{po.reference}</p>}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2.5">Material</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5 text-right">Unit price</th><th className="px-3 py-2.5 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5 text-slate-700">{it.description}{it.unit ? <span className="text-slate-400"> · {it.unit}</span> : ""}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{it.quantity ?? ""}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{it.unit_price != null ? Number(it.unit_price).toLocaleString() : ""}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">{money(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-slate-200 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sub Total</span><span>{money(po.subtotal)}</span></div>
              {po.discount ? <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>- {money(po.discount)}</span></div> : null}
              <div className="flex justify-between"><span className="text-slate-500">VAT {po.vat_rate ?? 5}%</span><span>{money(po.vat_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900"><span>Grand Total</span><span>{money(po.grand_total)}</span></div>
            </div>
          </div>
          {po.notes ? <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{po.notes}</p> : null}

          <PaymentLog poId={id} payments={payments ?? []} grandTotal={Number(po.grand_total) || 0} />

          <p className="text-xs text-slate-500">
            {emailOf(po.created_by) ? <>Created by {emailOf(po.created_by)}</> : ""}
            {po.updated_at ? <> · last updated {fmtDate(po.updated_at.slice(0, 10))}{emailOf(po.updated_by) ? ` by ${emailOf(po.updated_by)}` : ""}</> : null}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-2 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
          <iframe src={`/purchase-orders/${id}/pdf`} className="h-[820px] w-full rounded-lg" title="PO PDF preview" />
        </section>
      </div>
    </AppShell>
  );
}
