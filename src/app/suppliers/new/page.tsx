import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SupplierForm } from "@/components/SupplierForm";
import { getProfile, canSeeProcurement } from "@/utils/profile";

export default async function NewSupplierPage() {
  const me = await getProfile();
  if (me && !canSeeProcurement(me.role)) redirect("/");
  return (
    <AppShell
      active="suppliers"
      title="New Supplier"
      action={<Link href="/suppliers" className="text-sm font-medium text-navy-600 hover:underline">← All suppliers</Link>}
    >
      <SupplierForm />
    </AppShell>
  );
}
