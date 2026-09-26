"use client";

import { useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { removeExpenseAttachment, saveExpenseAttachment } from "@/app/expenses/actions";
import { createClient } from "@/utils/supabase/client";

export function ExpenseAttachment({ expenseId, name, size, disabled }: { expenseId: string; name: string | null; size: number | null; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const sizeLabel = size === null ? null : size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;

  function upload(formData: FormData) {
    setError("");
    start(async () => {
      try {
        const file = formData.get("attachment");
        if (!(file instanceof File) || file.size === 0) throw new Error("Choose a PDF, JPG, or PNG file");
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) throw new Error("Only PDF, JPG, and PNG files are supported");
        if (file.size > 10 * 1024 * 1024) throw new Error("Attachment must be 10 MB or smaller");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "invoice";
        const path = `${expenseId}/${crypto.randomUUID()}-${safeName}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage.from("expense-attachments").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        try {
          await saveExpenseAttachment(expenseId, { path, name: file.name, type: file.type, size: file.size });
        } catch (caught) {
          await supabase.storage.from("expense-attachments").remove([path]);
          throw caught;
        }
        if (inputRef.current) inputRef.current.value = "";
      } catch (caught) {
        unstable_rethrow(caught);
        setError(caught instanceof Error ? caught.message : "Could not upload attachment");
      }
    });
  }

  function remove() {
    setError("");
    start(async () => {
      try {
        await removeExpenseAttachment(expenseId);
      } catch (caught) {
        unstable_rethrow(caught);
        setError(caught instanceof Error ? caught.message : "Could not remove attachment");
      }
    });
  }

  return <section className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
    <h2 className="text-base font-semibold text-slate-900">Supplier invoice</h2>
    {name ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="break-all text-sm font-medium text-slate-800">{name}</p>
      {sizeLabel && <p className="mt-1 text-xs text-slate-500">{sizeLabel}</p>}
      <div className="mt-3 flex gap-2">
        <a href={`/expenses/${expenseId}/attachment`} target="_blank" rel="noreferrer" className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">View file</a>
        {!disabled && <button type="button" disabled={pending} onClick={remove} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 disabled:opacity-60">Remove</button>}
      </div>
    </div> : <p className="mt-2 text-sm text-slate-500">No invoice file attached.</p>}
    {!disabled && <form action={upload} className="mt-4 space-y-3">
      <input ref={inputRef} required name="attachment" type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-700" />
      <button disabled={pending} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-navy disabled:opacity-60">{pending ? "Uploading…" : name ? "Replace attachment" : "Upload attachment"}</button>
      <p className="text-xs text-slate-400">PDF, JPG, or PNG · maximum 10 MB</p>
    </form>}
    {disabled && <p className="mt-3 text-xs text-slate-400">Attachments are locked for void expenses.</p>}
    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
  </section>;
}
