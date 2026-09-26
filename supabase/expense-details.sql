-- Optional supplier invoice details for expenses.
-- Run once in Supabase SQL Editor before deploying the matching application code.
-- Idempotent and non-destructive: existing expenses remain valid, simple expenses need no items.

alter table expenses add column if not exists purchase_order_id uuid references purchase_orders on delete set null;
alter table expenses add column if not exists supplier_invoice_number text;
alter table expenses add column if not exists attachment_path text;
alter table expenses add column if not exists attachment_name text;
alter table expenses add column if not exists attachment_type text;
alter table expenses add column if not exists attachment_size bigint check (attachment_size is null or attachment_size >= 0);
comment on column expenses.purchase_order_id is 'Reference-only link; finance cost, payment and payable tracking remain on the purchase order.';
create index if not exists expenses_purchase_order_idx on expenses (purchase_order_id);
create index if not exists expenses_supplier_invoice_idx on expenses (supplier_invoice_number) where supplier_invoice_number is not null;

create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses on delete cascade,
  sort_order int not null default 0,
  product_code text,
  description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  unit_price numeric not null default 0 check (unit_price >= 0),
  discount numeric not null default 0 check (discount >= 0),
  vat_rate numeric not null default 0 check (vat_rate >= 0),
  net_amount numeric not null default 0 check (net_amount >= 0),
  vat_amount numeric not null default 0 check (vat_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  serial_number text
);
create index if not exists expense_items_expense_idx on expense_items (expense_id, sort_order);
alter table expense_items enable row level security;
drop policy if exists expense_items_access on expense_items;
create policy expense_items_access on expense_items for all to authenticated
  using (app_user_role() in ('super','finance')) with check (app_user_role() in ('super','finance'));

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
    insert into expenses (
      expense_date, due_date, category_id, description, payee_name, supplier_id, client_id, project_id,
      purchase_order_id, supplier_invoice_number, status, subtotal, vat_amount, vat_recoverable,
      grand_total, reference, notes, created_by, updated_by
    ) values (
      (p_fields->>'expense_date')::date, nullif(p_fields->>'due_date', '')::date,
      (p_fields->>'category_id')::uuid, p_fields->>'description', nullif(p_fields->>'payee_name', ''),
      v_supplier_id, nullif(p_fields->>'client_id', '')::uuid, v_project_id,
      v_purchase_order_id, nullif(p_fields->>'supplier_invoice_number', ''), p_fields->>'status',
      coalesce((p_fields->>'subtotal')::numeric, 0), coalesce((p_fields->>'vat_amount')::numeric, 0),
      coalesce((p_fields->>'vat_recoverable')::boolean, false), coalesce((p_fields->>'grand_total')::numeric, 0),
      nullif(p_fields->>'reference', ''), nullif(p_fields->>'notes', ''), auth.uid(), auth.uid()
    ) returning id into v_id;
  else
    update expenses set
      expense_date = (p_fields->>'expense_date')::date,
      due_date = nullif(p_fields->>'due_date', '')::date,
      category_id = (p_fields->>'category_id')::uuid,
      description = p_fields->>'description',
      payee_name = nullif(p_fields->>'payee_name', ''),
      supplier_id = v_supplier_id,
      client_id = nullif(p_fields->>'client_id', '')::uuid,
      project_id = v_project_id,
      purchase_order_id = v_purchase_order_id,
      supplier_invoice_number = nullif(p_fields->>'supplier_invoice_number', ''),
      status = p_fields->>'status',
      subtotal = coalesce((p_fields->>'subtotal')::numeric, 0),
      vat_amount = coalesce((p_fields->>'vat_amount')::numeric, 0),
      vat_recoverable = coalesce((p_fields->>'vat_recoverable')::boolean, false),
      grand_total = coalesce((p_fields->>'grand_total')::numeric, 0),
      reference = nullif(p_fields->>'reference', ''),
      notes = nullif(p_fields->>'notes', ''),
      updated_at = now(), updated_by = auth.uid()
    where id = p_expense_id returning id into v_id;
    if v_id is null then raise exception 'Expense not found'; end if;
  end if;

  delete from expense_items where expense_id = v_id;
  with parsed as (
    select
      coalesce((entry->>'sort_order')::int, ordinality::int - 1) as sort_order,
      nullif(entry->>'product_code', '') as product_code,
      btrim(entry->>'description') as description,
      coalesce((entry->>'quantity')::numeric, 1) as quantity,
      coalesce(nullif(entry->>'unit', ''), 'pcs') as unit,
      coalesce((entry->>'unit_price')::numeric, 0) as unit_price,
      coalesce((entry->>'discount')::numeric, 0) as discount,
      coalesce((entry->>'vat_rate')::numeric, 0) as vat_rate,
      nullif(entry->>'serial_number', '') as serial_number
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as source(entry, ordinality)
  ), calculated as (
    select *, round(quantity * unit_price - discount, 2) as net_amount from parsed
  )
  insert into expense_items (expense_id, sort_order, product_code, description, quantity, unit, unit_price, discount, vat_rate, net_amount, vat_amount, total_amount, serial_number)
  select v_id, sort_order, product_code, description, quantity, unit, unit_price, discount, vat_rate,
    net_amount, round(net_amount * vat_rate / 100, 2), round(net_amount + round(net_amount * vat_rate / 100, 2), 2), serial_number
  from calculated;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 0 then
    update expenses set
      subtotal = totals.subtotal,
      vat_amount = totals.vat_amount,
      grand_total = round(totals.subtotal + totals.vat_amount, 2)
    from (
      select round(coalesce(sum(net_amount), 0), 2) as subtotal, round(coalesce(sum(vat_amount), 0), 2) as vat_amount
      from expense_items where expense_id = v_id
    ) totals
    where expenses.id = v_id;
  end if;
  return v_id;
end $$;
grant execute on function save_expense_with_items(uuid, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expense-attachments', 'expense-attachments', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists expense_attachments_access on storage.objects;
create policy expense_attachments_access on storage.objects for all to authenticated
  using (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'))
  with check (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'));
