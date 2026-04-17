# QA2-R03 — PIP Rebuild v2 Gap Analysis
**Date:** 2026-04-16
**Base:** n8n-nodes-weclapp v0.2.0-pre (main @ 6d4ee87)
**Source workflow:** CRON-Purchase-Invoice-Processor (uBPycrktxyzQywPL, v3.2)
**Rebuilt workflow:** QA2-R03-CRON Purchase Invoice Processor (n8n ID: bUELgc0Z1bgTqi3X)
**Deployed:** localhost:5678, inactive (dry-run, testhandel cred jebRfSixFZZxu8qH)

---

## Conversion Rate

| Metric | v1 (R03) | v2 (QA2-R03) | Delta |
|--------|----------|--------------|-------|
| weclapp nodes | 5 | 6 | +1 |
| weclapp-API httpRequest | 8 | 8 | 0 |
| Anthropic httpRequest | 1 | 1 | 0 |
| **Conversion %** | **38.5%** | **42.9%** | **+4.4pp** |

Denominator: weclapp nodes + weclapp-API httpRequest (excludes Anthropic/external HTTP).

---

## What Changed vs v1

### New: PUT: Assign Supplier (Early) — purchaseInvoice.update

The v1 rebuilt `Code: Find & Assign Supplier` found the supplier and set `supplierId` on the JSON
in-memory but had no separate PUT node (the original PIP Code node used the
`httpRequestWithAuthentication` anti-pattern for the PUT).

v2 adds a proper external PUT as a weclapp `purchaseInvoice.update` node, gated by an
`IF: Supplier Found (Early)` check (`supplierAction === 'assigned'`). The update sends only
`supplierId`, which is exposed in the weclapp node's update body fields.

New nodes added:
- `IF: Supplier Found (Early)` — gate to skip PUT when no match was found
- `PUT: Assign Supplier (Early)` — purchaseInvoice.update, supplierId field
- `Code: Restore After Early Assign` — restores tracked JSON after weclapp node response

Connection change:
```
v1: Code: Find & Assign Supplier -> IF: Supplier Not Found
v2: Code: Find & Assign Supplier -> IF: Supplier Found (Early)
    TRUE  -> PUT: Assign Supplier (Early) -> Code: Restore After Early Assign -> IF: Supplier Not Found
    FALSE -> IF: Supplier Not Found
```

Covered by PR #42 (F8 fixes): weclapp node purchaseInvoice.update exposes supplierId,
invoiceDate, invoiceNumber, dueDate, bookingDate, purchaseInvoiceType, recordCurrencyId.

---

## Converted Nodes (6 of 14)

| Node | Operation | GAPs |
|------|-----------|------|
| GET: Unbooked Invoices | purchaseInvoice.list | sort=-createdDate not available; customAttribute966667-ne=true filter not supported |
| GET: Invoice PDF | purchaseInvoice.downloadLatestPurchaseInvoiceDocument | None |
| GET: Search Party by PDF Name | party.list | None |
| POST: Reset Taxes | purchaseInvoice.resetTaxes | None |
| GET: Refreshed Invoice | purchaseInvoice.get | None |
| PUT: Assign Supplier (Early) | purchaseInvoice.update | responsibleUserId not exposed in update body |

---

## Still-Open Gap: purchaseInvoice.update missing fields

8 weclapp API calls remain as httpRequest (cred jebRfSixFZZxu8qH):

| Node | Missing Field |
|------|--------------|
| PUT: Book to OP | status: ENTRY_COMPLETED |
| PUT: Status Checked | status: INVOICE_CHECKED |
| PUT: Status OP Created | status: OPEN_ITEM_CREATED |
| PUT: E-Invoice Book | status: ENTRY_COMPLETED |
| PUT: E-Invoice Checked | status: INVOICE_CHECKED |
| PUT: E-Invoice OP | status: OPEN_ITEM_CREATED |
| PUT: Correct Items | purchaseInvoiceItems (array) |
| PUT: Set Review Flag | customAttributes (array) |

Root cause: PurchaseInvoiceDescription.ts update body exposes only: invoiceDate, invoiceNumber,
supplierId, bookingDate, dueDate, internalInvoiceNumber, purchaseInvoiceType, recordCurrencyId.

Missing: status (6 nodes), purchaseInvoiceItems (1 node), customAttributes (1 node),
responsibleUserId (partial gap on PUT: Assign Supplier).

Conversion ceiling if resolved:
- +status field: 12/14 = 85.7%
- +purchaseInvoiceItems: 13/14 = 92.9%
- +customAttributes: 14/14 = 100%

---

## Residual Issues

1. Code: Find & Assign Supplier inner GET — still uses httpRequestWithAuthentication internally
   for the party search (VAT fallback). Low risk in dry-run. Proper fix: split into party.list
   weclapp node + Code decision logic.

2. GET: Unbooked Invoices — pagination gap: weclapp node list lacks multi-page cursor pagination.
   For production, use httpRequest with completeExpression pagination pattern.

3. GET: Unbooked Invoices — filter gap: customAttribute966667-ne=true dropped (not expressible
   in filtersCollection). Would re-process already-reviewed invoices in production.

4. E-Invoice path not exercised in dry-run (no ZugFerd PDF on testhandel).

---

## Deployment Status

- n8n ID: bUELgc0Z1bgTqi3X
- Instance: localhost:5678
- Status: Inactive (dry-run, not booking on testhandel)
- Credential: jebRfSixFZZxu8qH (testhandel) for all weclapp nodes
- Validation: 39 nodes, 37 connections, all targets valid, all credentials set
- Webhook path: qa/r03

---

## Summary

v2 improves conversion from 38.5% to 42.9% (+4.4pp) by migrating PUT: Assign Supplier from
an in-Code anti-pattern to a proper weclapp purchaseInvoice.update node.

Primary blocker: purchaseInvoice.update missing status, purchaseInvoiceItems, customAttributes.
Adding all three would push ceiling to 100% (14/14). These are the target fields for the next
PR after #42.
