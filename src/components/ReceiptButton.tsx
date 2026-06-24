"use client";

import { useTransition } from "react";
import { convertToReceipt } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function ReceiptButton({ sourceId }: { sourceId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => convertToReceipt(sourceId))}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
    >
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? "Generating…" : "Generate Receipt"}
    </button>
  );
}
