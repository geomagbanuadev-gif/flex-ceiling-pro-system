"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./Toast";

const MESSAGES: Record<string, string> = {
  saved: "Saved",
  deleted: "Document deleted",
  converted: "Tax invoice created",
  proforma: "Pro forma created — set the advance",
  receipt: "Receipt created — confirm the payment details",
  duplicated: "Duplicated — ready to edit",
  "client-saved": "Client saved",
};

export function FlashToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    const f = sp.get("flash");
    if (!f) return;
    toast(MESSAGES[f] ?? "Done");
    const p = new URLSearchParams(sp.toString());
    p.delete("flash");
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  return null;
}
