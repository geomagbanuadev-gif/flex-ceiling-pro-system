# FlexCeiling Pro — Quote & Invoice System
### User Guide

Welcome! This guide explains how to use the FlexCeiling Pro Quote & Invoice system —
from logging in, to creating quotations, pro forma invoices and tax invoices, sending
them to clients, and tracking everything in one place.

No technical knowledge is needed. Just follow the steps.

---

## Contents

1. [What this system does](#1-what-this-system-does)
2. [Logging in](#2-logging-in)
3. [Finding your way around](#3-finding-your-way-around)
4. [The Dashboard](#4-the-dashboard)
5. [Creating a Quotation](#5-creating-a-quotation)
6. [The document page & statuses](#6-the-document-page--statuses)
7. [Pro Forma invoices (advance payments)](#7-pro-forma-invoices-advance-payments)
8. [Tax Invoices](#8-tax-invoices)
9. [Opening, printing & saving the PDF](#9-opening-printing--saving-the-pdf)
10. [Sharing a document with a client](#10-sharing-a-document-with-a-client)
11. [Editing, duplicating & deleting](#11-editing-duplicating--deleting)
12. [Finding documents: search, filters & export](#12-finding-documents-search-filters--export)
13. [Clients](#13-clients)
14. [Company settings](#14-company-settings)
15. [Users & access levels](#15-users--access-levels)
16. [Changing your password](#16-changing-your-password)
17. [Tips & best practices](#17-tips--best-practices)
18. [Frequently asked questions](#18-frequently-asked-questions)
19. [Glossary](#19-glossary)

---

## 1. What this system does

The system replaces the old "type it in Excel, export a PDF" workflow. With it you can:

- **Create quotations** for clients with automatic calculations (area × rate, VAT, totals).
- **Generate pro forma invoices** that request a partial/advance payment.
- **Generate tax invoices** from an approved quote in one click.
- **Produce a clean, branded PDF** for every document — ready to print or send.
- **Share documents securely** with clients through a private link.
- **Keep all clients, quotes and invoices organised**, searchable and reportable.

Every quote, pro forma and invoice is saved automatically, so nothing is ever lost.

---

## 2. Logging in

1. Open your web browser and go to your system's web address.
2. Enter your **email** and **password**.
3. Click **Sign in**.

> **Note:** Only people who have been given an account can log in. There is no public
> sign-up — a super user creates accounts (see [Users & access levels](#15-users--access-levels)).

If you forget your password, ask a super user to reset it for you.

---

## 3. Finding your way around

After logging in you'll see the **sidebar** on the left (on a phone, tap the **☰ menu**
icon at the top to open it). It contains:

| Menu item | What it's for |
|---|---|
| **Dashboard** | A summary of your business at a glance |
| **Quotes** | All quotations |
| **Pro Forma** | All pro forma invoices |
| **Invoices** | All tax invoices |
| **Clients** | Your customer list |
| **Settings** | Your company details (super users only) |
| **Users** | Manage who can log in (super users only) |

Your name and role appear at the bottom of the sidebar, with a **Sign out** button.

> The system works on a computer, tablet or phone. On a phone, tables can be swiped
> left/right to see all columns.

---

## 4. The Dashboard

The Dashboard gives you an instant overview:

- **Outstanding** — total of unpaid tax invoices.
- **Invoiced (all time)** — total value you've invoiced.
- **Invoiced this month** — current month's invoiced value.
- **Quote conversion** — what percentage of quotes were won.
- **Invoiced — last 6 months** — a bar chart of monthly invoicing.
- **Quote pipeline** — how your quotes are split by status (won, sent, etc.).
- **Top clients by value** — your biggest customers.
- **Recent documents** — your latest quotes, pro formas and invoices. Click any row to open it.

Use the **+ New Quotation** button (top right) to start a new quote from anywhere.

---

## 5. Creating a Quotation

1. Click **Quotes** in the sidebar, then **+ New Quotation** (top right).
2. **Client:**
   - Choose an existing client from the **Select existing client** dropdown, **or**
   - Type a new client's details in the fields below (name, TRN, email, contact, address).
     New clients are saved automatically.
3. **Quotation details:**
   - **Quote No.** is filled in automatically (you can change it).
   - Set the **Date**.
   - Add a **Reference / scope** (e.g. *"Supply and installation of stretch ceiling"*).
4. **Line items** — for each task:
   - Type a **Description**.
   - Enter **Area** (or quantity), **Unit**, and **Rate**.
   - The **Amount** calculates automatically (Area × Rate). You can also type it manually.
   - Click **+ Add row** for more items, or **Remove** to delete a row.
   - 💡 *Tip:* start a description line with an asterisk `*` to print **that line in red** on the PDF (useful for important notes inside the table).
5. **Discount / VAT** (in the totals box):
   - Enter a **Discount** amount if any.
   - The **VAT %** defaults to 5% — change it if needed.
   - **Sub Total**, **VAT** and **Grand Total** update live as you type.
6. **Terms & notes:**
   - **Payment terms** (e.g. 50% advance / 40% on delivery / 10% on installation).
   - **Quote validity (days)** — how long the quote stays valid.
   - **Note** — anything typed here prints **in red** at the bottom of the document.
7. As you work, a **bar at the bottom** always shows the live **total** and a **Save** button.
8. Click **Save quotation**. You'll be taken to the document's page.

---

## 6. The document page & statuses

Every quote, pro forma or invoice has its own page showing the client, the line items,
the totals, and a live **PDF preview** on the right.

**Status** — set where the document stands using the status dropdown at the top:

| Document | Available statuses |
|---|---|
| Quotation | Draft · Sent · **Won** · Lost |
| Pro Forma | Draft · Sent · **Paid** · Lost |
| Tax Invoice | Draft · Sent · **Paid** · Lost |

A quotation also shows a **validity badge** (valid until / expired) based on its date and
validity days.

**Action buttons** at the top let you:

- **← Back** to the list
- **Edit** the document
- **Open / Print PDF**
- **Share** with the client (see section 10)
- **Generate Pro Forma** / **Generate Tax Invoice** (on quotes)
- **Duplicate** (make a copy)
- **Delete**

---

## 7. Pro Forma invoices (advance payments)

A **pro forma invoice** looks like a tax invoice but is used to **request a partial
(advance) payment** before the work — for example, a 50% advance. It shows the full
project total plus the **Advance Payment** and the remaining **Balance Due**.

**Two ways to create one:**

**A. From an existing quotation (recommended)**
1. Open the quotation.
2. Click **Generate Pro Forma**.
3. The system copies the client and all line items, and pre-fills a **50% advance**.

**B. From scratch**
1. Go to **Pro Forma** in the sidebar → click **+ Pro Forma**.
2. Fill in the client and line items as you would for a quote.

**Setting the advance:** in the totals box, type the **Advance Payment** amount, or use the
quick buttons **50% / 40% / 10% / 100%** to fill it automatically. The system shows the
percentage and the **Balance Due** (Grand Total − Advance) updates live.

On the PDF, the **Advance Payment** and the **Balance Due** (in red) appear under the
Grand Total.

---

## 8. Tax Invoices

A **tax invoice** is the official VAT invoice. The easiest way to create one is from an
approved quote:

1. Open the **quotation** the client approved.
2. Click **Generate Tax Invoice**.
3. The system copies the client and line items, gives it a new invoice number, adds the
   **amount in words**, and marks the original quote as **Won**.

You can also create a blank invoice: **Invoices → + Tax Invoice**.

> You can also generate a tax invoice from a pro forma the same way.

The tax invoice PDF includes your company's and the client's **TRN**, the line items, the
totals, the **amount in words**, your **bank details**, and the company **stamp**.

---

## 9. Opening, printing & saving the PDF

On any document page, click **Open / Print PDF**. The branded PDF opens in a new tab.

- **To print:** use your browser's print option (Ctrl+P / Cmd+P).
- **To save a copy:** in the print dialog choose **Save as PDF**, or use the download icon
  in the PDF viewer.

The PDF is always generated fresh from the latest saved data, so it's never out of date.
Documents are not stored as files — they're produced on demand each time.

---

## 10. Sharing a document with a client

You can send a client a **private link** that shows **only that one document's PDF** —
they don't need an account, and they can't see anything else in your system.

1. Open the document and click **Share**.
2. The system creates a secure link. From the share window you can:
   - **Copy** the link,
   - send it by **WhatsApp**, or
   - send it by **Email**.
3. To turn the link off later, open **Share** again and click **Stop sharing**. The link
   will stop working immediately.

> The link is long and unguessable, and it only ever shows that single document. It's safe
> to send to clients.

---

## 11. Editing, duplicating & deleting

- **Edit** — open a document and click **Edit**, make changes, then **Save changes**.
- **Duplicate** — click **Duplicate** to create a new draft copy (with a fresh number),
  ready to edit. Great for similar repeat jobs.
- **Delete** — click **Delete** and confirm in the pop-up. *Deleting is permanent.*

After deleting, you're returned to the correct list (e.g. delete a quote → back to Quotes).

---

## 12. Finding documents: search, filters & export

On the **Quotes**, **Pro Forma** and **Invoices** pages:

- **Search box** — type a client name or document number; results filter as you type.
- **Filters** — click **Filters** to narrow by status, client, date range, or amount, and
  to change the sort order.
- **Rows per page** — choose how many rows to show; use the page arrows to move through.
- **Export** — click **Export** to download the current list as a **CSV** file (opens in
  Excel) — handy for your accountant.

Each tab (Quotes / Pro Forma / Invoices) only ever shows that one type of document.

---

## 13. Clients

Click **Clients** in the sidebar to see your customer list.

- **+ New Client** — add a client (name, TRN, email, contact, address).
- Click a client to open their page, **edit** their details, and see **all their documents**.
- Clients are also created automatically when you type a new name while making a quote.

---

## 14. Company settings

*(Super users only.)* Click **Settings** to manage the details that appear on your PDFs:

- Company legal name, address, email, phone, **TRN**.
- **Bank details** (account name, number, IBAN, currency, bank).
- Default **payment terms** and **quote validity**.
- Document number **prefixes** and the default **VAT rate**.

Changes here apply to **new** documents going forward.

---

## 15. Users & access levels

*(Super users only.)* Click **Users** to control who can log in.

**Add a user:**
1. Click to add a user, enter their **email**, choose an **access level**, and generate a
   **temporary password** to give them.
2. They log in and should **change their password** (see next section).

**Access levels:**

| Level | Can see / do |
|---|---|
| **Super** | Everything, plus manage users and company settings |
| **Staff** | All documents (quotes, pro formas, invoices) and clients |
| **Quotes** | Quotations only |
| **Invoices** | Tax invoices and pro formas only |

**Activate / revoke:** you can switch a user's access on or off at any time. A new user has
**no access** until you enable them. *A super user cannot be revoked or demoted* (this
prevents anyone from being locked out).

---

## 16. Changing your password

1. Click your **name/role at the bottom of the sidebar** (this opens your Account page).
2. Enter and confirm a new password, then save.

We recommend everyone changes the temporary password they were given on first login.

---

## 17. Tips & best practices

- **Let the system do the maths** — enter area and rate, and the amount, VAT and totals
  calculate themselves.
- **Re-use quotes** — use **Duplicate** for similar jobs instead of starting over.
- **Quote → Pro Forma → Tax Invoice** — the natural flow: quote the client, request the
  advance with a pro forma, then issue the tax invoice when approved (one click each).
- **Use the red note line** — type important conditions in the **Note** field, or start a
  table line with `*`, so they stand out in red on the PDF.
- **Keep statuses up to date** — mark quotes **Won/Lost** and invoices **Paid** so your
  Dashboard figures stay accurate.
- **Export for the accountant** — the **Export** (CSV) button gives a clean spreadsheet.

---

## 18. Frequently asked questions

**Do I need to save PDFs anywhere?**
No. The PDF is generated fresh from the latest data every time you open it.

**Can a client see my other documents through a share link?**
No. A share link only ever shows that one document and nothing else.

**What's the difference between a pro forma and a tax invoice?**
A **pro forma** requests an advance/partial payment before the work and shows the balance
remaining. A **tax invoice** is the official VAT invoice for the (full) amount.

**The amount didn't calculate — why?**
Make sure both **Area** and **Rate** are filled in; the amount is Area × Rate. You can also
type the amount in directly.

**I changed company/bank details — why doesn't an old invoice update?**
Settings apply to **new** documents. Existing documents keep the details they were issued
with.

**A page looks stuck or out of date.**
Refresh the page in your browser. If it persists, contact your system administrator.

---

## 19. Glossary

- **Quotation (Quote):** a price offer to a client.
- **Pro Forma Invoice:** a request for an advance/partial payment, showing the balance due.
- **Tax Invoice:** the official VAT invoice.
- **TRN:** Tax Registration Number.
- **VAT:** Value Added Tax (5% in the UAE).
- **Advance Payment:** the partial amount requested up front on a pro forma.
- **Balance Due:** the remaining amount after the advance (Grand Total − Advance).
- **Status:** where a document stands (Draft, Sent, Won, Lost, Paid).
- **Super user:** an administrator who can manage users and company settings.

---

*FlexCeiling Pro — Quote & Invoice System. For help, contact your system administrator.*
