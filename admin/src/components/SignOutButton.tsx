"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
