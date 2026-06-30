import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { PurchaseOrderForm, type PoInitial } from "@/components/PurchaseOrderForm";
import { getProfile, canSeeProcurement } from "@/utils/profile";

export default async function EditPoPage(props: PageProps<"/purchase-orders/[id]/edit">) {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const [poRes, itemsRes, suppliersRes, settingsRes] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("purchase_order_items").select("*").eq("purchase_order_id", id).order("sort_order"),
    supabase.from("suppliers").select("id, name, trn, address, email, contact_person, contact_phone").order("name"),
    supabase.from("company_settings").select("vat_rate").eq("id", 1).maybeSingle(),
  ]);
  const po = poRes.data;
  if (!po) notFound();

  const initial: PoInitial = {
    id: po.id,
    supplierId: po.supplier_id,
    supplierName: po.supplier_name ?? "",
    supplierTrn: po.supplier_trn ?? "",
    supplierAddress: po.supplier_address ?? "",
    supplierEmail: po.supplier_email ?? "",
    contactPerson: po.contact_person ?? "",
    contactPhone: po.contact_phone ?? "",
    number: po.number ?? "",
    poDate: po.po_date ?? new Date().toISOString().slice(0, 10),
    expectedDate: po.expected_date ?? "",
    reference: po.reference ?? "",
    vatRate: po.vat_rate ?? 5,
    discount: po.discount ?? 0,
    notes: po.notes ?? "",
    items: (itemsRes.data ?? []).map((it) => ({
      description: it.description ?? "",
      quantity: it.quantity == null ? "" : String(it.quantity),
      unit: it.unit ?? "pcs",
      unitPrice: it.unit_price == null ? "" : String(it.unit_price),
      amount: it.amount == null ? "" : String(it.amount),
    })),
  };

  return (
    <AppShell
      active="purchase-orders"
      title={`Edit Purchase Order ${po.number}`}
      action={<Link href={`/purchase-orders/${id}`} className="text-sm font-medium text-navy-600 hover:underline">← Cancel</Link>}
    >
      <PurchaseOrderForm
        suppliers={suppliersRes.data ?? []}
        nextNumber={po.number ?? ""}
        defaults={{ vatRate: settingsRes.data?.vat_rate ?? 5 }}
        initial={initial}
      />
    </AppShell>
  );
}
