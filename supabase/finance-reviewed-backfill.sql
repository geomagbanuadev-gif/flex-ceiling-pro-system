-- Run only after reviewing finance-audit.sql result set 1.
-- It links issued/draft receipts directly converted from invoices; it does not invent links.
update documents as receipt
set applies_to_invoice_id = invoice.id,
    project_id = coalesce(receipt.project_id, invoice.project_id)
from documents as invoice
where receipt.type = 'receipt'
  and invoice.id = receipt.converted_from
  and invoice.type = 'invoice'
  and receipt.applies_to_invoice_id is null
  and receipt.client_id is not distinct from invoice.client_id;
