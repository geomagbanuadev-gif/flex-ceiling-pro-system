-- Read-model performance: database-calculated dashboard and finance summaries.
-- Run after finance-operations.sql and expense-details.sql.
-- Read-only and non-destructive; no production records are changed.

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
    'acceptedCount', quote_totals.accepted_count, 'proformaCount', proforma_totals.proforma_count, 'outstanding', receivables.outstanding,
    'outstandingCount', receivables.outstanding_count
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
