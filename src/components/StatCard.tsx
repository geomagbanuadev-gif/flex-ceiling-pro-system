import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-900">{value}</p>
          <p className="mt-1.5 text-sm font-medium text-slate-600">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tint)}>{icon}</span>
      </div>
    </div>
  );
}
