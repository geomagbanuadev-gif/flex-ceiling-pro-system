-- Least-privilege Finance role.
-- Safe for production: updates access rules and functions only; no business records are changed.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super','staff','finance','quotes','invoices'));

drop policy if exists finance_documents_read on documents;
create policy finance_documents_read on documents for select to authenticated
  using (app_user_role() = 'finance' and type in ('invoice','receipt'));

drop policy if exists finance_document_items_read on document_items;
create policy finance_document_items_read on document_items for select to authenticated
  using (app_user_role() = 'finance' and exists (
    select 1 from documents d where d.id = document_id and d.type in ('invoice','receipt')));

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

drop policy if exists expense_attachments_access on storage.objects;
create policy expense_attachments_access on storage.objects for all to authenticated
  using (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'))
  with check (bucket_id = 'expense-attachments' and public.app_user_role() in ('super','finance'));

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
      description = p_fields->>'description', payee_name = nullif(p_fields->>'payee_name', ''),
      supplier_id = v_supplier_id, client_id = nullif(p_fields->>'client_id', '')::uuid,
      project_id = v_project_id, purchase_order_id = v_purchase_order_id,
      supplier_invoice_number = nullif(p_fields->>'supplier_invoice_number', ''), status = p_fields->>'status',
      subtotal = coalesce((p_fields->>'subtotal')::numeric, 0), vat_amount = coalesce((p_fields->>'vat_amount')::numeric, 0),
      vat_recoverable = coalesce((p_fields->>'vat_recoverable')::boolean, false),
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
    update expenses set subtotal = totals.subtotal, vat_amount = totals.vat_amount,
      grand_total = round(totals.subtotal + totals.vat_amount, 2)
    from (select round(coalesce(sum(net_amount), 0), 2) as subtotal,
      round(coalesce(sum(vat_amount), 0), 2) as vat_amount from expense_items where expense_id = v_id) totals
    where expenses.id = v_id;
  end if;
  return v_id;
end $$;

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

grant execute on function save_expense_with_items(uuid, jsonb, jsonb) to authenticated;
grant execute on function finance_period_summary(date, date) to authenticated;
