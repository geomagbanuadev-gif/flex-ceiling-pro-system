import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "@/components/SettingsForm";
import { getProfile } from "@/utils/profile";

export default async function SettingsPage() {
  const me = await getProfile();
  if (!me || me.role !== "super") redirect("/");

  const supabase = await createClient();
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <AppShell active="settings" title="Settings">
      <p className="mb-5 max-w-2xl text-sm text-slate-500">
        These details appear on every quotation and tax invoice. Changes take effect on the next document you create or open.
      </p>
      <div className="max-w-4xl">
        <SettingsForm settings={settings ?? {}} />
      </div>
    </AppShell>
  );
}
