export const SALES_PERIODS = ["week", "biweekly", "month", "custom"] as const;
export const SALES_STATUSES = ["active", "paid", "sent", "draft", "lost", "all"] as const;

export type SalesPeriod = (typeof SALES_PERIODS)[number];
export type SalesStatusFilter = (typeof SALES_STATUSES)[number];

export const SALES_PERIOD_LABELS: Record<SalesPeriod, string> = {
  week: "Calendar week", biweekly: "Last 14 days", month: "Selected month", custom: "Custom dates",
};
export const SALES_STATUS_LABELS: Record<SalesStatusFilter, string> = {
  active: "Sent & paid", paid: "Paid only", sent: "Sent only", draft: "Draft only", lost: "Lost only", all: "All statuses",
};

export type SalesRow = {
  id: string;
  number: string;
  status: string;
  doc_date: string;
  client_name: string | null;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
};

export type SalesTotals = {
  invoiceCount: number;
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
};

export type SalesSnapshot = {
  generatedAt: string;
  rows: SalesRow[];
  totals: SalesTotals;
};

export type SalesRange = { from: string; to: string };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => new Date(`${value}T00:00:00Z`);
const validDate = (value?: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const date = parse(value!);
  return !Number.isNaN(date.valueOf()) && iso(date) === value;
};

export function normalizeSalesPeriod(value?: string): SalesPeriod {
  return SALES_PERIODS.includes(value as SalesPeriod) ? value as SalesPeriod : "month";
}

export function normalizeSalesStatus(value?: string): SalesStatusFilter {
  return SALES_STATUSES.includes(value as SalesStatusFilter) ? value as SalesStatusFilter : "active";
}

export function salesRange(
  input: { period?: string; anchor?: string; from?: string; to?: string },
  now = new Date()
): SalesRange {
  const period = normalizeSalesPeriod(input.period);
  const today = iso(now);
  const anchor = validDate(input.anchor) ? input.anchor! : today;

  if (period === "custom" && validDate(input.from) && validDate(input.to) && input.from! <= input.to!) {
    return { from: input.from!, to: input.to! };
  }

  const date = parse(anchor);
  if (period === "week") {
    const day = date.getUTCDay() || 7;
    const from = new Date(date);
    from.setUTCDate(date.getUTCDate() - day + 1);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    return { from: iso(from), to: iso(to) };
  }

  if (period === "biweekly") {
    const from = new Date(date);
    from.setUTCDate(date.getUTCDate() - 13);
    return { from: iso(from), to: anchor };
  }

  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { from: iso(from), to: iso(to) };
}

const sum = (rows: SalesRow[], key: keyof Pick<SalesRow, "subtotal" | "discount" | "vat_amount" | "grand_total">) =>
  Math.round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0) * 100) / 100;

export function salesTotals(rows: SalesRow[]): SalesTotals {
  return {
    invoiceCount: rows.length,
    subtotal: sum(rows, "subtotal"),
    discount: sum(rows, "discount"),
    vatAmount: sum(rows, "vat_amount"),
    grandTotal: sum(rows, "grand_total"),
  };
}
