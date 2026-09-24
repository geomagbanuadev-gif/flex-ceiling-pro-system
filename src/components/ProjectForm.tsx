"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { saveProject, type ProjectPayload } from "@/app/projects/actions";

type Client = { id: string; name: string };

export function ProjectForm({ clients, project }: { clients: Client[]; project?: Partial<ProjectPayload> }) {
  const [value, setValue] = useState<ProjectPayload>({
    id: project?.id,
    clientId: project?.clientId ?? "",
    code: project?.code ?? "",
    name: project?.name ?? "",
    status: project?.status ?? "active",
    startDate: project?.startDate ?? "",
    endDate: project?.endDate ?? "",
    notes: project?.notes ?? "",
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const set = (field: keyof ProjectPayload, next: string) => setValue((current) => ({ ...current, [field]: next }));
  const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15";
  const label = "text-xs font-medium text-slate-500";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    start(async () => {
      try { await saveProject(value); }
      catch (caught) { unstable_rethrow(caught); setError(caught instanceof Error ? caught.message : "Could not save project"); }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Client *</label><select className={input} value={value.clientId} onChange={(e) => set("clientId", e.target.value)}><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
        <div><label className={label}>Project name *</label><input className={input} value={value.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className={label}>Project code</label><input className={input} value={value.code} onChange={(e) => set("code", e.target.value)} placeholder="Optional unique code" /></div>
        <div><label className={label}>Status</label><select className={input} value={value.status} onChange={(e) => set("status", e.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
        <div className="grid grid-cols-2 gap-3"><div><label className={label}>Start date</label><input type="date" className={input} value={value.startDate} onChange={(e) => set("startDate", e.target.value)} /></div><div><label className={label}>End date</label><input type="date" className={input} value={value.endDate} onChange={(e) => set("endDate", e.target.value)} /></div></div>
        <div className="sm:col-span-2"><label className={label}>Notes</label><textarea rows={3} className={input} value={value.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end"><button disabled={pending} className="rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save project"}</button></div>
    </form>
  );
}
