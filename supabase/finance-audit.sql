-- Finance migration pre-check (read-only).
-- Run before finance-operations.sql and review each result set.

-- 1. Receipts that were converted directly from an invoice (safe backfill candidates).
select r.id as receipt_id, r.number as receipt_number, r.status, r.doc_date,
       r.grand_total, i.id as invoice_id, i.number as invoice_number, i.grand_total as invoice_total
from documents r
join documents i on i.id = r.converted_from and i.type = 'invoice'
where r.type = 'receipt'
order by r.doc_date, r.number;

-- 2. Receipts created from another document type or without a source (manual review).
select r.id, r.number, r.status, r.doc_date, r.client_name, r.grand_total,
       source.type as source_type, source.number as source_number
from documents r
left join documents source on source.id = r.converted_from
where r.type = 'receipt' and (source.id is null or source.type <> 'invoice')
order by r.doc_date, r.number;

-- 3. Invoices marked paid without a receipt converted from that invoice.
select i.id, i.number, i.doc_date, i.client_name, i.grand_total
from documents i
where i.type = 'invoice' and i.status = 'paid'
  and not exists (
    select 1 from documents r
    where r.type = 'receipt' and r.converted_from = i.id and r.status = 'issued'
  )
order by i.doc_date, i.number;

-- 4. Invalid or suspicious receipt values.
select id, number, status, doc_date, client_name, grand_total, converted_from
from documents
where type = 'receipt' and coalesce(grand_total, 0) <= 0
order by doc_date, number;

-- 5. Free-text PO references that may identify projects and need manual assignment.
select id, number, po_date, supplier_name, reference, grand_total
from purchase_orders
where nullif(trim(reference), '') is not null
order by po_date, number;
