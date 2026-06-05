"use client";

import { useTransition } from "react";
import { duplicateDocument } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function DuplicateButton({ docId }: { docId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => duplicateDocument(docId))}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      title="Make an editable copy with a new number"
    >
      {pending && <Spinner className="h-4 w-4" />} Duplicate
    </button>
  );
}
