"use client";

import { useTransition } from "react";
import { newPurchaseOrder } from "@/app/purchase-orders/actions";
import { Spinner } from "./Spinner";

export function NewPoButton({ supplierId, className, children }: { supplierId?: string; className?: string; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => newPurchaseOrder(supplierId))} className={`inline-flex items-center gap-2 disabled:opacity-60 ${className ?? ""}`}>
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? "Creating…" : children}
    </button>
  );
}
