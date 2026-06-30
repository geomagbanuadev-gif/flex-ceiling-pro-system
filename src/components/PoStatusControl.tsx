"use client";

import { useTransition } from "react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { updatePoStatus } from "@/app/purchase-orders/actions";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";
import { PO_STATUSES, PO_STATUS_LABEL } from "@/utils/procurement";

const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  ordered: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function PoStatusControl({ poId, current }: { poId: string; current: string | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const cur = current ?? "draft";

  function change(status: string) {
    if (!status || status === cur) return;
    start(async () => {
      try { await updatePoStatus(poId, status); toast(`Marked as ${PO_STATUS_LABEL[status] ?? status}`); router.refresh(); }
      catch (e) { unstable_rethrow(e); toast(e instanceof Error ? e.message : "Failed to update status", "error"); }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[cur] ?? COLORS.draft}`}>{PO_STATUS_LABEL[cur] ?? cur}</span>
      <select
        disabled={pending}
        value={cur}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-navy disabled:opacity-60"
        aria-label="Change status"
      >
        {PO_STATUSES.map((s) => <option key={s} value={s}>{PO_STATUS_LABEL[s]}</option>)}
      </select>
      {pending && <Spinner className="h-4 w-4 text-slate-400" />}
    </div>
  );
}
