-- FlexCeiling Pro — Payment Receipt support
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- A receipt is a fifth document type: a payment acknowledgment (cash or cheque)
-- issued when a client pays.

-- 1 ── Allow the new document type ───────────────────────────────────────────
alter table documents drop constraint if exists documents_type_check;
alter table documents add constraint documents_type_check
  check (type in ('quote','invoice','proforma','receipt'));

-- 2 ── How the payment was received ───────────────────────────────────────────
alter table documents add column if not exists payment_method text;  -- 'cash' | 'cheque'

-- 3 ── Receipt numbering prefix ───────────────────────────────────────────────
alter table company_settings add column if not exists receipt_prefix text default 'RCPT-';

-- 4 ── RLS: the 'invoices' role manages receipts too (super/staff already can) ─
do $$
begin
  if exists (select 1 from pg_proc where proname = 'app_user_role') then
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
  end if;
end $$;
