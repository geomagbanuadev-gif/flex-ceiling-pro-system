import { createClient } from "@supabase/supabase-js";

// Service-role client for admin operations (creating users). SERVER ONLY —
// only imported by "use server" actions; the service_role key bypasses RLS
// and must never reach the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local (and restart the dev server) to create users in-app.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
