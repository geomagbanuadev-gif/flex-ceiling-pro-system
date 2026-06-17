"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { SignOutButton } from "./SignOutButton";

type NavItem = { href: string; label: string; key: string };

export function MobileNav({ nav, active, email, role }: { nav: NavItem[]; active?: string; email?: string | null; role?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-brand absolute right-0 top-0 flex h-full w-64 max-w-[82%] flex-col p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">FlexCeiling Pro</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <nav className="mt-5 flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active === n.key ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-4">
              <Link href="/account" onClick={() => setOpen(false)} className="block text-xs text-white/55 hover:text-white">
                {email}
                {role ? <span className="capitalize"> · {role}</span> : null}
              </Link>
              <div className="mt-3" onClick={() => setOpen(false)}><SignOutButton /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
