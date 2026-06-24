const STYLES: Record<string, { cls: string; label: string }> = {
  quote: { cls: "bg-navy/10 text-navy ring-navy/15", label: "quote" },
  proforma: { cls: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20", label: "pro forma" },
  invoice: { cls: "bg-gold/15 text-gold ring-gold/25", label: "invoice" },
  receipt: { cls: "bg-red-50 text-red-700 ring-red-200", label: "receipt" },
};

export function TypeChip({ type }: { type: string | null }) {
  const s = STYLES[type ?? "quote"] ?? STYLES.quote;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}
