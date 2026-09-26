-- FlexCeiling Pro — Quote & Invoice base schema
-- Run this, then production-safety.sql, in the Supabase SQL Editor.
-- Contains EVERYTHING: tables (quotes / pro formas / tax invoices), roles (RBAC),
-- and row-level security. Idempotent — safe to re-run.

-- ── Company settings (single row) ───────────────────────────────────────────
create table if not exists company_settings (
  id                int primary key default 1,
  legal_name        text not null default 'FLEXCEILING PRO SOLUTION GENERAL TRADING FZ LLC',
  address           text default 'VUET0976 Compass Building - Al Hulaila, Al Hulaila Industrial Zone FZ, Ras Al Khaimah, UAE',
  email             text default 'flexceilingprosolution@gmail.com',
  phone             text default '+971 50 738 1678 / 052 805 2139',
  trn               text default '1015211875700001',
  bank_account_name text default 'FLEXCEILING PRO SOLUTIONS FZ LLC',
  bank_account_no   text default '0033625654001',
  bank_iban         text default 'AE340400000033625654001',
  bank_currency     text default 'AED',
  bank_name         text default 'RAK (RAS AL KHAIMA BANK)',
  logo_url          text,
  stamp_url         text,
  default_payment_terms text default '50% Advance Payment\n40% After Delivery of All the Materials\n10% After Installation of Fabric',
  default_validity_days int  default 7,
  quote_prefix      text default '1000-',
  invoice_prefix    text default 'INV-',
  proforma_prefix   text default 'PF-',
  receipt_prefix    text default 'RCPT-',
  po_prefix         text default 'PO-',
  vat_rate          numeric default 5,
  updated_at        timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into company_settings (id) values (1) on conflict (id) do nothing;

-- ── Clients ─────────────────────────────────────────────────────────────────
create table if not exists clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  trn            text,
  address        text,
  email          text,
  contact_person text,
  contact_phone  text,
  notes          text,
  created_at     timestamptz default now(),
  created_by     uuid references auth.users
);
create index if not exists clients_name_idx on clients (lower(name));

-- ── Catalog of reusable line items ──────────────────────────────────────────
create table if not exists catalog_items (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  unit         text default 'Sqm',
  default_rate numeric,
  created_at   timestamptz default now()
);

-- ── Documents (quotes + tax invoices) ───────────────────────────────────────
create table if not exists documents (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('quote','invoice','proforma','receipt')),
  number         text not null,
  doc_date       date,
  client_id      uuid references clients on delete set null,
  -- snapshot of client details as printed on the document
  client_name    text,
  client_trn     text,
  client_address text,
  client_email   text,
  contact_person text,
  contact_phone  text,
  reference      text,
  status         text default 'draft',
  payment_terms  text,
  validity_days  int,
  subtotal       numeric default 0,
  discount       numeric default 0,
  vat_rate       numeric default 5,
  vat_amount     numeric default 0,
  grand_total    numeric default 0,
  advance_amount numeric default 0,   -- pro forma: partial amount requested up-front
  payment_method text,                -- receipt: 'cash' | 'cheque'
  amount_in_words text,
  supplier_snapshot jsonb,     -- frozen company/bank/TRN details as printed at issue time
  share_token    text,         -- unguessable token for a public read-only share link (null = not shared)
  notes          text,
  source_file    text,        -- original Excel filename (for imported records)
  imported       boolean default false,
  converted_from uuid references documents on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  created_by     uuid references auth.users,
  updated_by     uuid references auth.users
);
create index if not exists documents_type_idx   on documents (type);
create index if not exists documents_client_idx on documents (client_id);
create index if not exists documents_number_idx on documents (number);
create unique index if not exists documents_share_token_idx on documents (share_token) where share_token is not null;
create index if not exists documents_date_idx   on documents (doc_date desc);

-- ── Line items ──────────────────────────────────────────────────────────────
create table if not exists document_items (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents on delete cascade,
  sr_no       int,
  description text,
  area        numeric,
  unit        text default 'Sqm',
  rate        numeric,
  amount      numeric,
  sort_order  int default 0
);
create index if not exists document_items_doc_idx on document_items (document_id);

-- ── Saved sales report snapshots ────────────────────────────────────────────
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

