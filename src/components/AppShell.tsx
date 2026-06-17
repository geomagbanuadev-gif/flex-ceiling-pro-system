import { Suspense } from "react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { MobileNav } from "./MobileNav";
import { FlashToast } from "./FlashToast";
import { cn } from "@/utils/cn";
import { getProfile, canSeeQuotes, canSeeInvoices, canSeeProformas } from "@/utils/profile";

type NavItem = { href: string; label: string; key: string; superOnly?: boolean; need?: "quotes" | "invoices" | "proforma" };
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/quotes?type=quote", label: "Quotes", key: "quotes", need: "quotes" },
  { href: "/quotes?type=proforma", label: "Pro Forma", key: "proforma", need: "proforma" },
  { href: "/quotes?type=invoice", label: "Invoices", key: "invoices", need: "invoices" },
  { href: "/clients", label: "Clients", key: "clients" },
  { href: "/settings", label: "Settings", key: "settings", superOnly: true },
  { href: "/users", label: "Users", key: "users", superOnly: true },
];

export async function AppShell({
  active,
  title,
  subtitle,
  action,
  children,
}: {
  active?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  // No active profile → access not granted / revoked
  if (!profile || !profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
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
    if (n.need === "proforma" && !canSeeProformas(profile.role)) return false;
    return true;
  });

  const initials = (profile.full_name || profile.email || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={null}><FlashToast /></Suspense>

      {/* Header */}
      <header className="bg-brand bg-brand-accentline z-30 shrink-0 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="FlexCeiling Pro" className="h-9 w-9 rounded-lg bg-white/5 object-contain p-0.5 ring-1 ring-white/10" />
              <span className="text-[15px] font-semibold tracking-tight">
                FlexCeiling <span className="text-gold-400">Pro</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-0.5 lg:flex">
              {nav.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active === n.key
                      ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
                      : "text-white/60 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-2.5 transition-colors hover:bg-white/[0.07] lg:flex"
              title="Account & password"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-400 text-[11px] font-bold text-white shadow-inner">
                {initials}
              </span>
              <span className="leading-tight">
                <span className="block max-w-[150px] truncate text-xs font-medium text-white/90">{profile.email}</span>
                <span className="block text-[11px] capitalize text-white/45">{profile.role}</span>
              </span>
            </Link>
            <div className="hidden lg:block"><SignOutButton /></div>
            <MobileNav nav={nav} active={active} email={profile.email} role={profile.role} />
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {(title || action) && (
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
              {title && (
                <div className="min-w-0">
                  <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-900">{title}</h1>
                  {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>
              )}
              {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="z-20 shrink-0 border-t border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 text-xs text-slate-400">
          <span>FlexCeiling Pro — Quote &amp; Invoice System</span>
          <span className="tabular-nums">TRN 1015211875700001</span>
        </div>
      </footer>
    </div>
  );
}
