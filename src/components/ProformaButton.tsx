"use client";

import { useTransition } from "react";
import Link from "next/link";
import { convertToProforma } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function ProformaButton({ sourceId, existingId, existingStatus }: { sourceId: string; existingId?: string; existingStatus?: string }) {
  const [pending, start] = useTransition();
  const canGenerate = !existingId || existingStatus === "draft";
  return (
    <div className="flex gap-2">
      {existingId && <Link href={`/quotes/${existingId}`} className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">View Pro Forma</Link>}
      {canGenerate && <button type="button" onClick={() => start(() => convertToProforma(sourceId))} disabled={pending} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${existingId ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? "Generating…" : `${existingId ? "Regenerate" : "Generate"} Pro Forma`}
      </button>}
    </div>
  );
}
