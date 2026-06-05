"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStatus } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

const STATUSES: Record<string, string[]> = {
  quote: ["draft", "sent", "won", "lost"],
  invoice: ["draft", "sent", "paid", "lost"],
};
const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  imported: "bg-amber-100 text-amber-700",
};

export function StatusControl({ docId, type, current }: { docId: string; type: "quote" | "invoice"; current: string | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const options = STATUSES[type] ?? STATUSES.quote;
  const cur = current ?? "draft";

  function change(status: string) {
    if (!status || status === cur) return;
    start(async () => {
      try {
        await updateStatus(docId, status);
        toast(`Marked as ${status}`);
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to update status", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${COLORS[cur] ?? COLORS.draft}`}>{cur}</span>
      <select
        disabled={pending}
        value={options.includes(cur) ? cur : ""}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-navy disabled:opacity-60"
        aria-label="Change status"
      >
        {!options.includes(cur) && <option value="" disabled>{cur}</option>}
        {options.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </select>
      {pending && <Spinner className="h-4 w-4 text-slate-400" />}
    </div>
  );
}
