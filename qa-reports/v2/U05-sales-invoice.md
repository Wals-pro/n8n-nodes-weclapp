# Re-QA Report — U05 SalesInvoice (v0.2.0-pre)

Date: 2026-04-17
Tester: coordinator agent (qa2/u05-sales-invoice)
n8n: localhost:5678 (Docker, v1.120.4) | weclapp tenant: testhandel
Prefix: QA2-U05- | Branch: qa2/u05-sales-invoice | Fixes re-tested from PR #44 (merged into main)

## Fixes Under Test

| Fix | PR | Commit | Description |
|-----|----|--------|-------------|
| F8 | #76 (fix/64-status-enums) | c769b83 | salesInvoice status enum corrected: NEW/CANCELLED/OPEN_ITEM_CREATED/ENTRY_COMPLETED/DOCUMENT_CREATED |
| F4 | #75 (fix/60-body-empty-actions) | bd1693d | `body: {}` removed from recalculateCosts, updatePrices, resetTaxes |
| F3 | #74 (fix/65-binary-routing) | cfd9392 | `binaryData` postReceive + `encoding: arraybuffer` + `returnFullResponse: true` added to downloadLatestSalesInvoicePdf and printLabel |

## Operations Tested

| Op | Result | Exec | Notes |
|----|--------|------|-------|
| list (no filter) | PASS | 455 | 10 items returned; first id=4073 (RE1000, OPEN_ITEM_CREATED) |
| list filter status=OPEN_ITEM_CREATED | PASS | 456 | **F8 FIX CONFIRMED** — 5 items, all OPEN_ITEM_CREATED. No 400 error. |
| list filter status=NEW | PASS | 457 | **F8 FIX CONFIRMED** — NEW enum accepted. 5 items returned, all NEW. |
| get (id=4073) | PASS | 458 | invoiceNumber=RE1000, status=OPEN_ITEM_CREATED, customerId=3961 |
| create (customerId=2717) | PASS | 460 | Created id=6423927 (PRES2315), status=NEW |
| update (headerDiscount=3) | PASS | 511 | id=6423927, version bumped 1→2, headerDiscount=3 confirmed |
| delete (id=6423927) | PASS | 512 | `{"deleted": true, "id": "6423927"}` |
| downloadLatestSalesInvoicePdf (id=4073) | PASS | 513 | **F3 FIX CONFIRMED** — binary=data, mimeType=application/pdf, fileSize=59.6 kB |
| recalculateCosts (id=4073) | FAIL | 490 | **F4 FIX REGRESSION** — still 400 `body is not a json object` (see below) |
| updatePrices (id=4073) | FAIL | 491 | Same F4 regression — 400 `body is not a json object` |
| resetTaxes (id=4073) | FAIL | 492 | Same F4 regression — 400 `body is not a json object` |

## Fix Verdicts

| Fix | Verdict | Detail |
|-----|---------|--------|
| **F8** — status enum | **PASS** | OPEN_ITEM_CREATED, NEW, DOCUMENT_CREATED, ENTRY_COMPLETED, CANCELLED all accepted by API. Previously OPEN/PAID/DUNNING were wrong and caused 400. |
| **F3** — binary routing | **PASS** | PDF returned with mimeType=application/pdf, 59.6 kB. `binaryData` postReceive confirmed working. Exec 513 shows binary key `data` in n8n item. |
| **F4** — empty-body actions | **FAIL — REGRESSION** | Removing `body: {}` was the wrong fix. See bug below. |

## Bugs Found

### [CRITICAL] F4 fix is a regression — weclapp requires `{}` body even on empty-body POST actions

**Affected:** `recalculateCosts`, `updatePrices`, `resetTaxes` (and likely all other empty-body POST actions across all resources)

**Root cause:** PR #75 removed `body: {}` from routing under the assumption that weclapp would accept a request with no body. Direct curl test disproves this:

```bash
# No body → weclapp returns 400 Bad Request HTML
curl -X POST .../salesInvoice/id/4073/recalculateCosts \
  -H "Content-Type: application/json" -H "Accept: application/json"
# Response: <HTML><HEAD><TITLE>Bad Request</TITLE>...

# With {} body → weclapp succeeds (returns gzip-compressed result)
curl -X POST .../salesInvoice/id/4073/recalculateCosts \
  -H "Content-Type: application/json" -H "Accept: application/json" -d '{}'
# Response: (binary gzip, HTTP 200)
```

**Conclusion:** weclapp requires `Content-Type: application/json` AND a body of at least `{}` for these endpoints. The v1 QA diagnosis was correct that the node was failing with `body: {}`, but the fix was inverted — removing `body: {}` makes weclapp reject the request entirely.

**Correct fix needed:** Keep `body: {}` in routing, but ensure n8n actually sends `Content-Type: application/json` with it. The `requestDefaults` in `Weclapp.node.ts` already sets `Content-Type: application/json`, but this may not be applied when n8n resolves an empty body `{}`. Possible approaches:
1. Change `body: {}` to `body: { _: undefined }` and rely on JSON serialisation dropping undefined keys (resulting in `{}` sent).
2. Use a `preSend` hook that explicitly sets the body to `{}` for these operations.
3. Verify whether the `requestDefaults` Content-Type is properly applied for routing-level POST operations with no user-provided body fields.

**Evidence:** exec 490 — `"detail": "body is not a json object"`. Direct curl with `{}` succeeds. PR #75 commit bd1693d removed `body: {}` but this is the wrong direction.

---

### [MEDIUM] `comment` field in create additionalFields still present (v1 carry-over)

**File:** `SalesInvoiceDescription.ts` line ~639 (unchanged since v1 QA)

The `comment` additionalField sends `comment` to weclapp which rejects it with `"property comment is unknown"`. This bug was reported in v1 QA but was not in scope for PR #44. Still present in v0.2.0-pre.

---

### [LOW] PDF download on NEW-status invoices returns 404 (v1 carry-over)

Invoices in NEW status have no PDF document generated. weclapp returns 404. The node surfaces it as a generic 400. Not fixed in PR #44 — noted for future UI hint improvement.

## Comparison: v1 vs v2

| Issue | v1 Status | v2 Status |
|-------|-----------|-----------|
| Status enum wrong (OPEN, PAID, DUNNING) | FAIL | **PASS (F8 fixed)** |
| downloadLatestSalesInvoicePdf binary routing | PASS (PDF returned) | **PASS (F3 confirmed working)** |
| recalculateCosts body 400 | FAIL (body:{} not sending CT) | **STILL FAIL (F4 regression — removing body:{} worse)** |
| updatePrices body 400 | FAIL | **STILL FAIL** |
| resetTaxes (not tested in v1) | N/A | **FAIL** |
| list, get, create, update, delete | PASS | **PASS** |

## Cleanup

- Created 11 QA2-U05-* test workflows, all deleted.
- Created 1 test salesInvoice (id=6423927, PRES2315) via create test; deleted by delete test.
- No entities left on testhandel from this run.
- 0 failed cleanups.

## Execution IDs

| Op | Exec | Status |
|----|------|--------|
| list | 455 | success |
| list filter (OPEN_ITEM_CREATED) | 456 | success |
| list filter (NEW) | 457 | success |
| get (id=4073) | 458 | success |
| create (→id=6423927) | 460 | success |
| update (headerDiscount=3) | 511 | success |
| delete (id=6423927) | 512 | success |
| downloadLatestSalesInvoicePdf (id=4073) | 513 | success |
| recalculateCosts | 490 | error |
| updatePrices | 491 | error |
| resetTaxes | 492 | error |

## Open Items / Next Steps

1. **F4 needs a proper fix** — restore `body: {}` in all affected routing entries AND find a way to ensure n8n sends `Content-Type: application/json` with an empty `{}` body. Suggestion: audit how `requestDefaults` Content-Type interacts with routing-only POST operations (no body field params). Consider adding a `preSend` hook for empty-body POST ops.
2. **Remove `comment` from create additionalFields** (or replace with a valid field).
3. **printLabel** not tested in this run (requires finalized invoice with items). Should be covered in a focused printLabel test with a suitable fixture.
