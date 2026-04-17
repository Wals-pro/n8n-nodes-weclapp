# QA Sprint S01 — Synthesis Report

**Date:** 2026-04-17  
**Reports aggregated:** 24 (U01–U17 smoke + R01–R07 rebuild)  
**Methodology:** Direct weclapp API + static code analysis (node not installed in docker n8n for most workers — see Systemic Infrastructure Bug below)

---

## 1. Pass/Fail Matrix

### U01 — Article (PR #43)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | exec 184 |
| get | PASS | exec 204 |
| create | PASS | exec 211 |
| update | PASS | exec 215 |
| delete | PASS | exec 268 |
| createDatasheetPdf | FAIL | body:{} routing → weclapp 400 |
| createLabelPdf | FAIL | body:{} bug, exec 233 |
| downloadMainArticleImage | PARTIAL | binary not populated (Buffer in json) |
| changeUnit | PASS | exec 259 |
| packagingUnitStructure | PARTIAL | result[] wrapper not stripped |
| updatePrices | N/A | composite — issue #30 |
| uploadArticleImage | FAIL | expected (no binary in test harness) |

### U02 — Party (PR #52)

| Op | Result | Notes |
|----|--------|-------|
| list (partyTypeFilter=CUSTOMER) | FAIL | wrong enum → 400 |
| list (partyTypeFilter=SUPPLIER) | FAIL | wrong enum → 400 |
| list (ANY filter) | PASS | exec 317 |
| list + filtersCollection | PARTIAL | filter not applied (no routing) |
| get (simplify=true, default) | FAIL | CRITICAL: simplify drops all items, exec 313 |
| get (simplify=false) | PASS | exec 316 |
| create (partyType=CUSTOMER) | FAIL | wrong enum → 400 |
| create (partyType=PERSON, name field) | FAIL | `name` not valid → 400 |
| create (partyType=PERSON, firstName+lastName) | PASS | exec 308 |
| update | PASS | exec 324 |
| createPublicPage | FAIL | body:{} → 400 |
| delete | PASS | exec 329 |

### U03 — Sales Order (PR #56)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | exec 333 |
| list + status filter | PASS | |
| get | PASS | |
| create | PASS | |
| update | PASS | |
| delete | PASS | exec 338 |
| downloadLatestOrderConfirmationPdf | PASS (expected 404) | |
| resetTaxes | FAIL | body:{} → 400 |
| calculateSalesPrices | PASS (routed) | weclapp business rule 400, not node bug |

### U04 — Purchase Order (PR #41)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | direct API |
| list + filter (CONFIRMED) | PASS | exec 1026465 |
| list + filter (invalid enum) | FAIL | unknown enum → 400 |
| get | PASS | exec 1026498 |
| create | PASS | direct API |
| update | PASS | |
| delete | PASS | |
| downloadLatestPurchaseOrderPdf | PASS | exec 1026871, 59 716 bytes |
| printLabel | PASS | direct API |
| createIncomingGoods | EXPECTED-FAIL | requires supplier-confirmed PO |
| processDropshipping | EXPECTED-FAIL | requires dropshipping PO |

### U05 — Sales Invoice (PR #44)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | exec 192 |
| list + status filter (OPEN — wrong) | FAIL | CRITICAL: wrong enum → 400, exec 195 |
| list + advanced filters (OPEN_ITEM_CREATED) | PASS | exec 199 |
| get | PASS | exec 205 |
| create | PASS | exec 216 |
| update | PASS | exec 236 |
| delete | PASS | exec 266 |
| downloadLatestSalesInvoicePdf | PASS | exec 250, 59.6 KB |
| recalculateCosts | FAIL | body:{} → 400, exec 255 |
| updatePrices | FAIL | body:{} → 400, exec 269 |

