# Smoke Test Report — U08 Shipment

Date: 2026-04-17
Tester: coordinator agent
n8n: localhost:5678 | weclapp tenant: testhandel

## Operations tested

| Op | Result | Notes |
|----|--------|-------|
| list | ✅ | 10 shipments returned; exec 276 |
| list with filter `status-eq=SHIPPED` | ⚠️ PARTIAL | Node ran without error (exec 222) but filter had NO effect — returned 10 items including CANCELLED shipments alongside SHIPPED ones. See Bug #1. |
| get by id | ✅ | Shipment id=3982, status=SHIPPED, shipmentNumber=1001; exec 238 |
| create | ✅ | QA-U08-Testrecipient shipment id=6423391 created; required fields: `shipmentType` + `destinationStoragePlaceId`; exec 253 |
| update | ✅ | packageWeight set to 5.00 (stored as "5" by weclapp); exec 265 |
| delete | ✅ | Shipment 6423391 deleted, `{deleted: true, id: "6423391"}` returned; 404 confirmed via direct API check; exec 282 |
| createPickingList (binary PDF) | ❌ | Error: weclapp returned "body is not a json object" (HTTP 400); exec 271. See Bug #2. Direct curl to testhandel API returns 200 + 60KB PDF. |
| downloadLatestDeliveryNotePdf (binary) | ✅ | 57.9 kB PDF returned, mimeType=application/pdf; exec 278 |
| downloadLatestPickingListPdf (binary) | ✅ | 60.7 kB PDF returned, mimeType=application/pdf; exec 286 |

## Bugs / friction found

### Bug #1 — HIGH: `filtersCollection` on shipment list has no routing; filter UI is silently ignored

The `filters` fixedCollection (from `SharedFields.filtersCollection`) is declared in `ShipmentDescription.ts` without any `routing` block. In n8n declarative routing, a fixedCollection without routing does not append query-string parameters — the values are collected but never sent. When `status-eq=SHIPPED` was passed via the `filters.filter` array, the actual request to weclapp had no filter parameter and returned all 20 shipments (SHIPPED + CANCELLED), not just the 10 SHIPPED ones.

Same issue likely exists on all other resources that use the bare `filtersCollection` spread (party, article, purchaseOrder, etc.).

Evidence: execution 222, 10 items returned, statuses={'SHIPPED', 'CANCELLED'}. Direct testhandel call with `?status-eq=SHIPPED` returns 17 items all SHIPPED.

Suggested fix: Add a `routing` block to `filtersCollection` in `SharedFields.ts` using `send.type: 'query'` with a custom value expression, or add a `postReceive`/`preSend` hook via the node's `execute` method to build filter params from the collected values. Compare to how `partyTypeFilter` on party resource correctly adds `routing: { send: { type: 'query', property: 'partyType-eq', value: '={{...}}' } }`.

### Bug #2 — HIGH: `createPickingList` routing sends empty `body: {}` with `encoding: arraybuffer`, causing weclapp 400 "body is not a json object"

In `ShipmentDescription.ts`, the `createPickingList` routing is:
```
routing: {
  request: {
    method: 'POST',
    url: '=/shipment/id/{{$parameter["shipmentId"]}}/createPickingList',
    body: {},
    encoding: 'arraybuffer',
  },
  output: { postReceive: [{ type: 'binaryData', ... }] }
}
```

n8n sends the request with `Content-Type: application/json` and an empty JSON body `{}`. weclapp's createPickingList endpoint expects either no body or a specific format — it rejects `{}` with 400 "body is not a json object". The direct curl to testhandel using `curl -d '{}'` returns 200; however the node produces a 400 error, suggesting n8n processes the `body: {}` differently (possibly double-serialized or sent as arraybuffer alongside JSON headers).

Evidence: exec 271 error detail = "body is not a json object". Direct API call `curl -X POST .../createPickingList -d '{}'` → HTTP 200 + 60KB PDF.

The `downloadLatestPickingListPdf` (a GET with no body) works perfectly, returning the same PDF.

Suggested fix: Remove `body: {}` from the `createPickingList` routing. The POST action endpoint takes no body. Alternatively, if a body is needed, set `body: undefined` or omit the `body` key entirely.

Note: This same pattern is used in `createReturnLabels` and `createShippingLabels` — those likely have the same bug.

### Bug #3 — LOW: Create shipment requires `shipmentType` and `destinationStoragePlaceId` but these are not documented in the node UI

The `create` operation uses a freeform JSON `body` field with no guided sub-fields. Two fields are required by weclapp API validation — `shipmentType` (e.g. `CONSIGNMENT`) and `destinationStoragePlaceId` (warehouse storage place ID) — but there are no UI hints. Users get a 400 validation error with no guidance on what to supply.

Suggested fix (MED priority): Add dedicated required fields for `shipmentType` (options dropdown: CONSIGNMENT, DELIVERY, etc.) and `destinationStoragePlaceId` (string, with help text pointing to storage place lookup).

### Observation — INFO: `simplify` does nothing for `shipment` resource

`simplify: true/false` on `get` and `list` returns identical output. Looking at `GenericFunctions.ts`, `SIMPLIFY_FIELDS` only defines simplification for `article`, `party`, and `salesOrder`. Shipment is not in the map, so `simplifyEntity` passes through unchanged. The Simplify toggle is visible but has no effect.

Suggested fix (LOW): Add shipment to `SIMPLIFY_FIELDS` (suggested fields: `id`, `shipmentNumber`, `status`, `shipmentType`, `recipientPartyId`, `picksComplete`, `version`).

## Webhook path format note

n8n requires a `webhookId` property on the Webhook node (matching the `path` value) for production webhooks to register. Without it, the webhook stays active in the DB but is not routed. Paths cannot contain slashes (e.g. `qa/u08/list` fails; `qa-u08-list` works).

## Cleanup

- Created 1 test shipment (id=6423391); confirmed deleted via direct API check (404).
- 9 test workflows created and deleted successfully.
- No residual test data on testhandel.

## Execution IDs (for replay)

| Op | Workflow ID | Exec ID | Status |
|----|-------------|---------|--------|
| list | tNeRJPsYnZoaYgcK | 276 | success |
| list+filter | ipWAdM2eN4SUCcOp | 222 | success (filter ineffective) |
| get | SrWrsz7gELixbt1T | 238 | success |
| create | SmzjUGQeBUeamBGT | 253 | success |
| update | TY6NNjiOdb0Pvlhk | 265 | success |
| delete | DOsBgM7LR2RvKlxK | 282 | success |
| createPickingList | 99mlRccJSa6D9zce | 271 | error (Bug #2) |
| downloadLatestDeliveryNotePdf | AYXr517ZFIPBIPEo | 278 | success |
| downloadLatestPickingListPdf | zldsnRvhNyR98Jny | 286 | success |
