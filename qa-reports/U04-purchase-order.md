# Smoke Test Report — U04 PurchaseOrder

Date: 2026-04-17
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: n8n.srv980912.hstgr.cloud (remote, via MCP proxy) | weclapp tenant: testhandel

---

## Environment Notes

**Blocker: weclapp custom node not installed in n8n.**
Activation of any `n8n-nodes-weclapp.weclapp`-typed workflow fails with:
`"Unrecognized node type: n8n-nodes-weclapp.weclapp"`

This means PR3–PR5 from the QA sprint prerequisites (build dist/, install into docker n8n, verify
node appears in UI) have not been completed. As a result:

- n8n-node-layer tests were run using `n8n-nodes-base.httpRequest` workflows as a proxy.
- All weclapp API behavior was validated via direct `curl` to testhandel and/or via httpRequest
  workflows using the existing `weclapp Testhandel` (httpHeaderAuth) credential id `8bHdNWloST2RtUou`.
- Node code was verified by static inspection of `PurchaseOrderDescription.ts`.

**Additional infrastructure note:** `N8N_BLOCK_ENV_ACCESS_IN_NODE` is set on the remote n8n
instance — `$env.*` expressions in nodes are rejected. httpHeaderAuth credential must be used
instead of env vars.

---

## Operations Tested

| Op | Layer | Result | Notes |
|----|-------|--------|-------|
| list (100 items) | API + n8n/http | PASS | 399 POs on testhandel; 100 returned with pageSize=100 |
| list with filter `status-eq=CONFIRMED` | API + n8n/http | PASS | exec 1026465; all returned items are CONFIRMED |
| list with filter `status-eq=ORDER_CONFIRMATION_PENDING` | API | FAIL (expected) | weclapp returns 400 — invalid enum value for purchaseOrder. See bug B-02. |
| get by id | API + n8n/http | PASS | exec 1026498; PO 4242 returned with full fields |
| create | API | PASS | PO 6423203 (P1407) created; see bug B-01 re: recipientId placeholder |
| update | API | PASS | PUT with ignoreMissingProperties=true; version incremented correctly |
| delete | API | PASS | HTTP 204; subsequent GET returns 404 |
| downloadLatestPurchaseOrderPdf | API + n8n/http | PASS | exec 1026871; 59716-byte PDF on CONFIRMED PO 4242; requires prior PDF generation (404 on new POs without printed docs) |
| printLabel | API | PASS | HTTP 200; 37197-byte PDF returned for ORDER_ENTRY_COMPLETED PO |
| createIncomingGoods | API | EXPECTED FAIL | 400 "not possible to create incoming goods — purchase order not yet confirmed by supplier"; requires CONFIRMED status via proper workflow, not just status PUT |
| processDropshipping | API | EXPECTED FAIL | 409 "processDropshipping not possible" — requires dropshipping-type PO |
| node activation in n8n | n8n | FAIL (blocker) | `Unrecognized node type: n8n-nodes-weclapp.weclapp` — prerequisites PR3–PR5 not complete |

---

## Bugs / Friction Found

**B-01 [MED] — Create operation placeholder uses wrong field name `recipientId`**

In `PurchaseOrderDescription.ts` line 534, the `purchaseOrderData` field placeholder reads:
```
{"recipientId": "123", "purchaseOrderItems": [...]}
```
The actual weclapp PO API field is `supplierId` (not `recipientId`). Using `recipientId` in
the body returns `400 Validation failed: property recipientId is unknown`.

The field `recipientId` does appear as a read-only field on the PO record (it equals supplierId),
but it cannot be set on create/update. The `statusFilter` also incorrectly lists `recipientIdFilter`
in the List operation which queries `recipientId-eq` — this should be `supplierId-eq`.

Suggested fix: Change placeholder to `{"supplierId": "123", ...}` and rename `recipientIdFilter`
to `supplierIdFilter` with `supplierId-eq` as the query parameter.

Evidence: `curl POST /purchaseOrder {"recipientId": "2757"}` → `400: property recipientId is unknown`
`curl POST /purchaseOrder {"supplierId": "2757"}` → `201: id=6423203`

---

**B-02 [HIGH] — Status filter options are wrong for purchaseOrder**

`PurchaseOrderDescription.ts` defines these status options for the List filter:
```
CANCELLED, CONFIRMED, IN_PROCESS, NEW, ORDER_CONFIRMATION_PRINTED,
ORDER_ENTRY_COMPLETED, ORDER_ENTRY_IN_PROGRESS, PARTLY_RECEIVED, RECEIVED
```

The actual weclapp API allows (from 400 error response):
```
CANCELLED, CLOSED, CONFIRMED, ORDER_ENTRY_IN_PROGRESS,
ORDER_ENTRY_COMPLETED, ORDER_DOCUMENTS_PRINTED
```

