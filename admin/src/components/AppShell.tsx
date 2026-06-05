import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/utils/cn";

const NAV = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/quotes", label: "Documents", key: "documents" },
  { href: "/clients", label: "Clients", key: "clients" },
  { href: "/settings", label: "Settings", key: "settings" },
];

export async function AppShell({
  active,
  title,
  action,
  children,
}: {
  active?: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen flex-col">
      {/* Fixed header */}
      <header className="z-20 shrink-0 bg-navy text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-xs font-bold text-gold-400">
                FC
              </span>
              <span className="text-sm font-semibold tracking-tight">FlexCeiling Pro</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active === n.key
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/55 sm:block">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-7">
          {(title || action) && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              {title && <h1 className="text-xl font-semibold text-slate-900">{title}</h1>}
              {action}
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Fixed footer */}
      <footer className="z-20 shrink-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-xs text-slate-400">
          <span>FlexCeiling Pro — Quote &amp; Invoice System</span>
          <span>TRN 1015211875700001</span>
        </div>
      </footer>
    </div>
  );
}
