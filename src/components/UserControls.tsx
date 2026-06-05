"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserRole, setUserActive } from "@/app/users/actions";
import { Spinner } from "./Spinner";

const ROLES = [
  { v: "super", l: "Super" },
  { v: "staff", l: "Full staff" },
  { v: "quotes", l: "Quotes only" },
  { v: "invoices", l: "Invoices only" },
];

export function UserControls({ id, role, active }: { id: string; role: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const isSuper = role === "super";

  function run(fn: () => Promise<void>) {
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        disabled={pending || isSuper}
        value={role}
        onChange={(e) => run(() => setUserRole(id, e.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-navy disabled:opacity-50"
      >
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
      </select>
      <button
        type="button"
        disabled={pending || isSuper}
        onClick={() => run(() => setUserActive(id, !active))}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
          active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"
        }`}
      >
        {active ? "Revoke" : "Enable"}
      </button>
      {pending && <Spinner className="h-4 w-4 text-slate-400" />}
    </div>
  );
}