Discrepancies:
- Listed in node but rejected by weclapp: `IN_PROCESS`, `NEW`, `ORDER_CONFIRMATION_PRINTED`, `PARTLY_RECEIVED`, `RECEIVED`
- Missing from node but valid in weclapp: `CLOSED`, `ORDER_DOCUMENTS_PRINTED`

Any user selecting `IN_PROCESS`, `NEW`, `PARTLY_RECEIVED`, or `RECEIVED` will get a 400 error.
`ORDER_CONFIRMATION_PRINTED` in the node collides with the valid `ORDER_DOCUMENTS_PRINTED` name.

Suggested fix: Replace status options with exactly: CANCELLED, CLOSED, CONFIRMED,
ORDER_DOCUMENTS_PRINTED, ORDER_ENTRY_COMPLETED, ORDER_ENTRY_IN_PROGRESS.

Evidence: `curl /purchaseOrder?status-eq=ORDER_CONFIRMATION_PENDING` →
`400: unknown enum value: ORDER_CONFIRMATION_PENDING; allowed: [CANCELLED, CLOSED, CONFIRMED,
ORDER_ENTRY_IN_PROGRESS, ORDER_ENTRY_COMPLETED, ORDER_DOCUMENTS_PRINTED]`

---

**B-03 [LOW] — downloadLatestPurchaseOrderPdf returns 404 on new/unprinted POs**

The endpoint returns 404 with `"no purchase order document found"` when no PDF has been generated.
This is correct weclapp API behavior (PDF is only available after the order has been printed).
However, the node gives no guidance on this prerequisite in its description.

Suggested fix: Add to the operation description: "PDF is only available after the purchase order
has been printed (status ORDER_DOCUMENTS_PRINTED or higher). Returns 404 if no document exists."

---

**B-04 [LOW] — createIncomingGoods and processDropshipping require specific PO states not documented**

`createIncomingGoods` requires the PO to have been confirmed by the supplier (status CONFIRMED via
proper business flow). Setting `status: CONFIRMED` via PUT alone is rejected.
`processDropshipping` requires the PO to be of dropshipping type.

Suggested fix: Add prerequisite notes to each operation's description.

---

**B-05 [MED] — n8n node not installed (prerequisite PR3–PR5 incomplete)**

The n8n-nodes-weclapp package is not installed in the docker n8n instance. This prevents any
workflow using `n8n-nodes-weclapp.weclapp` from activating. All functional testing for this
unit was performed via direct API + httpRequest proxy workflows.

This is a sprint-level prerequisite failure, not a node code bug. The node code itself is
syntactically correct (TypeScript compiles, description structure valid).

---

## Test Data Cleanup

| Resource | ID | Status |
|----------|----|--------|
| PO QA-U04-PO-001 (supplierId 2757) | 6423203 | DELETED (verified 404) |
| PO P1408 (supplierId 2757) | 6423362 | DELETED (verified 404) |
| Workflow QA-U04-purchaseOrder-list | 2Vif2s86JLR4yrMA | DELETED |
| Workflow QA-U04-purchaseOrder-via-http | xjXTBhQUYJpKtcru | DELETED |
| Workflow QA-U04-purchaseOrder-get | vJFbBrF8kqPXieMA | DELETED |
| Workflow QA-U04-purchaseOrder-create | z1wYgDKPVwEqSsyw | DELETED |
| Workflow QA-U04-purchaseOrder-pdf | qat83WQxIeABBsih | DELETED |

All test entities deleted. No manual cleanup needed.

---

## Execution IDs (for replay)

| Op | Workflow ID | Exec ID | Status |
|----|-------------|---------|--------|
| list + status filter (CONFIRMED) | xjXTBhQUYJpKtcru | 1026465 | success |
| get by id (PO 4242) | vJFbBrF8kqPXieMA | 1026498 | success |
| downloadLatestPurchaseOrderPdf (PO 4242) | qat83WQxIeABBsih | 1026871 | success |

All other operations tested via direct weclapp API (curl), not via n8n workflow execution.

---

## Static Code Analysis Findings

- `PurchaseOrderDescription.ts`: 16 operations defined, routing structure valid.
- `create` routing: `body: '={{JSON.parse($value)}}'` — correct pattern, will parse user-provided JSON.
- `update` routing: `PUT` with `ignoreMissingProperties=true` — correct.
- `delete` routing: `DELETE` with synthetic response `{deleted: true, id: ...}` — correct pattern.
- Binary operations (downloadLatestPurchaseOrderPdf, printLabel, createDropshippingDeliveryNotePdf):
  use `encoding: 'arraybuffer'` + `returnFullResponse: true` + `binaryData` postReceive — correct.
- `simplify` postReceive uses `recipientId` field name — this matches the read-only field that
  exists on the PO object (it IS present on GET responses), so simplify is technically correct
  for reads even though `supplierId` is the write field.
