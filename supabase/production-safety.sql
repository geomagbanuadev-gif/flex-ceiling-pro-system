-- FlexCeiling Pro — production accounting safety
-- Run once in Supabase SQL Editor before deploying the matching application code.
-- Idempotent and non-destructive: older duplicate links are archived; no document is deleted.

alter table documents add column if not exists advance_amount numeric default 0;
alter table documents add column if not exists payment_method text;
alter table documents add column if not exists supplier_snapshot jsonb;
alter table documents add column if not exists project_id uuid references projects on delete set null;
alter table documents add column if not exists due_date date;
alter table documents add column if not exists applies_to_invoice_id uuid references documents on delete set null;

-- Preserve old duplicate links before unlinking only the older draft copies. No
-- document is deleted, and the archived source relationship remains auditable.
create table if not exists generated_document_link_archive (
  document_id uuid primary key references documents on delete cascade,
  converted_from uuid not null,
  document_type text not null,
  archived_at timestamptz not null default now()
);
alter table generated_document_link_archive enable row level security;

with ranked as (
  select id, type, converted_from, status,
         row_number() over (
           partition by type, converted_from
           order by (status <> 'draft') desc, created_at desc, id desc
         ) as position
  from documents
  where converted_from is not null and type in ('invoice', 'proforma', 'receipt')
), archived as (
  insert into generated_document_link_archive (document_id, converted_from, document_type)
  select id, converted_from, type from ranked where position > 1 and status = 'draft'
  on conflict (document_id) do nothing
  returning document_id, converted_from
)
update documents as document
set converted_from = null, updated_at = now()
from archived
where document.id = archived.document_id and document.converted_from = archived.converted_from;

do $$
begin
  if not exists (
    select 1 from documents
    where converted_from is not null and type in ('invoice', 'proforma', 'receipt')
    group by type, converted_from having count(*) > 1
  ) then
    create unique index if not exists documents_generated_source_unique_idx
      on documents (type, converted_from)
      where converted_from is not null and type in ('invoice', 'proforma', 'receipt');
  else
    raise warning 'Finalized generated-document duplicates remain; review the audit result before enforcing the unique index';
  end if;
end $$;

create or replace function protect_finalized_documents() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is null
     or (new.type = 'quote' and new.status not in ('draft', 'sent', 'won', 'ongoing', 'lost'))
     or (new.type = 'invoice' and new.status not in ('draft', 'sent', 'paid', 'lost'))
     or (new.type = 'proforma' and new.status not in ('draft', 'sent', 'ongoing', 'paid', 'lost'))
     or (new.type = 'receipt' and new.status not in ('draft', 'issued', 'void')) then
    raise exception 'Invalid document status';
  end if;
  if tg_op = 'INSERT' then return new; end if;
  if old.type in ('invoice', 'proforma', 'receipt') and old.status <> 'draft' then
    if new.status = 'draft' then
      raise exception 'A finalized billing document cannot return to draft';
    end if;
    if (to_jsonb(new) - 'status' - 'share_token' - 'updated_at' - 'updated_by')
       is distinct from
       (to_jsonb(old) - 'status' - 'share_token' - 'updated_at' - 'updated_by') then
      raise exception 'A finalized billing document cannot be edited; duplicate it to create a revision';
    end if;
    if old.type = 'invoice' and old.status = 'paid' and new.status is distinct from old.status then
      raise exception 'A paid tax invoice is final';
    end if;
    if old.type = 'receipt' and ((old.status = 'issued' and new.status not in ('issued', 'void')) or (old.status = 'void' and new.status is distinct from old.status)) then
      raise exception 'An issued receipt can only be voided, and a void receipt is final';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists documents_protect_finalized on documents;
create trigger documents_protect_finalized
before insert or update on documents
for each row execute function protect_finalized_documents();

