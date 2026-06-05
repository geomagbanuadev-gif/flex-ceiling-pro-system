"use client";

import { useTransition } from "react";
import { convertToInvoice } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function ConvertButton({ quoteId }: { quoteId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => convertToInvoice(quoteId))}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90 disabled:opacity-60"
    >
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? "Generating…" : "Generate Tax Invoice"}
    </button>
  );
}