-- ── Procurement: suppliers + purchase orders (the buying side) ────────────────
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null, trn text, address text, email text, phone text,
  contact_person text, contact_phone text, default_payment_terms text, notes text,
  active boolean not null default true,
  created_at timestamptz default now(), created_by uuid references auth.users
);
create index if not exists suppliers_name_idx on suppliers (lower(name));

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  supplier_id uuid references suppliers on delete set null,
  supplier_name text, supplier_trn text, supplier_address text, supplier_email text,
  contact_person text, contact_phone text,
  po_date date, expected_date date, reference text,
  status text default 'draft',          -- draft|ordered|partial|received|cancelled
  subtotal numeric default 0, discount numeric default 0,
  vat_rate numeric default 5, vat_amount numeric default 0, grand_total numeric default 0,
  amount_in_words text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  created_by uuid references auth.users, updated_by uuid references auth.users
);
create index if not exists po_number_idx on purchase_orders (number);
create index if not exists po_supplier_idx on purchase_orders (supplier_id);
create index if not exists po_date_idx on purchase_orders (po_date desc);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders on delete cascade,
  sr_no int, description text, quantity numeric, unit text default 'pcs',
  unit_price numeric, amount numeric, sort_order int default 0
);
create index if not exists poi_po_idx on purchase_order_items (purchase_order_id);

create table if not exists purchase_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders on delete cascade,
  payment_date date, method text, reference text, amount numeric default 0, notes text,
  created_at timestamptz default now(), created_by uuid references auth.users
);
create index if not exists pp_po_idx on purchase_payments (purchase_order_id);

-- ── Finance operations: projects + expenses ────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete restrict,
  code text, name text not null,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  start_date date, end_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users, updated_by uuid references auth.users,
  constraint projects_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create unique index if not exists projects_code_unique_idx on projects (lower(code)) where code is not null;
create index if not exists projects_client_idx on projects (client_id);
create index if not exists projects_status_idx on projects (status);

alter table documents add column if not exists project_id uuid references projects on delete set null;
alter table documents add column if not exists due_date date;
alter table documents add column if not exists applies_to_invoice_id uuid references documents on delete set null;
create index if not exists documents_project_idx on documents (project_id);
create index if not exists documents_due_date_idx on documents (due_date);
create index if not exists documents_applies_invoice_idx on documents (applies_to_invoice_id);
alter table purchase_orders add column if not exists project_id uuid references projects on delete set null;
alter table purchase_orders add column if not exists due_date date;
create index if not exists po_project_idx on purchase_orders (project_id);
create index if not exists po_due_date_idx on purchase_orders (due_date);

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(), name text not null,
  active boolean not null default true, sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists expense_categories_name_unique_idx on expense_categories (lower(name));
insert into expense_categories (name, sort_order) values
  ('Salary', 10), ('Petrol / fuel', 20), ('Transport', 30), ('Rent', 40),
  ('Utilities', 50), ('Tools and equipment', 60), ('Materials without PO', 70),
  ('Subcontractor', 80), ('Client-related expense', 90), ('Other', 100)
on conflict (lower(name)) do nothing;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(), expense_date date not null, due_date date,
  category_id uuid not null references expense_categories on delete restrict,
  description text not null, payee_name text,
  supplier_id uuid references suppliers on delete set null,
  client_id uuid references clients on delete set null,
  project_id uuid references projects on delete set null,
  purchase_order_id uuid references purchase_orders on delete set null,
  supplier_invoice_number text,
  attachment_path text, attachment_name text, attachment_type text,
  attachment_size bigint check (attachment_size is null or attachment_size >= 0),
  status text not null default 'draft' check (status in ('draft','posted','void')),
  subtotal numeric not null default 0 check (subtotal >= 0),
  vat_amount numeric not null default 0 check (vat_amount >= 0),
  vat_recoverable boolean not null default false,
  grand_total numeric not null default 0 check (grand_total >= 0),
  reference text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users, updated_by uuid references auth.users
);
alter table expenses add column if not exists purchase_order_id uuid references purchase_orders on delete set null;
alter table expenses add column if not exists supplier_invoice_number text;
alter table expenses add column if not exists attachment_path text;
alter table expenses add column if not exists attachment_name text;
alter table expenses add column if not exists attachment_type text;
alter table expenses add column if not exists attachment_size bigint check (attachment_size is null or attachment_size >= 0);
create index if not exists expenses_date_idx on expenses (expense_date desc);
create index if not exists expenses_category_idx on expenses (category_id);
create index if not exists expenses_client_idx on expenses (client_id);
create index if not exists expenses_project_idx on expenses (project_id);
create index if not exists expenses_status_idx on expenses (status);
create index if not exists expenses_purchase_order_idx on expenses (purchase_order_id);
create index if not exists expenses_supplier_invoice_idx on expenses (supplier_invoice_number) where supplier_invoice_number is not null;
comment on column expenses.purchase_order_id is 'Reference-only link; finance cost, payment and payable tracking remain on the purchase order.';

