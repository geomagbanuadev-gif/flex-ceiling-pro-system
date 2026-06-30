"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { deleteSupplier } from "@/app/suppliers/actions";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function confirm() {
    setError("");
    start(async () => {
      try { await deleteSupplier(id); }
      catch (e) { unstable_rethrow(e); setError(e instanceof Error ? e.message : "Failed to delete"); }
    });
  }

  return (
    <>
      <button type="button" onClick={() => { setError(""); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
      <ConfirmDialog
        open={open}
        title={`Delete ${name}?`}
        message="This removes the supplier. Their purchase orders stay but become unlinked. This cannot be undone."
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
