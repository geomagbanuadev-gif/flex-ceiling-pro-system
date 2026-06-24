-- FlexCeiling Pro — Quote & Invoice system schema (single source of truth)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
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
alter table profiles         enable row level security;

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