create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses on delete cascade,
  sort_order int not null default 0,
  product_code text, description text not null,
  quantity numeric not null default 1 check (quantity > 0), unit text not null default 'pcs',
  unit_price numeric not null default 0 check (unit_price >= 0),
  discount numeric not null default 0 check (discount >= 0),
  vat_rate numeric not null default 0 check (vat_rate >= 0),
  net_amount numeric not null default 0 check (net_amount >= 0),
  vat_amount numeric not null default 0 check (vat_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  serial_number text
);
create index if not exists expense_items_expense_idx on expense_items (expense_id, sort_order);

create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses on delete cascade,
  payment_date date not null, method text, reference text,
  amount numeric not null default 0 check (amount > 0), notes text,
  created_at timestamptz not null default now(), created_by uuid references auth.users
);
create index if not exists expense_payments_expense_idx on expense_payments (expense_id);
create index if not exists expense_payments_date_idx on expense_payments (payment_date desc);

create or replace function validate_expense_payment_target() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from expenses where id = new.expense_id and purchase_order_id is not null) then
    raise exception 'Record this payment on the linked purchase order to avoid double-counting';
  end if;
  return new;
end $$;
drop trigger if exists expense_payments_validate_target on expense_payments;
create trigger expense_payments_validate_target before insert or update on expense_payments
  for each row execute function validate_expense_payment_target();

create or replace function validate_finance_links() returns trigger
language plpgsql set search_path = public as $$
declare project_client uuid;
declare target_client uuid;
begin
  if tg_table_name = 'documents' then
    if new.applies_to_invoice_id is not null then
      if new.type <> 'receipt' then raise exception 'Only receipts can be allocated to an invoice'; end if;
      select client_id into target_client from documents where id = new.applies_to_invoice_id and type = 'invoice';
      if not found then raise exception 'Receipt allocation target must be an invoice'; end if;
      if new.client_id is distinct from target_client then raise exception 'Receipt and invoice clients must match'; end if;
    end if;
  end if;
  if new.project_id is not null then
    select client_id into project_client from projects where id = new.project_id;
    if tg_table_name = 'documents' then
      if new.client_id is distinct from project_client then raise exception 'Project and record clients must match'; end if;
    elsif tg_table_name = 'expenses' then
      if new.client_id is distinct from project_client then raise exception 'Project and record clients must match'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists documents_validate_finance_links on documents;
create trigger documents_validate_finance_links before insert or update on documents for each row execute function validate_finance_links();
drop trigger if exists purchase_orders_validate_finance_links on purchase_orders;
create trigger purchase_orders_validate_finance_links before insert or update on purchase_orders for each row execute function validate_finance_links();
drop trigger if exists expenses_validate_finance_links on expenses;
create trigger expenses_validate_finance_links before insert or update on expenses for each row execute function validate_finance_links();

-- ── Roles / profiles (RBAC) ──────────────────────────────────────────────────
-- Roles: super (manage users + everything), staff (all documents),
--        quotes (quotations only), invoices (tax invoices + pro formas only).
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'staff' check (role in ('super','staff','finance','quotes','invoices')),
  active     boolean not null default false,   -- new users start with NO access until a super grants it
  created_at timestamptz default now()
);

-- Auto-create a profile when an account is added (Dashboard → Authentication → Add user)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, active)
  values (new.id, new.email, 'staff', false)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill existing user(s) as active SUPER (the first/owner account).
-- ⚠ If you already have several users, narrow this so only YOUR row becomes 'super'.
insert into profiles (id, email, role, active)
  select id, email, 'super', true from auth.users
  on conflict (id) do update set role = 'super', active = true;

-- Helper: current user's effective role (null when inactive / no profile).
-- SECURITY DEFINER so it bypasses RLS (no recursion when used inside policies).
create or replace function app_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active = true
$$;

-- Saves the expense header and optional supplier-invoice items atomically.
create or replace function save_expense_with_items(p_expense_id uuid, p_fields jsonb, p_items jsonb)
returns uuid language plpgsql set search_path = public as $$
declare
  v_id uuid;
  v_purchase_order_id uuid := nullif(p_fields->>'purchase_order_id', '')::uuid;
  v_supplier_id uuid := nullif(p_fields->>'supplier_id', '')::uuid;
  v_project_id uuid := nullif(p_fields->>'project_id', '')::uuid;
  v_po_supplier_id uuid;
  v_po_project_id uuid;
