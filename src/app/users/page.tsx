import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { getProfile } from "@/utils/profile";
import { UserControls } from "@/components/UserControls";
import { AddUserForm } from "@/components/AddUserForm";

const ROLE_LABEL: Record<string, string> = {
  super: "Super",
  staff: "Full staff",
  quotes: "Quotes only",
  invoices: "Invoices only",
};

export default async function UsersPage() {
  const me = await getProfile();
  if (!me || me.role !== "super") redirect("/");

  const supabase = await createClient();
  const { data: users } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <AppShell active="users" title="Users & access">
      <p className="mb-5 max-w-3xl text-sm text-slate-500">
        Add a user with their access level below. Change a level or <span className="font-medium text-slate-600">Revoke</span> access anytime.
        A super user can&apos;t be revoked or demoted. (Users can also be created in the Supabase dashboard — they&apos;ll appear here as <span className="font-medium text-slate-600">No access</span>.)
      </p>

      <div className="mb-6"><AddUserForm /></div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Current level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{u.email}</span>
                  {u.id === me.id && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">you</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.active ? "Active" : "No access"}
                  </span>
                </td>
                <td className="px-4 py-3"><UserControls id={u.id} role={u.role} active={u.active} /></td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
