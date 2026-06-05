"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/utils/profile";

const ROLES = ["super", "staff", "quotes", "invoices"];

async function requireSuper() {
  const me = await getProfile();
  if (!me || !me.active || me.role !== "super") throw new Error("Not authorized");
}

export async function setUserRole(userId: string, role: string) {
  await requireSuper();
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function setUserActive(userId: string, active: boolean) {
  await requireSuper();
  const supabase = await createClient();
  // The DB trigger blocks revoking/demoting a super, so this throws for those.
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}
