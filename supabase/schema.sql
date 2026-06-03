-- FlexCeiling Pro — Quote & Invoice system schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

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
  type           text not null check (type in ('quote','invoice')),
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
  amount_in_words text,
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

-- ── Row Level Security ───────────────────────────────────────────────────────
-- No roles yet: any signed-in (authenticated) user has full access.
-- Audit trail is kept via created_by / updated_by columns.
alter table company_settings enable row level security;
alter table clients          enable row level security;
alter table catalog_items    enable row level security;
alter table documents        enable row level security;
alter table document_items   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['company_settings','clients','catalog_items','documents','document_items']
  loop
    execute format('drop policy if exists auth_all on %I', t);
    execute format(
      'create policy auth_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
