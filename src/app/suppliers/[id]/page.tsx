import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SupplierForm } from "@/components/SupplierForm";
import { LinkRow } from "@/components/LinkRow";
import { NewPoButton } from "@/components/NewPoButton";
import { PoStatusBadge } from "@/components/PoStatusBadge";
import { DeleteSupplierButton } from "@/components/DeleteSupplierButton";
import { getProfile, canSeeProcurement } from "@/utils/profile";
import { fmtDate } from "@/utils/format";

const money = (v: number | null) => (v == null ? "—" : "AED " + Number(v).toLocaleString());

export default async function SupplierDetailPage(props: PageProps<"/suppliers/[id]">) {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (!supplier) notFound();

  const { data: pos } = await supabase.from("purchase_orders").select("id, number, po_date, status, grand_total, reference").eq("supplier_id", id).order("po_date", { ascending: false, nullsFirst: false });
  const poIds = (pos ?? []).map((p) => p.id);
  const paidByPo = new Map<string, number>();
  if (poIds.length) {
    const { data: pays } = await supabase.from("purchase_payments").select("purchase_order_id, amount").in("purchase_order_id", poIds);
    for (const p of pays ?? []) paidByPo.set(p.purchase_order_id, (paidByPo.get(p.purchase_order_id) ?? 0) + (Number(p.amount) || 0));
  }
  const totalPurchased = (pos ?? []).reduce((s, p) => s + (Number(p.grand_total) || 0), 0);
  const totalPaid = [...paidByPo.values()].reduce((s, v) => s + v, 0);
  const outstanding = totalPurchased - totalPaid;

  return (
    <AppShell
      active="suppliers"
      title={supplier.name}
      action={
        <div className="flex flex-wrap gap-2">
          <Link href="/suppliers" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:border-slate-300 hover:bg-slate-50">← Back</Link>
          <DeleteSupplierButton id={id} name={supplier.name} />
          <NewPoButton supplierId={id} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:bg-navy-700">+ New Purchase Order</NewPoButton>
        </div>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 text-center shadow-[var(--shadow-card)] ring-1 ring-slate-200"><p className="text-xl font-semibold text-slate-900">{pos?.length ?? 0}</p><p className="text-xs text-slate-500">Purchase orders</p></div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-[var(--shadow-card)] ring-1 ring-slate-200"><p className="text-xl font-semibold text-slate-900">{money(totalPurchased)}</p><p className="text-xs text-slate-500">Total purchased</p></div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-[var(--shadow-card)] ring-1 ring-slate-200"><p className={`text-xl font-semibold ${outstanding > 0 ? "text-red-600" : "text-green-700"}`}>{money(outstanding)}</p><p className="text-xs text-slate-500">Outstanding balance</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier details</h2>
          <SupplierForm supplier={supplier} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase orders</h2>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-2.5">PO No.</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(pos ?? []).map((po) => (
                  <LinkRow key={po.id} href={`/purchase-orders/${po.id}`} className="cursor-pointer hover:bg-slate-50/70">
                    <td className="px-4 py-2.5"><Link href={`/purchase-orders/${po.id}`} className="font-semibold text-navy hover:text-navy-600">{po.number}</Link></td>
                    <td className="px-4 py-2.5"><PoStatusBadge status={po.status} /></td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(po.po_date)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-900">{money(po.grand_total)}</td>
                  </LinkRow>
                ))}
                {(!pos || pos.length === 0) && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No purchase orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
