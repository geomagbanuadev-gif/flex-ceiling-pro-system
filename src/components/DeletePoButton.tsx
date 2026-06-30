"use client";

import { useState, useTransition } from "react";
import { deletePurchaseOrder } from "@/app/purchase-orders/actions";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeletePoButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function confirm() {
    setError("");
    start(async () => {
      try { await deletePurchaseOrder(id); }
      catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
    });
  }

  return (
    <>
      <button type="button" onClick={() => { setError(""); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
      <ConfirmDialog
        open={open}
        title={`Delete ${label}?`}
        message="This permanently removes the purchase order, its materials and payments. This cannot be undone."
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
