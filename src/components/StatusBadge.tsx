const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  imported: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "draft";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${COLORS[s] ?? COLORS.draft}`}>
      {s}
    </span>
  );
}