begin
  if coalesce(app_user_role(), '') not in ('super','finance') then raise exception 'Not authorized for finance'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then raise exception 'Expense items must be an array'; end if;
  if v_purchase_order_id is not null then
    select supplier_id, project_id into v_po_supplier_id, v_po_project_id from purchase_orders where id = v_purchase_order_id;
    if not found then raise exception 'Purchase order not found'; end if;
    if v_po_supplier_id is not null and v_po_supplier_id is distinct from v_supplier_id then raise exception 'The purchase order belongs to a different supplier'; end if;
    if v_po_project_id is not null and v_po_project_id is distinct from v_project_id then raise exception 'The purchase order belongs to a different project'; end if;
    if p_expense_id is not null and exists (select 1 from expense_payments where expense_id = p_expense_id) then
      raise exception 'Remove the expense payments before linking this record to a purchase order';
    end if;
  end if;
  if p_expense_id is null then
    insert into expenses (expense_date, due_date, category_id, description, payee_name, supplier_id, client_id, project_id, purchase_order_id, supplier_invoice_number, status, subtotal, vat_amount, vat_recoverable, grand_total, reference, notes, created_by, updated_by)
    values ((p_fields->>'expense_date')::date, nullif(p_fields->>'due_date', '')::date, (p_fields->>'category_id')::uuid, p_fields->>'description', nullif(p_fields->>'payee_name', ''), v_supplier_id, nullif(p_fields->>'client_id', '')::uuid, v_project_id, v_purchase_order_id, nullif(p_fields->>'supplier_invoice_number', ''), p_fields->>'status', coalesce((p_fields->>'subtotal')::numeric, 0), coalesce((p_fields->>'vat_amount')::numeric, 0), coalesce((p_fields->>'vat_recoverable')::boolean, false), coalesce((p_fields->>'grand_total')::numeric, 0), nullif(p_fields->>'reference', ''), nullif(p_fields->>'notes', ''), auth.uid(), auth.uid())
    returning id into v_id;
  else
    update expenses set
      expense_date = (p_fields->>'expense_date')::date, due_date = nullif(p_fields->>'due_date', '')::date,
      category_id = (p_fields->>'category_id')::uuid, description = p_fields->>'description', payee_name = nullif(p_fields->>'payee_name', ''),
      supplier_id = v_supplier_id, client_id = nullif(p_fields->>'client_id', '')::uuid, project_id = v_project_id,
      purchase_order_id = v_purchase_order_id, supplier_invoice_number = nullif(p_fields->>'supplier_invoice_number', ''),
      status = p_fields->>'status', subtotal = coalesce((p_fields->>'subtotal')::numeric, 0),
      vat_amount = coalesce((p_fields->>'vat_amount')::numeric, 0), vat_recoverable = coalesce((p_fields->>'vat_recoverable')::boolean, false),
      grand_total = coalesce((p_fields->>'grand_total')::numeric, 0), reference = nullif(p_fields->>'reference', ''),
      notes = nullif(p_fields->>'notes', ''), updated_at = now(), updated_by = auth.uid()
    where id = p_expense_id returning id into v_id;
    if v_id is null then raise exception 'Expense not found'; end if;
  end if;
  delete from expense_items where expense_id = v_id;
  with parsed as (
    select coalesce((entry->>'sort_order')::int, ordinality::int - 1) as sort_order,
      nullif(entry->>'product_code', '') as product_code, btrim(entry->>'description') as description,
      coalesce((entry->>'quantity')::numeric, 1) as quantity, coalesce(nullif(entry->>'unit', ''), 'pcs') as unit,
      coalesce((entry->>'unit_price')::numeric, 0) as unit_price, coalesce((entry->>'discount')::numeric, 0) as discount,
      coalesce((entry->>'vat_rate')::numeric, 0) as vat_rate, nullif(entry->>'serial_number', '') as serial_number
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as source(entry, ordinality)
  ), calculated as (
    select *, round(quantity * unit_price - discount, 2) as net_amount from parsed
  )
  insert into expense_items (expense_id, sort_order, product_code, description, quantity, unit, unit_price, discount, vat_rate, net_amount, vat_amount, total_amount, serial_number)
  select v_id, sort_order, product_code, description, quantity, unit, unit_price, discount, vat_rate, net_amount,
    round(net_amount * vat_rate / 100, 2), round(net_amount + round(net_amount * vat_rate / 100, 2), 2), serial_number
  from calculated;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 0 then
    update expenses set subtotal = totals.subtotal, vat_amount = totals.vat_amount, grand_total = round(totals.subtotal + totals.vat_amount, 2)
    from (select round(coalesce(sum(net_amount), 0), 2) as subtotal, round(coalesce(sum(vat_amount), 0), 2) as vat_amount from expense_items where expense_id = v_id) totals
    where expenses.id = v_id;
  end if;
  return v_id;
end $$;
grant execute on function save_expense_with_items(uuid, jsonb, jsonb) to authenticated;

-- A super can never be deactivated or demoted (guards against lockout).
create or replace function protect_super() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.role = 'super' and (new.role <> 'super' or new.active = false) then
    raise exception 'A super user cannot be demoted or revoked';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_super on profiles;
