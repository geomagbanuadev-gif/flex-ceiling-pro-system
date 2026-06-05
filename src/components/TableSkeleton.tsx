// Streaming fallback shown while a table's data loads (Suspense).
export function TableSkeleton({ cols = 6, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="h-3 w-24 rounded bg-slate-200" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-3.5 rounded bg-slate-100 ${c === 0 ? "w-20" : c === cols - 1 ? "ml-auto w-24" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
