"use client";

import { useState, useTransition } from "react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { setUserRole, setUserActive } from "@/app/users/actions";
import { Spinner } from "./Spinner";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

const ROLES = [
  { v: "super", l: "Super" },
  { v: "staff", l: "Full staff" },
  { v: "quotes", l: "Quotes only" },
  { v: "invoices", l: "Invoices only" },
];

export function UserControls({ id, role, active }: { id: string; role: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const isSuper = role === "super";
  const toast = useToast();

  function run(fn: () => Promise<void>, okMsg: string, onDone?: () => void) {
    setError("");
    start(async () => {
      try {
        await fn();
        toast(okMsg);
        onDone?.();
        router.refresh();
      } catch (e) {
        unstable_rethrow(e);
        const m = e instanceof Error ? e.message : "Failed";
        setError(m);
        toast(m, "error");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <select
          disabled={pending || isSuper}
          value={role}
          onChange={(e) => run(() => setUserRole(id, e.target.value), "Access level updated")}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-navy disabled:opacity-50"
        >
          {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <button
          type="button"
          disabled={pending || isSuper}
          onClick={() => (active ? setConfirmRevoke(true) : run(() => setUserActive(id, true), "Access enabled"))}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
            active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"
          }`}
        >
          {active ? "Revoke" : "Enable"}
        </button>
        {pending && <Spinner className="h-4 w-4 text-slate-400" />}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}

      <ConfirmDialog
        open={confirmRevoke}
        title="Revoke access?"
        message="This user will immediately lose all access until you enable them again."
        confirmLabel="Revoke"
        danger
        pending={pending}
        error={error}
        onConfirm={() => run(() => setUserActive(id, false), "Access revoked", () => setConfirmRevoke(false))}
        onCancel={() => { setError(""); setConfirmRevoke(false); }}
      />
    </div>
  );
}
