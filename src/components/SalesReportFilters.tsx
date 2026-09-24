"use client";

import { useState } from "react";
import { SALES_PERIOD_LABELS, SALES_STATUS_LABELS, salesRange, type SalesPeriod, type SalesStatusFilter } from "@/utils/salesReport";

const inputClass = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none";

export function SalesReportFilters({ period: initialPeriod, status, anchor, from, to }: {
  period: SalesPeriod; status: SalesStatusFilter; anchor: string; from: string; to: string;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [selectedDate, setSelectedDate] = useState(anchor);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const custom = period === "custom";
  const range = salesRange({ period, anchor: selectedDate, from: customFrom, to: customTo });

  const changePeriod = (nextPeriod: SalesPeriod) => {
    if (nextPeriod === "custom" && period !== "custom") {
      setCustomFrom(range.from);
      setCustomTo(range.to);
    }
    setPeriod(nextPeriod);
  };

  return (
    <form method="get" className="grid gap-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200 md:grid-cols-2 xl:grid-cols-6">
      <label className="text-xs font-medium text-slate-500">Period
        <select name="period" value={period} onChange={(event) => changePeriod(event.target.value as SalesPeriod)} className={`${inputClass} mt-1.5 w-full`}>
          {Object.entries(SALES_PERIOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {period === "month" ? (
        <label className="text-xs font-medium text-slate-500">Month
          <input type="month" value={selectedDate.slice(0, 7)} onChange={(event) => setSelectedDate(`${event.target.value}-01`)} className={`${inputClass} mt-1.5 w-full`} />
          <input name="anchor" type="hidden" value={selectedDate} />
        </label>
      ) : period === "week" || period === "biweekly" ? (
        <label className="text-xs font-medium text-slate-500">{period === "week" ? "Week containing" : "14-day period ends on"}
          <input name="anchor" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className={`${inputClass} mt-1.5 w-full`} />
        </label>
      ) : (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">Custom range</p>
          <p className="mt-1 text-sm text-slate-700">Choose the report start and end dates.</p>
        </div>
      )}
      <label className="text-xs font-medium text-slate-500">Report from
        <input name="from" type="date" value={custom ? customFrom : range.from} onChange={(event) => setCustomFrom(event.target.value)} disabled={!custom} className={`${inputClass} mt-1.5 w-full`} />
      </label>
      <label className="text-xs font-medium text-slate-500">Report to
        <input name="to" type="date" value={custom ? customTo : range.to} onChange={(event) => setCustomTo(event.target.value)} disabled={!custom} className={`${inputClass} mt-1.5 w-full`} />
      </label>
      <label className="text-xs font-medium text-slate-500">Invoice status
        <select name="status" defaultValue={status} className={`${inputClass} mt-1.5 w-full`}>
          {Object.entries(SALES_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="flex items-end"><button className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-navy-700">Generate report</button></div>
      <p className="text-xs text-slate-500 md:col-span-2 xl:col-span-6">Calendar week runs Monday–Sunday. Last 14 days includes the end date. Report dates are editable only for Custom dates.</p>
    </form>
  );
}
