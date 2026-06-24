import { SignOutButton } from "./SignOutButton";
import { Shell, type ShellNavItem } from "./Shell";
import { getProfile, canSeeQuotes, canSeeInvoices, canSeeProformas, canSeeReceipts } from "@/utils/profile";

type NavDef = ShellNavItem & { superOnly?: boolean; need?: "quotes" | "invoices" | "proforma" | "receipt" };
const NAV: NavDef[] = [
  { href: "/", label: "Dashboard", key: "dashboard", group: "main" },
  { href: "/quotes?type=quote", label: "Quotes", key: "quotes", group: "docs", need: "quotes" },
  { href: "/quotes?type=proforma", label: "Pro Forma", key: "proforma", group: "docs", need: "proforma" },
  { href: "/quotes?type=invoice", label: "Invoices", key: "invoices", group: "docs", need: "invoices" },
  { href: "/quotes?type=receipt", label: "Receipts", key: "receipts", group: "docs", need: "receipt" },
  { href: "/clients", label: "Clients", key: "clients", group: "manage" },
  { href: "/settings", label: "Settings", key: "settings", group: "manage", superOnly: true },
  { href: "/users", label: "Users", key: "users", group: "manage", superOnly: true },
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
      <div className="flex min-h-screen items-center justify-center bg-[#e7edf4] p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-slate-200">
          <p className="text-base font-semibold text-slate-900">Access not enabled</p>
          <p className="mt-2 text-sm text-slate-600">
            Your account {profile?.email ? `(${profile.email}) ` : ""}does not have access yet. Please ask a super user to enable it.
          </p>
          <div className="mt-5 flex justify-center"><SignOutButton /></div>
        </div>
      </div>
    );
  }

  const isSuper = profile.role === "super";
  const nav: ShellNavItem[] = NAV.filter((n) => {
    if (n.superOnly && !isSuper) return false;
    if (n.need === "quotes" && !canSeeQuotes(profile.role)) return false;
    if (n.need === "invoices" && !canSeeInvoices(profile.role)) return false;
    if (n.need === "proforma" && !canSeeProformas(profile.role)) return false;
    if (n.need === "receipt" && !canSeeReceipts(profile.role)) return false;
    return true;
  }).map(({ href, label, key, group }) => ({ href, label, key, group }));

  const initials = (profile.full_name || profile.email || "?").trim().slice(0, 2).toUpperCase();

  return (
    <Shell nav={nav} email={profile.email} role={profile.role} initials={initials} active={active} title={title} subtitle={subtitle} action={action}>
      {children}
    </Shell>
  );
}
