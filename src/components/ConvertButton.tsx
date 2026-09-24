"use client";

import { useTransition } from "react";
import Link from "next/link";
import { convertToInvoice } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function ConvertButton({ quoteId, sourceType, existingId, existingStatus }: { quoteId: string; sourceType: "quote" | "proforma"; existingId?: string; existingStatus?: string }) {
  const [pending, start] = useTransition();
  const canGenerate = !existingId || existingStatus === "draft";
  return (
    <div className="flex gap-2">
      {existingId && <Link href={`/quotes/${existingId}`} className="inline-flex items-center rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90">View Tax Invoice</Link>}
      {canGenerate && <button
        type="button"
        onClick={() => start(() => convertToInvoice(quoteId))}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${existingId ? "border border-gold/40 text-amber-800 hover:bg-amber-50" : "bg-gold text-white hover:bg-gold/90"}`}
      >
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? "Generating…" : `${existingId ? "Regenerate" : "Generate"}${sourceType === "proforma" ? " Advance" : ""} Tax Invoice`}
      </button>}
    </div>
  );
}
