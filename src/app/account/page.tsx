import { AppShell } from "@/components/AppShell";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { getProfile } from "@/utils/profile";
import { roleLabel } from "@/utils/roles";

export default async function AccountPage() {
  const profile = await getProfile();

  return (
    <AppShell title="Account">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <p className="text-slate-500">Signed in as</p>
        <p className="mt-1 font-medium text-slate-900">{profile?.email}</p>
        <p className="text-xs text-slate-400">Access level: {roleLabel(profile?.role ?? "")}</p>
      </div>
      <ChangePasswordForm />
    </AppShell>
  );
}
