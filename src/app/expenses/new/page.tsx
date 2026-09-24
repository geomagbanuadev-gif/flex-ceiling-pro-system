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
  const [{ data: categories }, { data: clients }, { data: suppliers }, { data: projects }] = await Promise.all([
    supabase.from("expense_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name, code, client_id").eq("status", "active").order("name"),
  ]);
  return <AppShell active="expenses" title="New Expense" action={<Link href="/expenses" className="text-sm font-medium text-navy">← Expenses</Link>}><div className="max-w-4xl"><ExpenseForm categories={categories ?? []} clients={clients ?? []} suppliers={suppliers ?? []} projects={projects ?? []} /></div></AppShell>;
}