### U06 — Purchase Invoice (PR #34)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | direct API |
| list + filter | PASS | |
| get | PASS | |
| create | PASS | |
| update | PASS | |
| delete | PASS | |
| resetTaxes | PASS (API) | response result-wrapper not unwrapped |
| convertPurchaseInvoiceToCreditNote | PASS | |
| saveDuplicateInvoiceAsOriginal | EXPECTED-FAIL | state-dependent |
| downloadLatestPurchaseInvoiceDocument | FAIL (CRITICAL) | no routing → silent 0 items |
| printLabel | FAIL (CRITICAL) | no routing → silent 0 items |
| applyPayment | N/A | composite — issue #30 |

### U07 — Quotation (PR #40)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | direct API |
| list + filter | PASS | |
| get | PASS | |
| create | PASS | |
| update | PASS | |
| acceptQuotation | PASS | result wrapper correctly handled |
| createQuotationPdf | PASS | 877 754 bytes |
| downloadLatestQuotationPdf | PASS | |
| delete | PASS | |
| n8n webhook activate | FAIL (CRITICAL) | displayOptions in filtersCollection child → Max iterations |

### U08 — Shipment (PR #45)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | exec 276 |
| list + filter | PARTIAL | filter silently ignored (no routing), exec 222 |
| get | PASS | exec 238 |
| create | PASS | exec 253 |
| update | PASS | exec 265 |
| delete | PASS | exec 282 |
| createPickingList | FAIL | body:{}+encoding:arraybuffer → 400, exec 271 |
| downloadLatestDeliveryNotePdf | PASS | 57.9 KB, exec 278 |
| downloadLatestPickingListPdf | PASS | 60.7 KB, exec 286 |

### U09 — Warehouse (PR #38)

| Op | Result | Notes |
|----|--------|-------|
| warehouse list | PASS | direct API |
| warehouse list + filter | PASS | |
| warehouse get | PASS | |
| warehouseStock list | PASS | |
| warehouseStock list + filter | PASS | |
| warehouseStock get | PASS | |
| warehouseStockMovement list | PASS | |
| warehouseStockMovement list + filter | PASS | |
| bookIncomingMovement | PASS | id=6423247 |
| bookOutgoingMovement | PASS | id=6423249 |

### U10 — Bank (PR #39)

| Op | Result | Notes |
|----|--------|-------|
| bankAccount list | PASS | exec 193 |
| bankAccount get | PASS | exec 194 |
| bankAccount create | PASS | exec 203 |
| bankAccount update | PASS | exec 206 |
| bankAccount delete | PASS | exec 210 |
| bankTransaction list | PASS | exec 212 |
| bankTransaction get | PASS | exec 217 |
| bankTransaction list + filter | PARTIAL | filter field bookingDate wrong (plan error); correct: effectiveDate |

### U11 — Document (PR #51)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | direct API |
| list + mimeType filter | PASS | |
| get | PASS | |
| download | PASS | 59 620 bytes |
| downloadDocumentVersion | PASS | |
| copy | PASS | |
| upload | N/A | composite — issue #30 |

### U12 — Production Order (PR #48)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | exec 285 |
| list + filter | FAIL (CRITICAL) | filter silently ignored, exec 272 |
| get | PASS | exec 244 |
| create | PASS | exec 245 |
| update | PASS | exec 252 |
| delete | PASS | exec 261 |
| createPickingList | FAIL (CRITICAL) | encoding:arraybuffer corrupts POST body, exec 270 |
| downloadLatestProductionOrderPdf | PARTIAL | correct binary but Buffer leaks into json |

### U13 — Ticket + Comment (PR #37)

| Op | Result | Notes |
|----|--------|-------|
| ticket list | PARTIAL | rootProperty correct; node not installed |
| ticket list + status filter | FAIL | CRITICAL: `status` field doesn't exist (use ticketStatusId) |
| ticket create | FAIL (CRITICAL) | `title` field → 400 (correct: `subject`) |
| ticket update | FAIL | same field mapping bugs |
| ticket markRead | FAIL | 404 on testhandel |
| comment list | PASS | direct API |
| comment create | BLOCKED | entityName routing (query vs body) unverified |

