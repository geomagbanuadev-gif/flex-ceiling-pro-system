import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExpenseForm } from "@/components/ExpenseForm";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";

export default async function NewExpensePage() {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const supabase = await createClient();
  const [{ data: categories }, { data: clients }, { data: suppliers }, { data: projects }, { data: purchaseOrders }] = await Promise.all([
    supabase.from("expense_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name, code, client_id").neq("status", "cancelled").order("name"),
    supabase.from("purchase_orders").select("id, number, supplier_id, project_id, status").neq("status", "cancelled").order("po_date", { ascending: false }),
  ]);
  return <AppShell active="expenses" title="New Expense" action={<Link href="/expenses" className="text-sm font-medium text-navy">← Expenses</Link>}><div className="max-w-5xl"><ExpenseForm categories={categories ?? []} clients={clients ?? []} suppliers={suppliers ?? []} projects={projects ?? []} purchaseOrders={purchaseOrders ?? []} /></div></AppShell>;
}
