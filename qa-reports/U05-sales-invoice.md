# Smoke Test Report — U05 SalesInvoice

Date: 2026-04-17
Tester: coordinator agent
n8n: localhost:5678  |  weclapp tenant: testhandel

## Operations tested

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | 10 items returned (limit=10); first invoice id=4073 (RE1000, OPEN_ITEM_CREATED). Exec 192. |
| list with filter (status=OPEN — wrong enum) | FAIL | API returns 400 `unknown enum value: OPEN`. The status dropdown in SalesInvoiceDescription.ts offers OPEN, PAID, DUNNING, DISPUTE, DEBIT_ADVICE, CANCELLED — none of which are valid for salesInvoice. Exec 195. |
| list with filter (status-eq=OPEN_ITEM_CREATED via advanced filters) | PASS | Advanced filters collection correctly passes `status-eq=OPEN_ITEM_CREATED`; 5 items returned, all OPEN_ITEM_CREATED. Exec 199. |
| get | PASS | id=4073 returned; invoiceNumber=RE1000, status=OPEN_ITEM_CREATED, customerId=3961. Exec 205. |
| create | PASS | Created invoice id=6423275 (PRES2312), status=NEW, customerId=2717. Exec 216. Note: `comment` field in additionalFields causes 400 (see bugs). |
| update | PASS | Updated invoice 6423275 with `headerDiscount=3`; version bumped 2→3. `updateBody` (JSON field) works correctly with ignoreMissingProperties=true. Exec 236. |
| delete | PASS | Invoice 6423275 deleted; response `{"deleted":true,"id":"6423275"}`. Exec 266. |
| downloadLatestSalesInvoicePdf | PASS | Invoice 4073 returned 59.6KB PDF binary (%PDF-1.4 header confirmed). Exec 250. |
| downloadLatestSalesInvoicePdf (NEW invoice) | FAIL | Returns 404 `no sales invoice document found` — expected; NEW invoices have no generated document. Not a node bug. |
| recalculateCosts (action) | FAIL | 400 `body is not a json object` — node does not send Content-Type: application/json when body is `{}`. Exec 255. |
| updatePrices (action) | FAIL | Same 400 `body is not a json object` as recalculateCosts. Exec 269. |

## Bugs / friction found

### [CRITICAL] Status enum in SalesInvoiceDescription.ts is completely wrong

**File:** `nodes/Weclapp/descriptions/SalesInvoiceDescription.ts`, `status` options field (line ~536)

The dropdown offers: CANCELLED, DEBIT_ADVICE, DISPUTE, DUNNING, OPEN, PAID

Valid weclapp salesInvoice statuses (per API validation error, confirmed against testhandel):
NEW, CANCELLED, OPEN_ITEM_CREATED, ENTRY_COMPLETED, DOCUMENT_CREATED

Every non-CANCELLED status in the dropdown causes an immediate 400 from weclapp. CANCELLED happens to match but only by accident. The status options must be replaced entirely.

**Evidence:** exec 195 — `"detail": "unknown enum value: OPEN"`, `"allowed": ["NEW", "CANCELLED", "OPEN_ITEM_CREATED", "ENTRY_COMPLETED", "DOCUMENT_CREATED"]`

**Suggested fix:**
```typescript
options: [
  { name: '(All)', value: '' },
  { name: 'Cancelled', value: 'CANCELLED' },
  { name: 'Document Created', value: 'DOCUMENT_CREATED' },
  { name: 'Entry Completed', value: 'ENTRY_COMPLETED' },
  { name: 'New', value: 'NEW' },
  { name: 'Open Item Created', value: 'OPEN_ITEM_CREATED' },
],
```

---

### [HIGH] POST actions with `body: {}` fail — node omits Content-Type header

**Affected operations:** `recalculateCosts`, `updatePrices`, `resetTaxes` (and possibly `setCostsForItemsWithoutCost`, `createCreditNoteOpenItem`)

All these operations use `body: {}` in their routing config to indicate an empty JSON body. However, n8n does not send `Content-Type: application/json` when the body resolves to an empty object, causing weclapp to reject with 400 `body is not a json object`.

Direct curl with `-d '{}'` and `Content-Type: application/json` works correctly (tested: recalculateCosts returns 52 result items on invoice 4073).

**Evidence:** exec 255 — `"detail": "body is not a json object"`. Direct curl to same endpoint succeeds.

**Suggested fix:** Change routing for these actions to explicitly set the body to a non-empty-looking value, or add a custom pre-send hook that forces `Content-Type: application/json`. Alternatively, use `body: { _placeholder: undefined }` and rely on JSON serialization, or investigate whether setting `headers: { 'Content-Type': 'application/json' }` in the routing request resolves it.

---

### [MED] `comment` field in create additionalFields is not a valid salesInvoice property

**File:** `nodes/Weclapp/descriptions/SalesInvoiceDescription.ts`, additionalFields `comment` option (line ~641)

weclapp returns `"detail": "property comment is unknown"` when `comment` is included in the POST body. The salesInvoice entity does not have a `comment` field. This will confuse users who add the field and see a 400 error.

**Evidence:** exec 208 — `"detail": "property comment is unknown"`, `"errorCode": "platform.unknown_property"`

**Suggested fix:** Remove the `comment` option from the additionalFields collection for the `create` operation, or replace it with a valid field such as `headerDiscount` (numeric) or `salesChannel`.

---

### [LOW] PDF download on NEW-status invoices fails with 404

The `downloadLatestSalesInvoicePdf` operation on invoices in `NEW` status returns `"no sales invoice document found"`. This is expected weclapp behavior (the PDF is only generated when the invoice is finalized), but the node surfaces this as a generic 400 error without a user-friendly message.

**Suggested fix:** Add a descriptive hint in the node UI or pre-flight check: "PDF is only available after the invoice has been processed (status: DOCUMENT_CREATED or later)."

---

### [LOW] Webhook registration requires `webhookId` field in node definition

When creating workflows via the n8n API without including a `webhookId` property on the webhook node, the webhook is not registered and returns 404. The `webhookId` must match the `path` value. This is an n8n quirk, not a weclapp node bug, but it's relevant for any automation that programmatically creates workflows.

## Cleanup

- Created 11 QA-U05-* test workflows, all deleted.
- Created 1 test salesInvoice (id=6423275, PRES2312) via the create operation; deleted by the delete operation test.
- No entities left on testhandel from this run.
- 0 failed cleanups.

## Execution IDs (for replay)

| Op | Exec ID | Status |
|----|---------|--------|
| list | 192 | success |
| list filter (wrong status OPEN) | 195 | error |
| list filter (OPEN_ITEM_CREATED via advanced filters) | 199 | success |
| get (id=4073) | 205 | success |
| create (→id=6423275) | 216 | success |
| update (headerDiscount) | 236 | success |
| delete (id=6423275) | 266 | success |
| downloadLatestSalesInvoicePdf (id=4073) | 250 | success |
| recalculateCosts | 255 | error |
| updatePrices | 269 | error |