### U14 — Tag / Unit / User / CustomAttributeDefinition (PR #54)

| Op | Result | Notes |
|----|--------|-------|
| tag list | PASS | exec 223 |
| tag get | PASS | exec 224 |
| tag create | FAIL (CRITICAL) | `name` param conflict → empty body |
| tag update | FAIL (CRITICAL) | displayOptions in collection child → 500 |
| tag delete | PASS | exec 305 |
| unit list | PASS | exec 225 |
| unit get | PASS | exec 226 |
| user list | PASS | exec 227 |
| user get | PASS | exec 228 |
| user getCurrent | PASS | exec 229 |
| customAttributeDefinition list | PASS | exec 230 |
| customAttributeDefinition create | FAIL (CRITICAL) | wrong field names + displayOptions crash |

### U15 — Webhook CRUD (PR #33)

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | direct API |
| get | PASS | |
| create | PASS | |
| update | PASS | |
| delete | PASS | 204 handled correctly |

### U16 — WeclappTrigger (PR #47)

| Op | Result | Notes |
|----|--------|-------|
| Node install check | PASS | all 4 node types in registry |
| Workflow create | PASS | |
| Workflow activate / register | FAIL (CRITICAL) | create() sends wrong payload (event, active fields don't exist) |
| Deregister | NOT REACHED | |

### U17 — Custom API Call (PR #32)

| Op | Result | Notes |
|----|--------|-------|
| customApiCall GET (any path) | FAIL (CRITICAL) | no routing config → silent 0 items (issue #30) |

---

## 2. Bug Consolidation by Severity

### CRITICAL

**C1 — `filtersCollection` never sends filter params (all resources)**
All list operations configured with filters silently drop them. `filtersCollection` in SharedFields.ts has no routing.send config; `buildFilterParams()` exists but is unreachable (no execute() method).
- Affected: party, salesOrder, purchaseOrder, purchaseInvoice, shipment, productionOrder, article, warehouse, warehouseStock
- Reports: U02, U08, U12, R07
- Fix: Add preSend routing hook or execute() dispatch calling buildFilterParams().

**C2 — `displayOptions` inside collection/fixedCollection children crashes n8n resolver**
n8n throws "Could not resolve parameter dependencies. Max iterations reached!" Webhook workflows fail to register; execution returns 500 with 0 recorded executions.
- Affected params: SharedFields.filtersCollection.value; TagUnitUserDescription.ts tagBody.name, unitBody.name, userBody.email, userBody.username, customAttributeDefinitionBody.*
- Reports: U07, U14, U16, R07
- Fix: Remove ALL displayOptions from collection/fixedCollection children.

**C3 — `customApiCall` silent zero output (issue #30 core)**
CustomApiDescription.ts has no routing config. After PR#28 removed execute(), declarative router finds nothing to do, returns 0 items silently.
- Reports: U17, R01, R02
- Fix: Add routing.request expressions to call operation fields, or restore minimal execute() dispatch.

**C4 — `Party.simplify=true` (default) drops all items**
type:'filter' postReceive uses $key to filter properties. $key is undefined in item-level context → includes(undefined) always false → 0 items.
- Reports: U02 (exec 313 zero items vs exec 316 correct with simplify=false)
- Fix: Use type:'set' postReceive for property projection.

**C5 — `WeclappTrigger.create()` wrong webhook payload schema**
Sends {url, event:"party.created", active:true}. Correct schema: {entityName, url, requestMethod:"POST", atCreate, atUpdate, atDelete}. weclapp rejects event and active with 400.
- Reports: U16
- Fix: Rewrite create() payload; fix checkExists() to add entityName-eq filter; fix delete() for single-ID.

**C6 — Ticket: `title` field doesn't exist in weclapp v2 (correct: `subject`)**
POST /ticket with {title:...} → 400 "property title is unknown". All ticket creates and updates broken.
- Reports: U13
- Fix: Rename title→subject throughout TicketDescription.ts and unit tests.

**C7 — Ticket: `status` enum doesn't exist in weclapp v2 (uses `ticketStatusId` FK)**
status-eq=OPEN returns 0 results silently. weclapp ticket uses ticketStatusId (FK to ticketStatus entity).
- Reports: U13
- Fix: Replace status field with ticketStatusId. Remove TICKET_STATUS_OPTIONS enum.

**C8 — `customAttributeDefinition.create` wrong field names**
entityName (node) → entities[] (weclapp). type (node) → attributeType (weclapp). label required but missing.
- Reports: U14
- Fix: Fix all three field mappings.

**C9 — `tag.create` empty body — `name` param conflicts with n8n internals**
Parameter named name conflicts with n8n's node.name → routing silently no-ops → empty POST body → 400.
- Reports: U14, R07
- Fix: Rename internal param to tagName; keep body mapping to name.

**C10 — `purchaseInvoice` binary ops have no routing (silent 0 items)**
downloadLatestPurchaseInvoiceDocument and printLabel have zero routing config. Declarative router returns 0 items with no error.
- Reports: U06
- Fix: Add routing config or wire to handleBinaryDownload() via execute().

### HIGH

**H1 — `body: {}` on POST actions → weclapp 400 "body is not a json object" (~15 operations)**
n8n sends Content-Type: application/json with empty body {}. weclapp rejects on endpoints expecting no body.
- Affected: resetTaxes, recalculateCosts, updatePrices, createPickingList (multiple resources), createReturnLabels, createShippingLabels, cancelOrManuallyClose, and ~8 more
- Reports: U01, U03, U05, U08, U12
- Fix: Remove body:{} from all action routing directives that send no data.

**H2 — Wrong partyType enum values (CUSTOMER/SUPPLIER/PROSPECT → ORGANIZATION/PERSON)**
- Reports: U02
- Fix: Replace enum options.

**H3 — `party.create` name field not valid (correct: company)**
- Reports: U02
- Fix: Rename body property from name to company.

**H4 — PurchaseOrder: invalid status enum values (IN_PROCESS, NEW, ORDER_CONFIRMATION_PRINTED, PARTLY_RECEIVED, RECEIVED; missing CLOSED, ORDER_DOCUMENTS_PRINTED)**
- Reports: U04
- Fix: Align with actual weclapp enum.

**H5 — SalesInvoice: status enum completely wrong (OPEN/PAID/DUNNING/DISPUTE/DEBIT_ADVICE → NEW/CANCELLED/OPEN_ITEM_CREATED/ENTRY_COMPLETED/DOCUMENT_CREATED)**
- Reports: U05
- Fix: Replace entire status enum.

**H6 — `warehouseId` in bookIncomingMovement/bookOutgoingMovement additionalFields → always 400**
weclapp rejects warehouseId on these endpoints (warehouse derived from storagePlaceId).
- Reports: U09
- Fix: Remove warehouseId from both additionalFields collections.

**H7 — `comment.create` entityName routed as query param but should be body**
entityId uses type:'body'; entityName uses type:'query'. weclapp comment create likely expects both in body.
- Reports: U13
- Fix: Change entityName routing to type:'body' for create.

**H8 — `additionalFields.properties` field projection not sent to API (no routing)**
properties, includeReferencedEntities, serializeNulls have no routing.send — collected but never forwarded.
- Reports: R07
- Fix: Add routing.send.type:'query' to each additionalFields option.

**H9 — `createPickingList` encoding:arraybuffer in request block corrupts POST body**
Should only apply to response decoding. When in request block it converts the body to arraybuffer → 400.
- Reports: U08, U12
- Fix: Remove encoding:arraybuffer from request block; remove body:{}; let binary response handling stay in output postReceive.

**H10 — Compound filter= expressions not supported by structured filter UI**
weclapp supports filter=(A) and (B) and not (C in [...]) with dynamic customAttribute keys. Structured UI cannot express these. 42% of R01 nodes fell back to customApiCall.
- Reports: R01, R06
- Fix: Add rawFilter string escape-hatch field on all List operations.

### MEDIUM

**M1 — packagingUnitStructure result wrapper not stripped**  M2 — PO create placeholder uses recipientId (should be supplierId)  M3 — Binary downloads: Buffer leaks into json alongside binary.*  M4 — simplifyTicket/simplifyComment dead code (no postReceive wiring)  M5 — purchaseInvoice action responses not unwrapped (result wrapper)  M6 — warehouseStockMovement filter uses movementType-eq (should be stockMovementType-eq with IN/OUT values)  M7 — comment field in salesInvoice.create additionalFields → 400  M8 — productionOrder.create status dropdown lists NEW but weclapp rejects it  M9 — document.copy requires user to fill same ID twice  M10 — customApiCall has no pagination (silently truncates at pageSize)  M11 — ticket.create: required fields not exposed (ticketPriorityId, partyId, ticketCategoryId)  M12 — user.getCurrent applies rootProperty postReceive but endpoint returns single object  M13 — purchaseInvoice.supplierId marked optional but required

### LOW

**L1** changeUnit response not unwrapped  **L2** purchaseInvoice.printLabel sends comma-string but API expects array  **L3** createShipment response shape undocumented  **L4** salesInvoice.list has no status quick-filter  **L5** simplify has no effect on shipment (not in SIMPLIFY_FIELDS)  **L6** PO create uses recipientIdFilter for list (should be supplierIdFilter)  **L7** ticket.markRead returns 404 (endpoint may not exist in this weclapp version)  **L8** article.updatePrices composite not wired  **L9** tag.create color field rejected by weclapp  **L10** weclapp webhook count always 0 (API quirk)

---

## 3. Systemic Patterns (3+ reports each — top fix priorities)

### Pattern A — `body: {}` routing anti-pattern (HIGH, 5+ reports: U01, U03, U05, U08, U12)

Every POST action specifying `body: {}` fails with weclapp 400 "body is not a json object". n8n sends Content-Type: application/json with serialized `{}`, which weclapp rejects on no-body endpoints. ~15 operations affected across 6 resources.

**Fix:** Remove the `body` key entirely from all action routing directives that send no payload.

---

### Pattern B — `filtersCollection` no routing → filters silently ignored (CRITICAL, 4 reports: U02, U08, U12, R07)

SharedFields.filtersCollection is a fixedCollection with no routing.send config. buildFilterParams() in GenericFunctions.ts is correct but unreachable (no execute() to call it). Every resource using this shared field silently drops all configured filters.

**Fix:** Add execute() method dispatching buildFilterParams() results as QS to weclappApiRequest, or redesign filter fields with individual routing.send.type:'query' entries.

---

### Pattern C — `displayOptions` on collection/fixedCollection children (CRITICAL, 4 reports: U07, U14, U16, R07)

n8n's "Max iterations reached!" parameter resolver crashes on displayOptions inside collection/fixedCollection children. Affected: SharedFields.filtersCollection.value (hide on null/notnull operators); TagUnitUserDescription.ts tagBody.name, unitBody.name, userBody.email, userBody.username, customAttributeDefinitionBody.* (all show on operation filter).

**Fix:** Remove ALL displayOptions from collection/fixedCollection children. Use parent-level displayOptions or separate parameter sets per operation.

---

### Pattern D — `simplify` default drops items (CRITICAL, confirmed U02, dead code in U13)

type:'filter' postReceive is used as a property picker. It operates on items (keeping/dropping whole items), not properties. $key is undefined in item-level context → always false → 0 items returned when simplify=true (the default).

**Fix:** Replace type:'filter' with type:'set' for property projection. Audit all resources using this pattern.

---

### Pattern E — `handleBinaryDownload` not wired (CRITICAL/HIGH, U01, U06, U12)

GenericFunctions.ts exports handleBinaryDownload() but it is never called (no execute() method). Binary operations either: have no routing at all (silent 0 items), use encoding:arraybuffer in the request block instead of output block (corrupts POST body), or return raw Buffer in json alongside binary.*.

**Fix:** Add execute() dispatch for binary download operations using handleBinaryDownload().

---

## 4. Rebuild Coverage Table

| Unit | Source Workflow | Source Nodes | Source HTTP Nodes | Rebuilt weclapp Nodes | HTTP→weclapp % | Exec Result |
|------|----------------|-------------|-------------------|-----------------------|----------------|-------------|
| R01 | LIVE-weclapp-Autopilot (neudorff) | 97 | 33 | 33 | 100% | PASS (exec 274, 428ms, 0 errors) |
| R02 | LIVE-weclapp-Price-SalesChannel-Sync (alango) | 26 | 6 | 2 | 33% | FAIL — weclappApi credential not registered |
| R03 | PIP rebuild | — | — | — | — | No report.md; rebuilt JSON only |
| R04 | Dispo rebuild | — | — | — | — | No report.md; rebuilt JSON only |
| R05 | Quotation-Slack rebuild | — | — | — | — | No report.md; rebuilt JSON only |
| R06 | weclapp-Auftragsworkflow (nunc) | 33 | 17 | 25 | 100% | BLOCKED (node not installed; static verification) |
| R07 | DEMO-Pulpo-Zone-Tag-Sync (localhost) | 7 | 2 | 5 | 100% | PARTIAL (tag.list PASS exec 292; article.list PARTIAL exec 277; tag.create FAIL) |

**R03/R04/R05:** Workers produced rebuilt workflow JSON files but no report.md. Execution status unknown.

**R01 key finding:** 100% conversion but 42% of nodes (14/33) fell back to customApiCall because the structured filter UI cannot express weclapp's native compound filter= expressions. A rawFilter escape-hatch field on List operations would eliminate most of these fallbacks.

**R06 key finding:** Discovered production bug in source workflow — 2 of 17 nodes use a Notion credential (evBmwjrUCNhrYTE2) instead of weclapp. Those nodes silently fail in production. Rebuild corrects this.

---

## 5. v0.2.0 MUST-fix List

Top 10 by severity × frequency × production impact. Cross-referenced against existing issues #29/#30/#31.

| Priority | Bug | Severity | Issue |
|----------|-----|----------|-------|
| 1 | filtersCollection routing missing — all list filters silently ignored | CRITICAL | new-issue A |
| 2 | displayOptions in collection children — blocks webhook workflows | CRITICAL | new-issue B |
| 3 | customApiCall has no routing → silent zero output | CRITICAL | #30 |
| 4 | WeclappTrigger.create() sends wrong weclapp webhook schema | CRITICAL | new-issue C |
| 5 | body:{} on POST actions → ~15 operations fail with 400 | HIGH | new-issue D |
| 6 | Party simplify=true drops all items (type:filter misuse) | CRITICAL | new-issue E |
| 7 | Ticket title→subject + status→ticketStatusId | CRITICAL | new-issue F |
| 8 | tag.create empty body (name param conflict) + customAttributeDefinition wrong field names | CRITICAL | new-issue G |
| 9 | Wrong status enums: SalesInvoice, PurchaseOrder, Party | HIGH | new-issue H |
| 10 | Binary ops not wired to handleBinaryDownload | HIGH | new-issue I |

---

## 6. New GitHub Issues

Filed for novel CRITICAL/HIGH bugs not covered by existing #29/#30/#31. See section below for created issue numbers.

- **new-issue A:** filtersCollection routing missing — all list filters silently ignored (systemic)
- **new-issue B:** displayOptions in collection/fixedCollection children crashes n8n resolver (blocks all webhook workflows)
- **new-issue C:** WeclappTrigger.create() sends wrong weclapp webhook schema (event, active fields don't exist)
- **new-issue D:** body:{} in action operation routing causes weclapp 400 (~15 operations, 6 resources)
- **new-issue E:** Party: simplify=true drops all items; wrong partyType enum; name→company field rename
- **new-issue F:** Ticket: title→subject rename + status→ticketStatusId FK (breaking field mapping errors)
- **new-issue G:** tag.create empty body (name param n8n conflict) + customAttributeDefinition wrong field names
- **new-issue H:** Wrong status enums: SalesInvoice (entire set wrong), PurchaseOrder (5 invalid values)
- **new-issue I:** Binary ops not wired — purchaseInvoice download/printLabel silent; encoding:arraybuffer corrupts POST; Buffer leaks to json

---

## 7. UX + API Quirk Observations

- **filtersCollection internal key is `filter` not `filterValues`** — non-obvious in programmatic workflow construction (U11)
- **weclapp webhook `count` always 0** even when result array has items — pagination logic unaffected but confusing (U15)
- **PDF operations return 404 on unprinted documents** — expected but undocumented in node UI (U04, U05, U12)
- **acceptQuotation creates linked salesOrder making quotation undeleteable** — weclapp 400 "links" (U07)
- **MCP health-check reports remote n8n URL** despite mcp-switch targeting localhost — multiple workers accidentally hit production n8n (U07, U10)
- **Webhook path cannot contain slashes** in localhost n8n — `qa/u14/tag` → 404; use `qa-u14-tag` (U08, U14, R07)
- **webhookId field required in node JSON** for production webhook registration via REST API (U01, U05, R07)
- **n8n If node typeVersion 2.3 + singleValue operator** fails to activate; downgrade to typeVersion 2 required (R02)
- **K15315 is a BOM article (not storable)** — QA plan referenced this for stock movement tests; use STORABLE articles (U09)
- **customApiCall has no pagination** — hard-coded page=1 silently truncates large result sets (R01, R02)
- **Cross-tenant workflows** cannot use single-credential declarative routing — requires sub-workflows or execute() with credential-switching (R02)
- **SplitOut nodes after weclapp list operations may be redundant** — weclapp.list already returns individual items via rootProperty extraction; needs live testing to confirm (R06)

---

## 8. Release Gating Recommendation

### MUST fix before v0.2.0 (release blockers — the node is effectively broken without these)

1. filtersCollection routing (C1) — all list filters broken
2. displayOptions in collection children (C2) — blocks webhook workflows
3. customApiCall routing (C3, #30) — silent zero output
4. body:{} on POST actions (H1) — ~15 operations fail with 400
5. Party simplify=true drops all items (C4)
6. WeclappTrigger.create() wrong schema (C5) — trigger node completely broken
7. Ticket title→subject + status→ticketStatusId (C6, C7)
8. tag.create empty body (C9)
9. customAttributeDefinition.create wrong field names (C8)
10. purchaseInvoice binary ops no routing (C10)

### SHOULD fix before v0.2.0

- Wrong status enums: SalesInvoice, PurchaseOrder, Party (H2, H4, H5)
- handleBinaryDownload wiring — binary ops broken/leaky (H9, M3)
- warehouseId in stock movement body → 400 (H6)
- party.create wrong name field → company (H3)
- additionalFields.properties field projection not sent (H8)
- comment.create entityName routing query vs body (H7)
- rawFilter escape-hatch on List operations (H10)

### CAN fix post v0.2.0

- All L-severity bugs (L1–L10)
- M-severity polish (M1–M13)
- customApiCall pagination (M10)
- simplify for shipment, ticket, comment resources
- salesInvoice status quick-filter dropdown
