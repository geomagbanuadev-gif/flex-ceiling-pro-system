"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { SignOutButton } from "./SignOutButton";

export type ShellNavItem = { href: string; label: string; key: string; group: string };

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z" />,
  quotes: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></>,
  proforma: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><circle cx="12" cy="15" r="3" /><path d="M12 13.5v1.5l1 1" /></>,
  invoices: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6M19 8v6" /></>,
};
const Icon = ({ k }: { k: string }) => (
  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {ICONS[k] ?? ICONS.dashboard}
  </svg>
);

const GROUPS: { id: string; label?: string }[] = [
  { id: "main" },
  { id: "docs", label: "Documents" },
  { id: "manage", label: "Manage" },
];

export function Shell({
  nav,
  email,
  role,
  initials,
  active,
  title,
  subtitle,
  action,
  children,
}: {
  nav: ShellNavItem[];
  email: string | null;
  role: string;
  initials: string;
  active?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // close drawer on Escape; lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (
    <div className="bg-brand flex h-full w-64 flex-col text-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-9 w-9 rounded-lg bg-white/5 object-contain p-0.5 ring-1 ring-white/10" />
        <span className="text-[15px] font-semibold tracking-tight">
          FlexCeiling <span className="text-gold-400">Pro</span>
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {GROUPS.map((g) => {
          const items = nav.filter((n) => n.group === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id} className="space-y-1">
              {g.label && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">{g.label}</p>}
              {items.map((n) => {
                const on = active === n.key;
                return (
                  <Link
                    key={n.key}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      on ? "bg-white/[0.14] text-white" : "text-white/80 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    {on && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-400" />}
                    <span className={on ? "text-gold-400" : "text-white/70 group-hover:text-white"}><Icon k={n.key} /></span>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.07]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-400 text-[11px] font-bold text-white">{initials}</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-xs font-medium text-white">{email}</span>
            <span className="block text-[11px] capitalize text-white/55">{role}</span>
          </span>
        </Link>
        <div className="mt-2 px-1"><SignOutButton /></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl">{sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar (hamburger) */}
        <header className="bg-brand bg-brand-accentline z-20 flex h-14 shrink-0 items-center gap-3 px-4 text-white lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-sm font-semibold tracking-tight">FlexCeiling <span className="text-gold-400">Pro</span></span>
          <span className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-400 text-[11px] font-bold">{initials}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            {(title || action) && (
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                {title && (
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.6rem]">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                  </div>
                )}
                {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
              </div>
            )}
            {children}
          </div>
        </main>

        <footer className="z-10 shrink-0 border-t border-slate-200/70 bg-white/70 px-6 py-3 text-xs text-slate-400 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span>FlexCeiling Pro — Quote &amp; Invoice System</span>
            <span className="hidden tabular-nums sm:block">TRN 1015211875700001</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