create trigger profiles_protect_super before update on profiles
  for each row execute function protect_super();

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Access is role-based; audit trail is also kept via created_by / updated_by.
alter table company_settings enable row level security;
alter table clients          enable row level security;
alter table catalog_items    enable row level security;
alter table documents        enable row level security;
alter table document_items   enable row level security;
alter table sales_reports    enable row level security;
alter table profiles         enable row level security;
alter table suppliers            enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;
alter table purchase_payments    enable row level security;
alter table projects             enable row level security;
alter table expense_categories   enable row level security;
alter table expenses             enable row level security;
alter table expense_items        enable row level security;
alter table expense_payments     enable row level security;

-- profiles: a user sees their own row; supers see/manage all
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_write on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or app_user_role() = 'super');
create policy profiles_write on profiles for update to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');

-- documents: gated by type for the quotes/invoices roles
--   (the invoices role also covers pro formas; super/staff see everything)
drop policy if exists auth_all on documents;
drop policy if exists doc_access on documents;
create policy doc_access on documents for all to authenticated
  using (
    app_user_role() in ('super','staff')
    or (app_user_role() = 'quotes'   and type = 'quote')
    or (app_user_role() = 'invoices' and type in ('invoice','proforma','receipt'))
  )
  with check (
    app_user_role() in ('super','staff')
    or (app_user_role() = 'quotes'   and type = 'quote')
    or (app_user_role() = 'invoices' and type in ('invoice','proforma','receipt'))
  );
drop policy if exists finance_documents_read on documents;
create policy finance_documents_read on documents for select to authenticated
  using (app_user_role() = 'finance' and type in ('invoice','receipt'));

-- document_items: inherit access from the parent document
drop policy if exists auth_all on document_items;
drop policy if exists item_access on document_items;
create policy item_access on document_items for all to authenticated
  using (exists (
    select 1 from documents d where d.id = document_id and (
      app_user_role() in ('super','staff')
      or (app_user_role() = 'quotes'   and d.type = 'quote')
      or (app_user_role() = 'invoices' and d.type in ('invoice','proforma','receipt')))))
  with check (exists (
    select 1 from documents d where d.id = document_id and (
      app_user_role() in ('super','staff')
      or (app_user_role() = 'quotes'   and d.type = 'quote')
      or (app_user_role() = 'invoices' and d.type in ('invoice','proforma','receipt')))));
drop policy if exists finance_document_items_read on document_items;
create policy finance_document_items_read on document_items for select to authenticated
  using (app_user_role() = 'finance' and exists (
    select 1 from documents d where d.id = document_id and d.type in ('invoice','receipt')));

-- sales report snapshots are immutable; billing users can read and create them
drop policy if exists sales_reports_read on sales_reports;
drop policy if exists sales_reports_insert on sales_reports;
create policy sales_reports_read on sales_reports for select to authenticated
  using (app_user_role() in ('super','staff','invoices'));
create policy sales_reports_insert on sales_reports for insert to authenticated
  with check (app_user_role() in ('super','staff','invoices') and created_by = auth.uid());

-- clients + catalog: any active user
drop policy if exists auth_all on clients;
drop policy if exists client_access on clients;
create policy client_access on clients for all to authenticated
  using (app_user_role() is not null) with check (app_user_role() is not null);
drop policy if exists auth_all on catalog_items;
drop policy if exists catalog_access on catalog_items;
create policy catalog_access on catalog_items for all to authenticated
  using (app_user_role() is not null) with check (app_user_role() is not null);

-- company settings: every active user reads, only super edits
drop policy if exists auth_all on company_settings;
drop policy if exists settings_read on company_settings;
drop policy if exists settings_write on company_settings;
create policy settings_read  on company_settings for select to authenticated
  using (app_user_role() is not null);
create policy settings_write on company_settings for update to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');

-- procurement (suppliers + purchase orders + items + payments): super/staff only
do $$
declare t text;
begin
  foreach t in array array['suppliers','purchase_orders','purchase_order_items','purchase_payments']
  loop
    execute format('drop policy if exists proc_access on %I', t);
    execute format($f$create policy proc_access on %I for all to authenticated
      using (app_user_role() in ('super','staff'))
      with check (app_user_role() in ('super','staff'))$f$, t);
  end loop;
end $$;
do $$
declare t text;
begin
  foreach t in array array['suppliers','purchase_orders','purchase_order_items','purchase_payments']
  loop
    execute format('drop policy if exists finance_procurement_read on %I', t);
    execute format($f$create policy finance_procurement_read on %I for select to authenticated
      using (app_user_role() = 'finance')$f$, t);
  end loop;
end $$;

-- projects: every active user can select a project; super/staff manage them
drop policy if exists projects_read on projects;
drop policy if exists projects_write on projects;
create policy projects_read on projects for select to authenticated using (app_user_role() is not null);
create policy projects_write on projects for all to authenticated
  using (app_user_role() in ('super','staff')) with check (app_user_role() in ('super','staff'));

