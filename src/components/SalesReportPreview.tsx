export function SalesReportPreview({ src }: { src: string }) {
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">Report preview</h2><p className="text-sm text-slate-500">This is the same layout used by the PDF export.</p></div>
        <a href={src} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-[var(--shadow-soft)] hover:bg-slate-50">Open full preview</a>
      </div>
      <div className="overflow-hidden rounded-2xl bg-slate-200 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
        <iframe title="Sales invoice report PDF preview" src={`${src}#toolbar=0&navpanes=0`} className="h-[720px] w-full bg-white" />
      </div>
    </section>
  );
}