-- One atomic operation for generated document headers and line items. The advisory
-- lock makes retries/concurrent clicks converge on one child document.
create or replace function save_generated_document(p_document jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_source_id uuid := nullif(p_document->>'converted_from', '')::uuid;
  v_type text := p_document->>'type';
  v_status text;
  v_source_type text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if v_source_id is null or v_type not in ('invoice', 'proforma', 'receipt') then
    raise exception 'Invalid generated document request';
  end if;

  select type into v_source_type from documents where id = v_source_id;
  if not found then raise exception 'Source document not found'; end if;
  if (v_type = 'invoice' and v_source_type not in ('quote', 'proforma'))
     or (v_type = 'proforma' and v_source_type not in ('quote', 'invoice'))
     or (v_type = 'receipt' and v_source_type not in ('invoice', 'proforma')) then
    raise exception 'Invalid generated document relationship';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_type || ':' || v_source_id::text, 0));
  select id, status into v_id, v_status
    from documents
   where type = v_type and converted_from = v_source_id
   order by created_at desc, id desc
   limit 1
   for update;

  if found then
    if v_status <> 'draft' then
      raise exception 'Only a draft generated document can be regenerated';
    end if;
    update documents set
      doc_date = nullif(p_document->>'doc_date', '')::date,
      client_id = nullif(p_document->>'client_id', '')::uuid,
      client_name = p_document->>'client_name',
      client_trn = nullif(p_document->>'client_trn', ''),
      client_address = nullif(p_document->>'client_address', ''),
      client_email = nullif(p_document->>'client_email', ''),
      contact_person = nullif(p_document->>'contact_person', ''),
      contact_phone = nullif(p_document->>'contact_phone', ''),
      reference = nullif(p_document->>'reference', ''),
      payment_terms = nullif(p_document->>'payment_terms', ''),
      subtotal = coalesce((p_document->>'subtotal')::numeric, 0),
      discount = coalesce((p_document->>'discount')::numeric, 0),
      vat_rate = coalesce((p_document->>'vat_rate')::numeric, 0),
      vat_amount = coalesce((p_document->>'vat_amount')::numeric, 0),
      grand_total = coalesce((p_document->>'grand_total')::numeric, 0),
      advance_amount = coalesce((p_document->>'advance_amount')::numeric, 0),
      payment_method = nullif(p_document->>'payment_method', ''),
      amount_in_words = nullif(p_document->>'amount_in_words', ''),
      supplier_snapshot = p_document->'supplier_snapshot',
      notes = nullif(p_document->>'notes', ''),
      project_id = nullif(p_document->>'project_id', '')::uuid,
      applies_to_invoice_id = nullif(p_document->>'applies_to_invoice_id', '')::uuid,
      updated_by = auth.uid(),
      updated_at = now()
    where id = v_id;
  else
    insert into documents (
      type, number, doc_date, client_id, client_name, client_trn, client_address,
      client_email, contact_person, contact_phone, reference, status, payment_terms,
      subtotal, discount, vat_rate, vat_amount, grand_total, advance_amount,
      payment_method, amount_in_words, supplier_snapshot, notes, converted_from,
      project_id, applies_to_invoice_id, created_by, updated_by, updated_at
    ) values (
      v_type, p_document->>'number', nullif(p_document->>'doc_date', '')::date,
      nullif(p_document->>'client_id', '')::uuid, p_document->>'client_name',
      nullif(p_document->>'client_trn', ''), nullif(p_document->>'client_address', ''),
      nullif(p_document->>'client_email', ''), nullif(p_document->>'contact_person', ''),
      nullif(p_document->>'contact_phone', ''), nullif(p_document->>'reference', ''),
      'draft', nullif(p_document->>'payment_terms', ''),
      coalesce((p_document->>'subtotal')::numeric, 0), coalesce((p_document->>'discount')::numeric, 0),
      coalesce((p_document->>'vat_rate')::numeric, 0), coalesce((p_document->>'vat_amount')::numeric, 0),
      coalesce((p_document->>'grand_total')::numeric, 0), coalesce((p_document->>'advance_amount')::numeric, 0),
      nullif(p_document->>'payment_method', ''), nullif(p_document->>'amount_in_words', ''),
      p_document->'supplier_snapshot', nullif(p_document->>'notes', ''), v_source_id,
      nullif(p_document->>'project_id', '')::uuid, nullif(p_document->>'applies_to_invoice_id', '')::uuid,
      auth.uid(), auth.uid(), now()
    ) returning id into v_id;
  end if;

  delete from document_items where document_id = v_id;
  insert into document_items (document_id, sr_no, description, area, unit, rate, amount, sort_order)
  select v_id,
         nullif(item->>'sr_no', '')::int,
         item->>'description',
         nullif(item->>'area', '')::numeric,
         coalesce(nullif(item->>'unit', ''), 'Sqm'),
         nullif(item->>'rate', '')::numeric,
         nullif(item->>'amount', '')::numeric,
         coalesce(nullif(item->>'sort_order', '')::int, 0)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item;

  if v_type = 'invoice' and v_source_type = 'proforma' then
    update documents
       set applies_to_invoice_id = v_id, updated_by = auth.uid(), updated_at = now()
     where type = 'receipt' and status = 'draft'
       and converted_from = v_source_id and applies_to_invoice_id is null;
  end if;

  return v_id;
