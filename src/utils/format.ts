const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-02-25" -> "25 Feb 2026" (timezone-safe, no Date parsing). */
export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export const money = (v: number | null | undefined) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { maximumFractionDigits: 0 });

export const money2 = (v: number | null | undefined) =>
  v == null ? "—" : "AED " + Number(v).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
