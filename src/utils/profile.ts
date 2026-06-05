import { createClient } from "@/utils/supabase/server";

export type Role = "super" | "staff" | "quotes" | "invoices";
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  active: boolean;
};

/**
 * Current user's profile/role. If the profiles table isn't set up yet
 * (RBAC SQL not run), returns an open super profile so the app keeps working.
 * Once RBAC exists, a missing/inactive profile means "no access".
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    // RBAC not migrated yet — don't lock anyone out
    return { id: user.id, email: user.email ?? null, full_name: null, role: "super", active: true };
  }
  return (data as Profile) ?? null;
}

export const canSeeQuotes = (r: Role) => r === "super" || r === "staff" || r === "quotes";
export const canSeeInvoices = (r: Role) => r === "super" || r === "staff" || r === "invoices";