end $$;

revoke all on function save_generated_document(jsonb, jsonb) from public;
grant execute on function save_generated_document(jsonb, jsonb) to authenticated;

-- Link existing draft pro-forma receipts when their generated tax invoice already exists.
update documents as receipt
set applies_to_invoice_id = (
      select invoice.id from documents as invoice
       where invoice.type = 'invoice' and invoice.converted_from = receipt.converted_from
       order by invoice.created_at desc, invoice.id desc limit 1
    ),
    updated_at = now()
where receipt.type = 'receipt' and receipt.status = 'draft'
  and receipt.applies_to_invoice_id is null
  and exists (select 1 from documents as source where source.id = receipt.converted_from and source.type = 'proforma')
  and exists (select 1 from documents as invoice where invoice.type = 'invoice' and invoice.converted_from = receipt.converted_from);

-- Block new generated duplicates without modifying historical duplicates.
create or replace function prevent_generated_document_duplicates() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.converted_from is null or new.type not in ('invoice', 'proforma', 'receipt') then return new; end if;
  if tg_op = 'UPDATE' then
    if old.type = new.type and old.converted_from = new.converted_from then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.type || ':' || new.converted_from::text, 0));
  if exists (select 1 from documents where type = new.type and converted_from = new.converted_from and id <> new.id) then
    raise exception 'A generated % already exists for this source document', new.type;
  end if;
  return new;
end $$;

drop trigger if exists documents_prevent_generated_duplicates on documents;
create trigger documents_prevent_generated_duplicates
before insert or update of type, converted_from on documents
for each row execute function prevent_generated_document_duplicates();

-- Enforce expense payment state and balance at the database boundary.
create or replace function validate_expense_payment() returns trigger
language plpgsql set search_path = public as $$
declare v_status text;
declare v_total numeric;
declare v_paid numeric;
begin
  select status, grand_total into v_status, v_total from expenses where id = new.expense_id for update;
  if not found then raise exception 'Expense not found'; end if;
  if v_status <> 'posted' then raise exception 'Payments can only be recorded for posted expenses'; end if;
  if tg_op = 'UPDATE' then
    select coalesce(sum(amount), 0) into v_paid from expense_payments
     where expense_id = new.expense_id and id <> old.id;
  else
    select coalesce(sum(amount), 0) into v_paid from expense_payments
     where expense_id = new.expense_id;
  end if;
  if round(v_paid + new.amount, 2) > round(v_total, 2) then
    raise exception 'Payment exceeds the remaining expense balance';
  end if;
  return new;
end $$;

drop trigger if exists expense_payments_validate_balance on expense_payments;
create trigger expense_payments_validate_balance
before insert or update on expense_payments
for each row execute function validate_expense_payment();

create or replace function validate_expense_against_payments() returns trigger
language plpgsql set search_path = public as $$
declare v_paid numeric;
begin
  select coalesce(sum(amount), 0) into v_paid from expense_payments where expense_id = new.id;
  if v_paid > 0 and new.status <> 'posted' then
    raise exception 'An expense with payments must remain posted; remove the payments first';
  end if;
  if round(v_paid, 2) > round(new.grand_total, 2) then
    raise exception 'Expense total cannot be lower than payments already recorded';
  end if;
  return new;
end $$;

drop trigger if exists expenses_validate_recorded_payments on expenses;
create trigger expenses_validate_recorded_payments
before update of status, grand_total on expenses
for each row execute function validate_expense_against_payments();

-- Review-only result: any rows returned here are finalized duplicate groups that
-- were deliberately preserved for manual review.
select type, converted_from, count(*) as duplicate_count, array_agg(number order by created_at) as numbers
from documents
where converted_from is not null and type in ('invoice', 'proforma', 'receipt')
group by type, converted_from
having count(*) > 1
order by type, converted_from;
