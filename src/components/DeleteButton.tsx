"use client";

import { useTransition } from "react";
import { deleteDocument } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";

export function DeleteButton({ docId, label }: { docId: string; label: string }) {
  const [pending, start] = useTransition();
  function onDelete() {
    if (!window.confirm(`Delete ${label}? This permanently removes it and cannot be undone.`)) return;
    start(() => deleteDocument(docId));
  }
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {pending && <Spinner className="h-4 w-4" />} Delete
    </button>
  );
}
