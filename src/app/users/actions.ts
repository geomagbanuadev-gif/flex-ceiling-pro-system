"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getProfile } from "@/utils/profile";

const ROLES = ["super", "staff", "quotes", "invoices"];

async function requireSuper() {
  const me = await getProfile();
  if (!me || !me.active || me.role !== "super") throw new Error("Not authorized");
}

export async function createUser(email: string, password: string, role: string) {
  await requireSuper();
  const mail = email.trim().toLowerCase();
  if (!mail || !password) throw new Error("Email and password are required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!ROLES.includes(role)) throw new Error("Invalid access level");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: mail,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  // set the chosen access level + activate (overrides the inactive default from the trigger)
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, email: mail, role, active: true });
  if (pErr) throw new Error(pErr.message);

  revalidatePath("/users");
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
