# Smoke Test Report — U12 ProductionOrder

Date: 2026-04-17
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678  |  weclapp tenant: testhandel
Branch: qa/u12-production-order

---

## Operations tested

| Op | Result | Exec ID | Notes |
|----|--------|---------|-------|
| list | ✅ | 285 | 5 items returned (limit=5), `rootProperty` unwrap works, items have expected fields |
| list with filter (status-eq=STARTED) | ❌ | 272 | Filter UI accepted but silently ignored — returned CLOSED items, not STARTED |
| get | ✅ | 244 | ID=4394 retrieved correctly, all fields present |
| create | ✅ | 245 | QA-U12-TEST-002 created, status=ENTRY\_IN\_PROGRESS |
| update | ✅ | 252 | pickingInstructions set, PUT with ignoreMissingProperties=true works |
| delete | ✅ | 261 | `{deleted: true, id: "6423378"}` returned correctly |
| createPickingList (binary) | ❌ | 270 | 400 error: "body is not a json object" — `encoding: arraybuffer` corrupts the POST body |
| downloadLatestProductionOrderPdf (binary) | ⚠️ | 283 | API call succeeds, binary property `data` is populated correctly in n8n execution, but `json` output also contains raw `{type: "Buffer", data: [...]}` — Buffer object leaks into JSON output |

---

## Pre-flight findings (direct weclapp API)

- `createPickingList` requires `Content-Type: application/json` with `body: {}` — not binary-encoded body
- `createPickingList` and `downloadLatestProductionOrderPdf` work correctly when called with proper JSON body via curl
- `productionOrder` cannot be created with `status: null` (400) or `status: NEW` (400)
- Only `ENTRY_IN_PROGRESS` is accepted as the initial status on create — **the `createAdditionalFields.status` dropdown lists `NEW` as an option but weclapp rejects it**
- testhandel has 151 production orders; statuses observed: CLOSED (147), STARTED (3), DOCUMENTS\_PRINTED (1), CANCELLED (1)

---

## Bugs / friction found

### [CRITICAL] `createPickingList`: `encoding: arraybuffer` corrupts POST request body
- **Evidence**: exec 270; weclapp returns 400 `"body is not a json object"`. Direct curl with `-d '{}'` succeeds.
- **Root cause**: In `ProductionOrderDescription.ts`, `createPickingList` routing has `encoding: 'arraybuffer'` inside the `request` object. n8n's declarative routing applies this encoding to the outgoing body, converting it from JSON to a raw binary arraybuffer. weclapp then rejects the non-JSON body.
- **Fix**: Remove `encoding: 'arraybuffer'` from the `request` block. The arraybuffer encoding should only apply to response decoding, which the `binaryData` postReceive handler already handles. Use a separate `output.request.encoding` if the routing DSL supports it, or move this operation to an `execute()` handler using `handleBinaryDownload()` from GenericFunctions.

### [CRITICAL] `filtersCollection` is never sent to weclapp API
- **Evidence**: exec 272; list-filter with `status-eq=STARTED` filter returned CLOSED items (IDs 4394, 4483, 4558). Direct API call with `status-eq=STARTED` correctly returns only STARTED items.
- **Root cause**: The `filtersCollection` field in `SharedFields.ts` has no `routing` property. In n8n declarative routing, only fields with a `routing.send` or `routing.request.qs` configuration are translated to HTTP parameters. The `buildFilterParams()` function in GenericFunctions.ts exists but is never called because there is no `execute()` method.
- **Affected**: All resources using `filtersCollection` (productionOrder, article, party, salesOrder, purchaseOrder, purchaseInvoice, quotation, shipment, warehouse, warehouseStock, and others).
- **Fix**: Either (a) add routing `send` config to each filter sub-field (`field`, `operator`, `value`) that builds `field-operator=value` query params via a template expression, or (b) add an `execute()` method to `Weclapp.node.ts` that calls `buildFilterParams()` and passes results to `weclappApiRequest()`. Option (b) is the correct path because filters require dynamic key generation (`status-eq`, `productionOrderNumber-like`, etc.) which isn't expressible in static declarative routing.

### [MED] `downloadLatestProductionOrderPdf`: Buffer object leaks into `json` output
- **Evidence**: exec 283; `item.json = {type: "Buffer", data: [37,80,68,70,...]}` alongside correct `item.binary.data` with mimeType/fileType metadata.
- **Root cause**: The `binaryData` postReceive handler in n8n's declarative routing appears to set both the binary property AND leave the raw response buffer in the `json` field. This is a framework behavior issue that may affect all binary download operations using declarative routing.
- **Impact**: Downstream nodes reading `json.data` will get a useless byte array. Binary property (`binary.data`) is correct and usable — this is a cosmetic/UX issue but confusing.
- **Suggested workaround**: Move binary download operations to an imperative `execute()` handler using `handleBinaryDownload()` from GenericFunctions.ts, which correctly returns `{json: {}, binary: {data: binaryData}}` with an empty JSON object.

### [MED] `status: NEW` listed as valid create option but rejected by weclapp API
- **Evidence**: Direct API test: POST with `status: NEW` returns 400 `"production order cannot be created or updated with status NEW"`. Only `ENTRY_IN_PROGRESS` is accepted.
- **Root cause**: `PRODUCTION_ORDER_STATUS_OPTIONS` in `ProductionOrderDescription.ts` lists `NEW` as a valid status option for both create and update. weclapp enforces its own state machine — `NEW` is a system-assigned status and cannot be set via API.
- **Fix**: Remove `NEW` from the options array in `createAdditionalFields.status`, or add a UI note clarifying it cannot be set via API.

### [LOW] `list` returns single-item response via webhook (cosmetic)
- **Evidence**: Webhook response shows `{id: '4394', ...}` instead of `[{...}, {...}]`. The n8n execution correctly has 5 items (exec 285). This is Respond-to-Webhook behavior (returns first item JSON), not a node bug.
- **Impact**: Workflow builders testing via webhook may be confused. No action needed in the node itself.

---

## Cleanup

- 8 n8n test workflows created and deleted
- 1 testhandel production order created (QA-U12-TEST-002, ID=6423378) and deleted via the delete operation test
- 0 failed cleanups — all test data removed

---

## Execution IDs (for replay)

| Op | Exec ID | Status |
|----|---------|--------|
| list | 285 | success |
| list with filter | 272 | success (filter silently ignored) |
| get | 244 | success |
| create | 245 | success |
| update | 252 | success |
| delete | 261 | success |
| createPickingList | 270 | error |
| downloadLatestProductionOrderPdf | 283 | success |

---

## Summary

- 6/8 operations pass end-to-end
- 2 CRITICAL bugs: `filtersCollection` never sent (affects all resources), `createPickingList` body corrupted by `arraybuffer` encoding
- 1 MED cosmetic bug: Buffer leaks into JSON on binary downloads
- 1 MED UX bug: `status: NEW` listed but rejected by weclapp
- testhandel has production order data (151 orders) — full smoke coverage possible
- `fastProductionBooking` not tested (no suitable ENTRY\_IN\_PROGRESS order with BOM on testhandel)
