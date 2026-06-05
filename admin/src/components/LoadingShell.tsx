import { Spinner } from "./Spinner";

// Static loading chrome shown by route-level loading.tsx during navigation/data fetch.
export function LoadingShell() {
  return (
    <div className="flex h-screen flex-col bg-[#eef2f7]">
      <header className="shrink-0 border-b border-navy-700 bg-navy">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="h-5 w-36 rounded bg-white/20" />
          <div className="h-7 w-7 rounded-full bg-white/20" />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <div className="mb-6 h-7 w-48 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-4 py-3">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-100" />
                <div className="h-4 flex-1 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Spinner className="h-4 w-4" /> Loading…
          </div>
        </div>
      </main>
    </div>
  );
}
