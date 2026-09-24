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
  status text not null default 'draft' check (status in ('draft','posted','void')),
  subtotal numeric not null default 0 check (subtotal >= 0),
  vat_amount numeric not null default 0 check (vat_amount >= 0),
  vat_recoverable boolean not null default false,
  grand_total numeric not null default 0 check (grand_total >= 0),
  reference text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users, updated_by uuid references auth.users
);
create index if not exists expenses_date_idx on expenses (expense_date desc);
create index if not exists expenses_category_idx on expenses (category_id);
create index if not exists expenses_client_idx on expenses (client_id);
create index if not exists expenses_project_idx on expenses (project_id);
create index if not exists expenses_status_idx on expenses (status);

create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses on delete cascade,
  payment_date date not null, method text, reference text,
  amount numeric not null default 0 check (amount > 0), notes text,
  created_at timestamptz not null default now(), created_by uuid references auth.users
);
create index if not exists expense_payments_expense_idx on expense_payments (expense_id);
create index if not exists expense_payments_date_idx on expense_payments (payment_date desc);

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
  role       text not null default 'staff' check (role in ('super','staff','quotes','invoices')),
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

-- projects: every active user can select a project; super/staff manage them
drop policy if exists projects_read on projects;
drop policy if exists projects_write on projects;
create policy projects_read on projects for select to authenticated using (app_user_role() is not null);
create policy projects_write on projects for all to authenticated
  using (app_user_role() in ('super','staff')) with check (app_user_role() in ('super','staff'));

-- finance expenses may contain salary data and are restricted to super users
drop policy if exists expense_categories_access on expense_categories;
drop policy if exists expenses_access on expenses;
drop policy if exists expense_payments_access on expense_payments;
create policy expense_categories_access on expense_categories for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
create policy expenses_access on expenses for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
create policy expense_payments_access on expense_payments for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