-- finance expenses may contain salary data and are restricted to super users
drop policy if exists expense_categories_access on expense_categories;
drop policy if exists expenses_access on expenses;
drop policy if exists expense_items_access on expense_items;
drop policy if exists expense_payments_access on expense_payments;
create policy expense_categories_access on expense_categories for all to authenticated
  using (app_user_role() in ('super','finance')) with check (app_user_role() in ('super','finance'));
create policy expenses_access on expenses for all to authenticated
  using (app_user_role() in ('super','finance')) with check (app_user_role() in ('super','finance'));
create policy expense_items_access on expense_items for all to authenticated
  using (app_user_role() in ('super','finance')) with check (app_user_role() in ('super','finance'));
create policy expense_payments_access on expense_payments for all to authenticated
  using (app_user_role() in ('super','finance')) with check (app_user_role() in ('super','finance'));

-- Private supplier-invoice files; accessed only through authenticated expense screens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-attachments', 'expense-attachments', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists expense_attachments_access on storage.objects;
create policy expense_attachments_access on storage.objects for all to authenticated
  using (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'))
  with check (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'));

-- Read models keep dashboard, finance, and project list calculations in the
-- database so pages fetch only the rows and totals they display.
create index if not exists documents_type_status_date_idx on documents (type, status, doc_date desc);
create index if not exists documents_receipt_allocation_idx on documents (applies_to_invoice_id, status) where type = 'receipt';
create index if not exists purchase_orders_status_date_idx on purchase_orders (status, po_date desc);
create index if not exists expenses_status_date_idx on expenses (status, expense_date desc);
create index if not exists expenses_supplier_idx on expenses (supplier_id);

create or replace view finance_receivables with (security_invoker = true) as
with receipt_totals as (
  select applies_to_invoice_id as invoice_id, round(coalesce(sum(grand_total), 0), 2) as received
  from documents
  where type = 'receipt' and status = 'issued' and applies_to_invoice_id is not null
  group by applies_to_invoice_id
), base as (
  select invoice.id, invoice.number, invoice.client_name as client, coalesce(project.name, 'Unassigned') as project,
    invoice.doc_date as invoice_date, invoice.due_date,
    round(coalesce(invoice.grand_total, 0), 2) as total,
    round(coalesce(receipts.received, 0), 2) as received,
    invoice.status = 'paid' and coalesce(receipts.received, 0) = 0 as legacy_paid
  from documents invoice
  left join receipt_totals receipts on receipts.invoice_id = invoice.id
  left join projects project on project.id = invoice.project_id
  where invoice.type = 'invoice' and invoice.status in ('sent', 'paid')
), balances as (
  select *, case when legacy_paid then 0 else greatest(round(total - received, 2), 0) end as balance,
    greatest(round(received - total, 2), 0) as excess
  from base
)
select *,
  case when legacy_paid or balance <= 0 then 'paid' when received <= 0 then 'unpaid' else 'partial' end as payment_state,
  case when due_date is null then 'no-due-date' when due_date >= current_date then 'current'
    when current_date - due_date <= 30 then '1-30' when current_date - due_date <= 60 then '31-60'
    when current_date - due_date <= 90 then '61-90' else 'over-90' end as aging
from balances;

create or replace view finance_payables with (security_invoker = true) as
with po_payments as (
  select purchase_order_id, round(coalesce(sum(amount), 0), 2) as paid from purchase_payments group by purchase_order_id
), expense_payment_totals as (
  select expense_id, round(coalesce(sum(amount), 0), 2) as paid from expense_payments group by expense_id
), base as (
  select po.id, 'Purchase order'::text as source, po.number, coalesce(po.supplier_name, '—') as payee,
    coalesce(project.name, 'Unassigned') as project, po.po_date as record_date, po.due_date,
    round(coalesce(po.grand_total, 0), 2) as total, round(coalesce(payments.paid, 0), 2) as paid
  from purchase_orders po
  left join po_payments payments on payments.purchase_order_id = po.id
  left join projects project on project.id = po.project_id
  where po.status in ('ordered', 'partial', 'received')
  union all
  select expense.id, 'Expense'::text, expense.description, coalesce(expense.payee_name, '—'),
    coalesce(project.name, 'Unassigned'), expense.expense_date, expense.due_date,
    round(coalesce(expense.grand_total, 0), 2), round(coalesce(payments.paid, 0), 2)
  from expenses expense
  left join expense_payment_totals payments on payments.expense_id = expense.id
  left join projects project on project.id = expense.project_id
  where expense.status = 'posted' and expense.purchase_order_id is null
), balances as (
  select *, greatest(round(total - paid, 2), 0) as balance from base
)
select *, case when paid <= 0 then 'unpaid' when balance <= 0 then 'paid' else 'partial' end as payment_state,
  case when due_date is null then 'no-due-date' when due_date >= current_date then 'current'
    when current_date - due_date <= 30 then '1-30' when current_date - due_date <= 60 then '31-60'
    when current_date - due_date <= 90 then '61-90' else 'over-90' end as aging
from balances;

create or replace view finance_expenses with (security_invoker = true) as
with payments as (
  select expense_id, round(coalesce(sum(amount), 0), 2) as paid from expense_payments group by expense_id
)
select expense.id, expense.expense_date as record_date, expense.description,
  coalesce(expense.payee_name, '—') as payee, coalesce(project.name, 'Unassigned') as project,
  expense.status || case when expense.purchase_order_id is not null then ' · PO-linked' else '' end as display_status,
  round(coalesce(expense.grand_total, 0), 2) as total,
  case when expense.purchase_order_id is not null then 0 else round(coalesce(payments.paid, 0), 2) end as paid,
  case when expense.purchase_order_id is not null then 0 else greatest(round(coalesce(expense.grand_total, 0) - coalesce(payments.paid, 0), 2), 0) end as balance,
  expense.status, expense.category_id, expense.supplier_id, expense.project_id, expense.reference, expense.supplier_invoice_number
from expenses expense
left join payments on payments.expense_id = expense.id
left join projects project on project.id = expense.project_id;

create or replace view project_finance_summary with (security_invoker = true) as
with sales as (
  select project_id, round(coalesce(sum(coalesce(subtotal, 0) - coalesce(discount, 0)), 0), 2) as net_sales
  from documents where type = 'invoice' and status in ('sent', 'paid') and project_id is not null group by project_id
), receipts as (
  select project_id, round(coalesce(sum(grand_total), 0), 2) as received
  from documents where type = 'receipt' and status = 'issued' and project_id is not null group by project_id
), po_costs as (
  select project_id, round(coalesce(sum(coalesce(subtotal, 0) - coalesce(discount, 0)), 0), 2) as cost
  from purchase_orders where status in ('ordered', 'partial', 'received') and project_id is not null group by project_id
), expense_costs as (
  select project_id, round(coalesce(sum(coalesce(subtotal, 0) + case when vat_recoverable then 0 else coalesce(vat_amount, 0) end), 0), 2) as cost
  from expenses where status = 'posted' and purchase_order_id is null and project_id is not null group by project_id
), po_paid as (
  select po.project_id, round(coalesce(sum(payment.amount), 0), 2) as paid
  from purchase_payments payment join purchase_orders po on po.id = payment.purchase_order_id
  where po.project_id is not null group by po.project_id
), expense_paid as (
  select expense.project_id, round(coalesce(sum(payment.amount), 0), 2) as paid
  from expense_payments payment join expenses expense on expense.id = payment.expense_id
  where expense.project_id is not null group by expense.project_id
)
select project.id, project.code, project.name, project.status, project.client_id, client.name as client,
  coalesce(sales.net_sales, 0) as net_sales,
  round(coalesce(po_costs.cost, 0) + coalesce(expense_costs.cost, 0), 2) as costs,
  coalesce(receipts.received, 0) as received,
  round(coalesce(po_paid.paid, 0) + coalesce(expense_paid.paid, 0), 2) as paid,
  round(coalesce(sales.net_sales, 0) - coalesce(po_costs.cost, 0) - coalesce(expense_costs.cost, 0), 2) as margin,
  round(coalesce(receipts.received, 0) - coalesce(po_paid.paid, 0) - coalesce(expense_paid.paid, 0), 2) as net_cash
from projects project
join clients client on client.id = project.client_id
left join sales on sales.project_id = project.id
left join receipts on receipts.project_id = project.id
left join po_costs on po_costs.project_id = project.id
left join expense_costs on expense_costs.project_id = project.id
left join po_paid on po_paid.project_id = project.id
left join expense_paid on expense_paid.project_id = project.id;

create or replace view dashboard_monthly_sales with (security_invoker = true) as
select to_char(date_trunc('month', doc_date), 'YYYY-MM') as month,
  round(coalesce(sum(grand_total), 0), 2) as total
from documents
where type = 'invoice' and status in ('sent', 'paid') and doc_date >= date_trunc('month', current_date) - interval '5 months'
group by date_trunc('month', doc_date);

create or replace view dashboard_quote_pipeline with (security_invoker = true) as
select coalesce(status, 'draft') as status, count(*)::int as count from documents where type = 'quote' group by coalesce(status, 'draft');

create or replace view dashboard_top_clients with (security_invoker = true) as
select coalesce(client_name, '—') as client, round(coalesce(sum(grand_total), 0), 2) as total
from documents where type = 'invoice' and status in ('sent', 'paid')
group by client_name having sum(grand_total) > 0 order by total desc limit 6;

create or replace function dashboard_summary()
returns jsonb language sql stable set search_path = public as $$
  with invoice_totals as (
    select round(coalesce(sum(grand_total), 0), 2) as invoiced_total,
      count(*)::int as invoice_count,
      round(coalesce(sum(grand_total) filter (where doc_date >= date_trunc('month', current_date)), 0), 2) as month_total
    from documents where type = 'invoice' and status in ('sent', 'paid')
  ), quote_totals as (
    select count(*)::int as quote_count,
      count(*) filter (where status in ('won', 'ongoing'))::int as accepted_count
    from documents where type = 'quote'
  ), proforma_totals as (
    select count(*)::int as proforma_count from documents where type = 'proforma'
  ), receivables as (
    select round(coalesce(sum(balance), 0), 2) as outstanding, count(*) filter (where balance > 0)::int as outstanding_count
    from finance_receivables
  )
  select jsonb_build_object(
    'invoicedTotal', invoice_totals.invoiced_total, 'invoiceCount', invoice_totals.invoice_count,
    'monthTotal', invoice_totals.month_total, 'quoteCount', quote_totals.quote_count,
    'acceptedCount', quote_totals.accepted_count, 'proformaCount', proforma_totals.proforma_count,
    'outstanding', receivables.outstanding, 'outstandingCount', receivables.outstanding_count
  ) from invoice_totals, quote_totals, proforma_totals, receivables
$$;

create or replace function finance_period_summary(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable set search_path = public as $$
declare result jsonb;
begin
  if coalesce(app_user_role(), '') not in ('super','finance') then raise exception 'Not authorized for finance'; end if;
  with sales as (
    select round(coalesce(sum(coalesce(subtotal, 0) - coalesce(discount, 0)), 0), 2) as value
    from documents where type = 'invoice' and status in ('sent', 'paid') and (p_from is null or doc_date >= p_from) and (p_to is null or doc_date <= p_to)
  ), received as (
    select round(coalesce(sum(grand_total), 0), 2) as value from documents
    where type = 'receipt' and status = 'issued' and (p_from is null or doc_date >= p_from) and (p_to is null or doc_date <= p_to)
  ), po_cost as (
    select round(coalesce(sum(coalesce(subtotal, 0) - coalesce(discount, 0)), 0), 2) as value from purchase_orders
    where status in ('ordered', 'partial', 'received') and (p_from is null or po_date >= p_from) and (p_to is null or po_date <= p_to)
  ), expense_cost as (
    select round(coalesce(sum(coalesce(subtotal, 0) + case when vat_recoverable then 0 else coalesce(vat_amount, 0) end), 0), 2) as value from expenses
    where status = 'posted' and purchase_order_id is null and (p_from is null or expense_date >= p_from) and (p_to is null or expense_date <= p_to)
  ), paid as (
    select round(coalesce((select sum(amount) from purchase_payments where (p_from is null or payment_date >= p_from) and (p_to is null or payment_date <= p_to)), 0)
      + coalesce((select sum(amount) from expense_payments where (p_from is null or payment_date >= p_from) and (p_to is null or payment_date <= p_to)), 0), 2) as value
  ), live as (
    select round(coalesce((select sum(balance) from finance_receivables), 0), 2) as receivables,
      round(coalesce((select sum(balance) from finance_payables), 0), 2) as payables
  ), reconciliation as (
    select (select count(*) from documents where type = 'receipt' and status = 'issued' and applies_to_invoice_id is null)::int as unapplied_receipts,
      ((select count(*) from documents where project_id is null) + (select count(*) from purchase_orders where project_id is null) + (select count(*) from expenses where project_id is null))::int as unassigned_count
  )
  select jsonb_build_object('netSales', sales.value, 'moneyReceived', received.value, 'receivables', live.receivables,
    'committedCosts', round(po_cost.value + expense_cost.value, 2), 'moneyPaid', paid.value, 'payables', live.payables,
    'projectMargin', round(sales.value - po_cost.value - expense_cost.value, 2), 'netCash', round(received.value - paid.value, 2),
    'unappliedReceiptCount', reconciliation.unapplied_receipts, 'unassignedCount', reconciliation.unassigned_count)
  into result from sales, received, po_cost, expense_cost, paid, live, reconciliation;
  return result;
end $$;

grant select on finance_receivables, finance_payables, finance_expenses, project_finance_summary,
  dashboard_monthly_sales, dashboard_quote_pipeline, dashboard_top_clients to authenticated;
grant execute on function dashboard_summary() to authenticated;
grant execute on function finance_period_summary(date, date) to authenticated;
