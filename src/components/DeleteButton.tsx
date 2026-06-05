"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/quotes/actions";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteButton({ docId, label }: { docId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function confirm() {
    setError("");
    start(async () => {
      try {
        await deleteDocument(docId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(""); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete ${label}?`}
        message="This permanently removes the document and its line items. This action cannot be undone."
        confirmLabel="Delete"
        danger
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
