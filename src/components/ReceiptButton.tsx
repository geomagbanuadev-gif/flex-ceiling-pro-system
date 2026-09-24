"use client";

import { useTransition } from "react";
import Link from "next/link";
import { convertToReceipt } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function ReceiptButton({ sourceId, existingId, existingStatus }: { sourceId: string; existingId?: string; existingStatus?: string }) {
  const [pending, start] = useTransition();
  const canGenerate = !existingId || existingStatus === "draft";
  return (
    <div className="flex gap-2">
      {existingId && <Link href={`/quotes/${existingId}`} className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">View Receipt</Link>}
      {canGenerate && <button type="button" onClick={() => start(() => convertToReceipt(sourceId))} disabled={pending} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${existingId ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-red-600 text-white hover:bg-red-700"}`}>
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? "Generating…" : `${existingId ? "Regenerate" : "Generate"} Receipt`}
      </button>}
    </div>
  );
}
