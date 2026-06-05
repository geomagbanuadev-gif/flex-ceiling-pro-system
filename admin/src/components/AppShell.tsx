import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/utils/cn";
import { getProfile, canSeeQuotes, canSeeInvoices } from "@/utils/profile";

type NavItem = { href: string; label: string; key: string; superOnly?: boolean; need?: "quotes" | "invoices" };
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/quotes?type=quote", label: "Quotes", key: "quotes", need: "quotes" },
  { href: "/quotes?type=invoice", label: "Invoices", key: "invoices", need: "invoices" },
  { href: "/clients", label: "Clients", key: "clients" },
  { href: "/settings", label: "Settings", key: "settings", superOnly: true },
  { href: "/users", label: "Users", key: "users", superOnly: true },
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
  const profile = await getProfile();

  // No active profile → access not granted / revoked
  if (!profile || !profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Access not enabled</p>
          <p className="mt-2 text-sm text-slate-500">
            Your account {profile?.email ? `(${profile.email}) ` : ""}does not have access yet. Please ask a super user to enable it.
          </p>
          <div className="mt-5 flex justify-center"><SignOutButton /></div>
        </div>
      </div>
    );
  }

  const isSuper = profile.role === "super";
  const nav = NAV.filter((n) => {
    if (n.superOnly && !isSuper) return false;
    if (n.need === "quotes" && !canSeeQuotes(profile.role)) return false;
    if (n.need === "invoices" && !canSeeInvoices(profile.role)) return false;
    return true;
  });

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
              {nav.map((n) => (
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
            <Link href="/account" className="hidden text-xs text-white/55 hover:text-white sm:block" title="Account & password">
              {profile.email} <span className="text-white/30">·</span> <span className="capitalize">{profile.role}</span>
            </Link>
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
