-- FlexCeiling Pro — Saved sales report snapshots
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists sales_reports (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  period_type    text not null default 'custom' check (period_type in ('week','biweekly','month','custom')),
  date_from      date not null,
  date_to        date not null,
  status_filter  text not null default 'active' check (status_filter in ('active','paid','sent','draft','lost','all')),
  invoice_count  int not null default 0,
  subtotal       numeric not null default 0,
  discount       numeric not null default 0,
  vat_amount     numeric not null default 0,
  grand_total    numeric not null default 0,
  invoice_rows   jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users,
  constraint sales_reports_dates check (date_from <= date_to)
);

create index if not exists sales_reports_created_idx on sales_reports (created_at desc);
alter table sales_reports enable row level security;

drop policy if exists sales_reports_read on sales_reports;
drop policy if exists sales_reports_insert on sales_reports;
create policy sales_reports_read on sales_reports for select to authenticated
  using (app_user_role() in ('super','staff','invoices'));
create policy sales_reports_insert on sales_reports for insert to authenticated
  with check (app_user_role() in ('super','staff','invoices') and created_by = auth.uid());
