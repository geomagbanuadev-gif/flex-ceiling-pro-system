import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectForm } from "@/components/ProjectForm";
import { createClient } from "@/utils/supabase/server";
import { getProfile, canManageProjects } from "@/utils/profile";

export default async function NewProjectPage() {
  const profile = await getProfile();
  if (!profile || !canManageProjects(profile.role)) redirect("/");
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  return <AppShell active="projects" title="New Project" action={<Link href="/projects" className="text-sm font-medium text-navy-600">← All projects</Link>}><div className="max-w-3xl"><ProjectForm clients={clients ?? []} /></div></AppShell>;
}
