const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  sent: "bg-blue-50 text-blue-700 ring-blue-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  issued: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-red-50 text-red-700 ring-red-200",
  imported: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "draft";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${COLORS[s] ?? COLORS.draft}`}>
      {s}
    </span>
  );
}
