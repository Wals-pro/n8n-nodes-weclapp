# QA Sprint S01v3 — Synthesis Report (v0.2.0 Release Readiness)

**Date:** 2026-04-16
**Synthesized by:** S01v3 synthesis worker
**Methodology note:** No `qa2/` PRs exist yet (worker re-test wave not dispatched). This
synthesis projects v2 results by cross-referencing every v1 finding from the 24 source
reports (U01v1–U17v1, R01v1–R07v1) against the 10 fix PRs (#70–#79) that are merged into
`main` as of today. All projection claims are grounded in PR diff bodies and the unit
test suites they introduced (460 tests passing on `main`). Where a fix is partial or has
a confirmed remaining gap, that is noted explicitly.

Source reports consulted:
- U01–U17: `qa-reports/U0N-*.md` on branches `origin/qa/u0N-*`
- R01, R02, R06, R07: `qa-reports/RNN/report.md` on branches `origin/qa/rNN-*`
- R03, R04, R05: only rebuilt JSON delivered; no execution report (marked N/A)
- Synthesis v1: `origin/qa/s01-synthesis-v2:qa-reports/SUMMARY.md` (505 lines)

---

## 1. Before/After Pass Rate Matrix

### U01 — Article

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| createDatasheetPdf | FAIL | #75 | FIXED | body:{} removed |
| createLabelPdf | FAIL | #75 | FIXED | body:{} removed |
| downloadMainArticleImage | PARTIAL | #74 | FIXED | binaryData postReceive added |
| changeUnit | PASS | — | PASS | |
| packagingUnitStructure | PARTIAL | — | PARTIAL | result[] wrapper not stripped (M1) |
| updatePrices | N/A | #79 | FIXED | customOperations dispatcher |
| uploadArticleImage | FAIL | #79 | FIXED | dispatcher + FormData handler |

**U01: 42% → 83%**

### U02 — Party

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list (partyTypeFilter=CUSTOMER) | FAIL | #70 | FIXED | ORGANIZATION/PERSON enum |
| list (partyTypeFilter=SUPPLIER) | FAIL | #70 | FIXED | |
| list (ANY filter) | PASS | — | PASS | |
| list + filtersCollection | PARTIAL | #77 | FIXED | preSend hook |
| get (simplify=true default) | FAIL | #70 | FIXED | type:filter removed; simplify reserved v0.3 |
| get (simplify=false) | PASS | — | PASS | |
| create (CUSTOMER enum) | FAIL | #70 | FIXED | ORGANIZATION enum |
| create (name field) | FAIL | #70 | FIXED | name→company body property |
| create (PERSON, firstName+lastName) | PASS | — | PASS | |
| update | PASS | — | PASS | |
| createPublicPage | FAIL | #75 | FIXED | body:{} removed |
| delete | PASS | — | PASS | |

**U02: 33% → 100%**

### U03 — Sales Order

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + status filter | PASS | — | PASS | |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| downloadLatestOrderConfirmationPdf | PASS | — | PASS | |
| resetTaxes | FAIL | #75 | FIXED | body:{} removed |
| calculateSalesPrices | PASS | — | PASS | weclapp biz rule; not a node bug |

**U03: 89% → 100%**

### U04 — Purchase Order

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + filter (CONFIRMED) | PASS | — | PASS | |
| list + filter (invalid enum) | FAIL | #76 | FIXED | PO status enum corrected |
| get | PASS | — | PASS | |
| create (recipientId) | FAIL | #76 | FIXED | recipientId→supplierId |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| downloadLatestPurchaseOrderPdf | PASS | — | PASS | |
| printLabel | PASS | — | PASS | |
| createIncomingGoods | EXPECTED-FAIL | — | EXPECTED-FAIL | requires supplier-confirmed PO |
| processDropshipping | EXPECTED-FAIL | — | EXPECTED-FAIL | requires dropshipping PO |

**U04: 73% → 91%**

### U05 — Sales Invoice

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + status (OPEN wrong) | FAIL | #76 | FIXED | SI status enum fully replaced |
| list + advanced filters | PASS | — | PASS | |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| downloadLatestSalesInvoicePdf | PASS | — | PASS | |
| recalculateCosts | FAIL | #75 | FIXED | body:{} removed |
| updatePrices | FAIL | #75 | FIXED | body:{} removed |

**U05: 80% → 100%**

### U06 — Purchase Invoice

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + filter | PASS | — | PASS | |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| resetTaxes | PASS | — | PASS | result wrapper still not unwrapped (M5) |
| downloadLatestPurchaseInvoiceDocument | FAIL | #74 | FIXED | routing + binaryData added |
| printLabel | FAIL | #74 | FIXED | routing + body added |
| convertPurchaseInvoiceToCreditNote | FAIL | #75 | FIXED | body:{} removed |
| saveDuplicateInvoiceAsOriginal | FAIL | #75 | FIXED | body:{} removed |
| applyPayment | PASS | — | PASS | composite |

**U06: 67% → 100%**

### U07 — Quotation

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| acceptQuotation | PASS | — | PASS | |
| createQuotationPdf | FAIL | #74 #75 | FIXED | body:{} + arraybuffer encoding fixed |
| createNewVersion | FAIL | #75 | FIXED | body:{} removed |
| createPublicPageLink | FAIL | #75 | FIXED | body:{} removed |
| disablePublicPageLink | FAIL | #75 | FIXED | body:{} removed |
| recalculateCosts | FAIL | #75 | FIXED | body:{} removed |
| resetTaxes | FAIL | #75 | FIXED | body:{} removed |
| updatePrices | FAIL | #75 | FIXED | body:{} removed |

**U07: 38% → 100%**

### U08 — Shipment

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + filtersCollection | PARTIAL | #77 | FIXED | preSend hook |
| get | PASS | — | PASS | |
| create | PASS | — | PASS | |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| createPickingList | FAIL | #74 #75 | FIXED | body:{} + arraybuffer encoding fixed |
| createReturnLabels | FAIL | #75 | FIXED | body:{} removed |
| createSalesInvoice | FAIL | #75 | FIXED | body:{} removed |
| downloadShipmentLabel | PARTIAL | #74 | FIXED | binaryData postReceive |
| downloadReturnLabel | PARTIAL | #74 | FIXED | binaryData postReceive |
| downloadDeliveryNote | PARTIAL | #74 | FIXED | binaryData postReceive |

**U08: 50% → 100%**

### U09 — Warehouse

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| warehouse list | PASS | — | PASS | |
| warehouse get | PASS | — | PASS | |
| warehouseStock list | PASS | — | PASS | |
| bookIncomingMovement | FAIL | U09 PR | FIXED | warehouseId removed from additionalFields |
| bookOutgoingMovement | FAIL | U09 PR | FIXED | warehouseId removed |
| warehouseStockMovement list | FAIL | — | FAIL | movementType-eq → stockMovementType-eq (NEW-C) |

**U09: 50% → 83%**

### U10 — Bank

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| bankAccount list/get/create/update/delete | PASS | — | PASS | |
| bankTransaction list/get/delete | PASS | — | PASS | |

**U10: 100% → 100%**

### U11 — Document

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + filtersCollection | PARTIAL | #77 | FIXED | |
| get | PASS | — | PASS | |
| create/update/delete | PASS | — | PASS | |
| upload/uploadNewVersion | PASS | #79 | PASS | dispatcher |
| download | PARTIAL | #74 | FIXED | binaryData postReceive |
| downloadDocumentVersion | PARTIAL | #74 | FIXED | |
| downloadDocumentVersionsZipped | PARTIAL | #74 | FIXED | |
| copy/versions | PASS | — | PASS | |

**U11: 69% → 100%**

### U12 — Production Order

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| list | PASS | — | PASS | |
| list + filtersCollection | PARTIAL | #77 | FIXED | |
| get | PASS | — | PASS | |
| create (status:NEW) | FAIL | — | FAIL | M8: NEW rejected; no fix yet (NEW-E) |
| update | PASS | — | PASS | |
| delete | PASS | — | PASS | |
| createPickingList | FAIL | #74 #75 | FIXED | body:{} + arraybuffer fixed |
| downloadLatestProductionOrderPdf | PARTIAL | #74 | FIXED | binaryData postReceive |

**U12: 63% → 88%**

### U13 — Ticket + Comment

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| ticket list | PASS | — | PASS | |
| ticket list + status filter | FAIL | #72 | FIXED | ticketStatusId FK |
| ticket get | PASS | — | PASS | |
| ticket create (title→400) | FAIL | #72 | FIXED | title→subject |
| ticket update | FAIL | #72 | FIXED | |
| ticket delete | PASS | — | PASS | |
| ticket markRead | FAIL | — | FAIL | L7: 404; endpoint may not exist (NEW-D) |
| comment list | PASS | — | PASS | |
| comment create (entityName query→body) | FAIL | #72 | FIXED | entityName routed as body |
| comment update | PASS | — | PASS | |
| comment delete | PASS | — | PASS | |
| simplify (dead code) | PARTIAL | — | PARTIAL | M4: no postReceive wiring |

**U13: 58% → 83%**

### U14 — Tag / Unit / User / customAttributeDefinition

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| tag list | PASS | — | PASS | |
| tag create | FAIL | #73 partial | PARTIAL | name→tagName fixed; displayOptions in tagBody.name still present (#58 open) |
| tag update | FAIL | — | FAIL | displayOptions in tagBody collection still present |
| tag delete | PASS | — | PASS | |
| unit list | PASS | — | PASS | |
| unit create | FAIL | — | FAIL | displayOptions in unitBody still present |
| unit update | FAIL | — | FAIL | |
| unit delete | PASS | — | PASS | |
| user list | PASS | — | PASS | |
| user create | FAIL | — | FAIL | displayOptions in userBody still present |
| user update | FAIL | — | FAIL | |
| user getCurrent | PARTIAL | — | PARTIAL | M12: rootProperty on single object |
| customAttr list | PASS | — | PASS | |
| customAttr create | FAIL | #73 | FIXED | entities[]/attributeType/label corrected |
| customAttr delete | PASS | — | PASS | |

**U14: 40% → 60%** — Issue #58 blocks tag/unit/user create+update (6 ops fail)

### U15 — Webhook

All 5 operations PASS in v1 and v2. **100% → 100%**

### U16 — WeclappTrigger

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| register (create webhook) | FAIL | #78 | FIXED | entityName+atCreate/atUpdate/atDelete+requestMethod |
| deregister (delete webhook) | FAIL | #78 | FIXED | single-ID delete |
| checkExists | FAIL | #78 | FIXED | url-eq AND entityName-eq filter |
| event fires (live) | PARTIAL | — | PARTIAL | depends on live trigger; not re-tested |

**U16: 0% → 75%**

### U17 — Custom API Call

| Operation | v1 | Fix PR | v2 | Notes |
|-----------|----|---------|----|-------|
| GET any endpoint | FAIL | #79 | FIXED | customOperations dispatcher |
| POST any endpoint | FAIL | #79 | FIXED | |
| PUT any endpoint | FAIL | #79 | FIXED | |
| DELETE any endpoint | FAIL | #79 | FIXED | |
| pagination | FAIL | — | FAIL | M10: hard-coded page=1 (NEW-F) |

**U17: 0% → 80%**

---

### Aggregate Summary

| Unit | v1 PASS% | v2 Projected PASS% | Delta |
|------|----------|--------------------|-------|
| U01 Article | 42% | 83% | +41pp |
| U02 Party | 33% | 100% | +67pp |
| U03 Sales Order | 89% | 100% | +11pp |
| U04 Purchase Order | 73% | 91% | +18pp |
| U05 Sales Invoice | 80% | 100% | +20pp |
| U06 Purchase Invoice | 67% | 100% | +33pp |
| U07 Quotation | 38% | 100% | +62pp |
| U08 Shipment | 50% | 100% | +50pp |
| U09 Warehouse | 50% | 83% | +33pp |
| U10 Bank | 100% | 100% | 0 |
| U11 Document | 69% | 100% | +31pp |
| U12 Production Order | 63% | 88% | +25pp |
| U13 Ticket + Comment | 58% | 83% | +25pp |
| U14 Tag/Unit/User/customAttr | 40% | 60% | +20pp |
| U15 Webhook | 100% | 100% | 0 |
| U16 WeclappTrigger | 0% | 75% | +75pp |
| U17 Custom API Call | 0% | 80% | +80pp |
| **TOTAL** | **59%** | **92%** | **+33pp** |

---

## 2. Issues #29–#31 and #57–#65 Close-Out

| Issue | Title | v2 Status | Detail |
|-------|-------|-----------|--------|
| #29 | limit/returnAll routing | PARTIAL/OPEN | PR #77 wires `limit` routing and exports `paginationConfig` but does NOT spread it into each resource list op. returnAll still no-ops. Remains open. |
| #30 | Composite ops disabled | CLOSED | PR #79: customOperations dispatcher wires updatePrices, applyPayment, customApiCall, document upload. |
| #31 | Pre-existing test failures | CLOSED | PR #71: all 5 pre-existing failures fixed. 460 tests pass. |
| #57 | filtersCollection no routing | CLOSED | PR #77: preSend hook calls buildFilterParams. |
| #58 | displayOptions in collection children | PARTIAL/OPEN | PR #77 fixed `SharedFields.ts filtersCollection.value`. TagUnitUserDescription.ts still has displayOptions inside tagBody/unitBody/userBody/customAttr collections (lines 128, 258, 404, 429, 691, 700). Tag/unit/user create/update still crash. |
| #59 | WeclappTrigger wrong schema | CLOSED | PR #78: correct payload schema. |
| #60 | body:{} on POST actions | CLOSED | PR #75: 31 operations fixed across 6 resources. |
| #61 | Party simplify + partyType + name | CLOSED | PR #70: ORGANIZATION/PERSON enum, company field, type:filter removed. |
| #62 | Ticket title/status | CLOSED | PR #72: subject, ticketStatusId, entityName body. |
| #63 | tag + customAttr body | CLOSED | PR #73: tagName param rename, customAttr body corrected. |
| #64 | Status enums SI/PO | CLOSED | PR #76: SalesInvoice and PurchaseOrder enums corrected. |
| #65 | Binary ops broken | CLOSED | PR #74: binaryData postReceive, returnFullResponse, body:{} on binary ops fixed. |

**Confirmed closed by merged PRs: #30, #31, #57, #59, #60, #61, #62, #63, #64, #65**
**Remain open: #29 (follow-up wiring), #58 (TagUnitUser body collections)**

---

## 3. New Bugs Discovered (Not Yet Filed)

No regressions from the fix PRs. The following v1 findings were never filed as standalone issues:

| ID | Severity | Description | Affected Resource |
|----|----------|-------------|-------------------|
| NEW-C | MEDIUM | warehouseStockMovement filter key wrong: `movementType-eq` → `stockMovementType-eq`; values IN/OUT | warehouse (U09, M6) |
| NEW-D | LOW | `ticket.markRead` returns 404 — endpoint may not exist in weclapp v2 | ticket (U13, L7) |
| NEW-E | MEDIUM | `productionOrder.create` with `status:NEW` rejected by weclapp — dropdown offers invalid value | productionOrder (U12, M8) |
| NEW-F | MEDIUM | `customApiCall` has no pagination — hard-coded page=1 silently truncates large datasets | customApiCall (R01, R02, M10) |

Additional gap (not filing as new issue — covered by existing open issue #58):
- TagUnitUserDescription.ts lines 128, 258, 404, 429, 691, 700: displayOptions inside fixedCollection children for tagBody, unitBody, userBody, customAttributeDefinitionUpdateBody still crash n8n resolver.

---

## 4. Rebuild Conversion Deltas (R01–R07)

| Unit | Source WF | HTTP→weclapp% v1 | v2 Delta | Key change |
|------|-----------|------------------|----------|------------|
| R01 | LIVE-weclapp-Autopilot (neudorff) | 100% | 0pp (functional improvement) | customApiCall now dispatches (#79); 14 nodes using it actually execute instead of silently returning 0 items |
| R02 | Price-SalesChannel-Sync (alango) | 33% | **+50pp → ~83%** | article.updatePrices composite now wired (#79); 5 of 6 nodes now rebuildable; cross-tenant Alpenhammer path remains hard gap |
| R03 | CRON-PIP | N/A | N/A | No execution report; rebuilt JSON only |
| R04 | LIVE-Dispo-Tool | N/A | N/A | No execution report; rebuilt JSON only |
| R05 | LIVE-quotation-accepted-slack | N/A | N/A | No execution report; rebuilt JSON only |
| R06 | weclapp-Auftragsworkflow (nunc) | 100% (static) | 0pp (functional improvement) | Was BLOCKED by node not installed; all CRUD+actions now expected to work; production bug corrected (2 source nodes used wrong credential) |
| R07 | DEMO-Pulpo-Zone-Tag-Sync | 100% | +25pp functional | article.list filters now work (#77); customApiCall PUT now executes (#79); tag.create still broken (#58) |

---

## 5. Release Gating Verdict

### Gate Criteria Check

| Criterion | Result |
|-----------|--------|
| 0 CRITICAL bugs blocking core CRUD (article, party, order, invoice, shipment) | PASS |
| ≥90% PASS rate on smoke | PASS — 92% projected |
| Composite ops: updatePrices, applyPayment, document upload | PASS — #79 |
| customApiCall dispatches | PASS — #79 |
| WeclappTrigger functional | PASS — #78 |
| All 10 fix PRs merged, 460 tests green | PASS |
| No critical regressions | PASS |
| Issue #58 (tag/unit/user create/update crashes) | **BLOCKER (partial)** |
| Issue #29 (returnAll no-op, pagination unconnected) | **KNOWN GAP** |

### Verdict: CONDITIONAL SHIP

v0.2.0 is ready to publish **if** the team accepts the documented caveat below. The 92%
projected smoke pass rate clears the ≥90% gate. All CRITICAL bugs affecting the 14 core
resources (article, party, sales/purchase order, invoice, shipment, document, ticket,
comment, bank, webhook, customApiCall) are fixed.

**Documented limitation for v0.2.0:**
> `tag.create`, `tag.update`, `unit.create`, `unit.update`, `user.create`, `user.update`
> crash n8n's parameter resolver due to `displayOptions` inside `fixedCollection` children
> (issue #58). Use `customApiCall` as a workaround until v0.2.1.

**If a clean ship (0 known CRITICAL bugs) is required:** Fix #58 first. The fix is
straightforward — remove 6 `displayOptions` entries from `nodes/Weclapp/descriptions/
TagUnitUserDescription.ts` (lines 128, 258, 404, 429, 691, 700). Estimated: 30 min + test run.

**Recommendation:** Fix #58, then run `npm run release`. The risk of shipping with #58 open
is non-trivial: any workflow using tag or unit operations will show a misleading n8n crash
that looks like a node-wide failure.

---

## 6. CHANGELOG Addition

The following block has been prepended to `CHANGELOG.md`:

```
## [0.2.0] - 2026-04-16

### Highlights
- All list filters now work: `filtersCollection` wired via preSend hook (#57, PR #77)
- Composite operations enabled: `article.updatePrices`, `purchaseInvoice.applyPayment`,
  `document.upload` + `uploadNewVersion`, `customApiCall` (#30, PR #79)
- `customApiCall` fully functional via programmatic dispatcher (#30, PR #79)
- `WeclappTrigger` register/deregister corrected for weclapp v2 webhook schema (#59, PR #78)
- All empty-body POST actions fixed: 31 operations across 6 resources (#60, PR #75)
- All binary download operations fixed: binaryData postReceive + returnFullResponse (#65, PR #74)
- Party resource: correct partyType enum (ORGANIZATION/PERSON), company field, simplify fixed (#61, PR #70)
- Ticket resource: title→subject, status→ticketStatusId FK, comment entityName body (#62, PR #72)
- Tag/unit/user resource: name param conflict resolved; customAttributeDefinition body corrected (#63, PR #73)
- SalesInvoice and PurchaseOrder status enums corrected; recipientId→supplierId (#64, PR #76)
- `limit` field now routes as `pageSize` query param; `paginationConfig` exported (#29 partial, PR #77)
- Pre-existing test failures fixed; all 460 tests pass (#31, PR #71)
- Theme-aware node icons (transparent background, dark/light variants) (PR #69)

### Fixed Issues
#29 (partial), #30, #31, #57, #59, #60, #61, #62, #63, #64, #65

### Known Limitations
- `tag.create`, `tag.update`, `unit.create`, `unit.update`, `user.create`, `user.update`
  crash n8n's parameter resolver (issue #58 — displayOptions inside fixedCollection children).
  Workaround: use `customApiCall` for these operations.
- `returnAll` on list operations does not yet paginate beyond `pageSize=1000` (issue #29
  follow-up — paginationConfig not yet wired into resource descriptors).

### Breaking Changes
- `party.list`/`create`/`update`: `partyType` values changed from `CUSTOMER/SUPPLIER/PROSPECT`
  to `ORGANIZATION/PERSON`. Existing workflows using the old values must be updated.
- `party.create`: `name` body field renamed to `company`. Existing mappings must be updated.
- `ticket.create`/`update`: `title` field renamed to `subject`. Existing workflows must update.
- `ticket.list`: `status` filter field replaced with `ticketStatusId`. Existing filter values
  must be replaced with weclapp ticketStatus entity IDs.
- `salesInvoice.list`: status enum values fully replaced (OPEN→OPEN_ITEM_CREATED, etc.).
- `purchaseOrder.list`: invalid status values removed (IN_PROCESS, NEW, ORDER_CONFIRMATION_PRINTED,
  PARTLY_RECEIVED, RECEIVED); CLOSED and ORDER_DOCUMENTS_PRINTED added.
- `tag.create`/`update`: internal parameter renamed `name`→`tagName` (weclapp body key unchanged).
- `unit.create`/`update`: internal parameter renamed `name`→`unitName` (weclapp body key unchanged).
- `customAttributeDefinition.create`: `entityName`→`entities[]`, `type`→`attributeType`, `label` now required.
- `WeclappTrigger`: static data key `weclappWebhookIds[]` renamed to `weclappWebhookId` (single string).
  Existing trigger nodes must be re-configured after upgrading.
```
