-- FlexCeiling Pro — Suppliers & Purchase Orders (procurement)
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- These are the BUYING side: vendors you buy materials from, and the purchase
-- orders + payments raised against them. Separate from clients/quotes/invoices.

-- ── Suppliers (vendors) ──────────────────────────────────────────────────────
create table if not exists suppliers (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  trn                   text,
  address               text,
  email                 text,
  phone                 text,
  contact_person        text,
  contact_phone         text,
  default_payment_terms text,
  notes                 text,
  active                boolean not null default true,
  created_at            timestamptz default now(),
  created_by            uuid references auth.users
);
create index if not exists suppliers_name_idx on suppliers (lower(name));

-- ── Purchase orders ──────────────────────────────────────────────────────────
create table if not exists purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null,
  supplier_id     uuid references suppliers on delete set null,
  -- snapshot of supplier details as printed on the PO
  supplier_name   text,
  supplier_trn    text,
  supplier_address text,
  supplier_email  text,
  contact_person  text,
  contact_phone   text,
  po_date         date,
  expected_date   date,
  reference       text,                 -- project/job the materials are for
  status          text default 'draft', -- draft|ordered|partial|received|cancelled
  subtotal        numeric default 0,
  discount        numeric default 0,
  vat_rate        numeric default 5,
  vat_amount      numeric default 0,
  grand_total     numeric default 0,
  amount_in_words text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      uuid references auth.users,
  updated_by      uuid references auth.users
);
create index if not exists po_number_idx   on purchase_orders (number);
create index if not exists po_supplier_idx on purchase_orders (supplier_id);
create index if not exists po_date_idx      on purchase_orders (po_date desc);

-- ── Purchase order line items (materials) ────────────────────────────────────
create table if not exists purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders on delete cascade,
  sr_no             int,
  description       text,
  quantity          numeric,
  unit              text default 'pcs',
  unit_price        numeric,
  amount            numeric,
  sort_order        int default 0
);
create index if not exists poi_po_idx on purchase_order_items (purchase_order_id);

-- ── Payments to the supplier (expenses) against a PO ─────────────────────────
create table if not exists purchase_payments (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders on delete cascade,
  payment_date      date,
  method            text,               -- cash | cheque | bank
  reference         text,
  amount            numeric default 0,
  notes             text,
  created_at        timestamptz default now(),
  created_by        uuid references auth.users
);
create index if not exists pp_po_idx on purchase_payments (purchase_order_id);

-- ── Numbering prefix ─────────────────────────────────────────────────────────
alter table company_settings add column if not exists po_prefix text default 'PO-';

-- ── Row Level Security — procurement is super/staff only ─────────────────────
alter table suppliers            enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_items enable row level security;
alter table purchase_payments    enable row level security;

do $$
declare t text;
declare has_rbac boolean := exists (select 1 from pg_proc where proname = 'app_user_role');
begin
  foreach t in array array['suppliers','purchase_orders','purchase_order_items','purchase_payments']
  loop
    execute format('drop policy if exists proc_access on %I', t);
    if has_rbac then
      execute format($f$create policy proc_access on %I for all to authenticated
        using (app_user_role() in ('super','staff'))
        with check (app_user_role() in ('super','staff'))$f$, t);
    else
      execute format('create policy proc_access on %I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;
