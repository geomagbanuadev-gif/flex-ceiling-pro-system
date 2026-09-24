-- Finance operations foundation: projects, receipt allocation, expenses, and due dates.
-- Run finance-audit.sql first. This migration is idempotent and does not alter legacy values.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete restrict,
  code text,
  name text not null,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
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
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists expense_categories_name_unique_idx on expense_categories (lower(name));

insert into expense_categories (name, sort_order) values
  ('Salary', 10), ('Petrol / fuel', 20), ('Transport', 30), ('Rent', 40),
  ('Utilities', 50), ('Tools and equipment', 60), ('Materials without PO', 70),
  ('Subcontractor', 80), ('Client-related expense', 90), ('Other', 100)
on conflict (lower(name)) do nothing;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  due_date date,
  category_id uuid not null references expense_categories on delete restrict,
  description text not null,
  payee_name text,
  supplier_id uuid references suppliers on delete set null,
  client_id uuid references clients on delete set null,
  project_id uuid references projects on delete set null,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  subtotal numeric not null default 0 check (subtotal >= 0),
  vat_amount numeric not null default 0 check (vat_amount >= 0),
  vat_recoverable boolean not null default false,
  grand_total numeric not null default 0 check (grand_total >= 0),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users,
  updated_by uuid references auth.users
);
create index if not exists expenses_date_idx on expenses (expense_date desc);
create index if not exists expenses_category_idx on expenses (category_id);
create index if not exists expenses_client_idx on expenses (client_id);
create index if not exists expenses_project_idx on expenses (project_id);
create index if not exists expenses_status_idx on expenses (status);

create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses on delete cascade,
  payment_date date not null,
  method text,
  reference text,
  amount numeric not null default 0 check (amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users
);
create index if not exists expense_payments_expense_idx on expense_payments (expense_id);
create index if not exists expense_payments_date_idx on expense_payments (payment_date desc);

-- Enforce cross-row ownership and receipt allocation rules in the database.
create or replace function validate_finance_links() returns trigger
language plpgsql set search_path = public as $$
declare project_client uuid;
declare target_client uuid;
begin
  if tg_table_name = 'documents' then
    if new.applies_to_invoice_id is not null then
      if new.type <> 'receipt' then
        raise exception 'Only receipts can be allocated to an invoice';
      end if;
      select client_id into target_client from documents
       where id = new.applies_to_invoice_id and type = 'invoice';
      if not found then raise exception 'Receipt allocation target must be an invoice'; end if;
      if new.client_id is distinct from target_client then
        raise exception 'Receipt and invoice clients must match';
      end if;
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
create trigger documents_validate_finance_links before insert or update on documents
  for each row execute function validate_finance_links();
drop trigger if exists purchase_orders_validate_finance_links on purchase_orders;
create trigger purchase_orders_validate_finance_links before insert or update on purchase_orders
  for each row execute function validate_finance_links();
drop trigger if exists expenses_validate_finance_links on expenses;
create trigger expenses_validate_finance_links before insert or update on expenses
  for each row execute function validate_finance_links();

alter table projects enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table expense_payments enable row level security;

drop policy if exists projects_read on projects;
drop policy if exists projects_write on projects;
create policy projects_read on projects for select to authenticated
  using (app_user_role() is not null);
create policy projects_write on projects for all to authenticated
  using (app_user_role() in ('super','staff'))
  with check (app_user_role() in ('super','staff'));

drop policy if exists expense_categories_access on expense_categories;
drop policy if exists expenses_access on expenses;
drop policy if exists expense_payments_access on expense_payments;
create policy expense_categories_access on expense_categories for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
create policy expenses_access on expenses for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
create policy expense_payments_access on expense_payments for all to authenticated
  using (app_user_role() = 'super') with check (app_user_role() = 'super');
