import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensePaymentLog } from "@/components/ExpensePaymentLog";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canSeeFinance } from "@/utils/profile";
import { deleteExpense } from "@/app/expenses/actions";

export default async function ExpenseDetailPage(props: PageProps<"/expenses/[id]">) {
  const profile = await getProfile();
  if (!profile || !canSeeFinance(profile.role)) redirect("/");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: expense }, { data: payments }, { data: categories }, { data: clients }, { data: suppliers }, { data: projects }] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).maybeSingle(),
    supabase.from("expense_payments").select("*").eq("expense_id", id).order("payment_date", { ascending: false }),
    supabase.from("expense_categories").select("id, name").eq("active", true).order("sort_order"),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("projects").select("id, name, code, client_id").neq("status", "cancelled").order("name"),
  ]);
  if (!expense) notFound();
  const initial = { id: expense.id, expenseDate: expense.expense_date, dueDate: expense.due_date ?? "", categoryId: expense.category_id, description: expense.description, payeeName: expense.payee_name ?? "", supplierId: expense.supplier_id, clientId: expense.client_id, projectId: expense.project_id, status: expense.status, subtotal: Number(expense.subtotal) || 0, vatAmount: Number(expense.vat_amount) || 0, vatRecoverable: Boolean(expense.vat_recoverable), reference: expense.reference ?? "", notes: expense.notes ?? "" };
  return <AppShell active="expenses" title={expense.description} action={<div className="flex gap-2"><Link href="/expenses" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">← Expenses</Link>{expense.status === "draft" && <form action={deleteExpense.bind(null, id)}><button className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600">Delete draft</button></form>}</div>}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]"><ExpenseForm categories={categories ?? []} clients={clients ?? []} suppliers={suppliers ?? []} projects={projects ?? []} expense={initial} /><ExpensePaymentLog expenseId={id} payments={payments ?? []} grandTotal={Number(expense.grand_total) || 0} status={expense.status} /></div>
  </AppShell>;
}
