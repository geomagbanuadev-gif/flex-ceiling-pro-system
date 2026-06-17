"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

/** Submit button for a server-action <form>. Shows a spinner + disables itself
 *  while the action is running, so slow create actions give clear feedback. */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 disabled:opacity-60 ${className}`}
    >
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? pendingLabel ?? "Creating…" : children}
    </button>
  );
}
