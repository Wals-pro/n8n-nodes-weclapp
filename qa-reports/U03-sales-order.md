# QA Smoke Report — U03: Sales Order

**Node:** `n8n-nodes-weclapp` (local dev build)  
**n8n version:** 1.120.4 (localhost:5678)  
**Tenant:** testhandel (weclapp sandbox)  
**Credential:** `jebRfSixFZZxu8qH` (weclapp testhandel)  
**Date:** 2026-04-17  
**Worker:** U03

---

## Test Setup

- All tests run via minimal 2-node workflows: `Webhook → weclapp`
- Webhook nodes use `webhookId = path` for clean URL registration
- Test order created with commission prefix `QA-U03-`, article K15315 (id=3191), customer id=2931
- Created order id: `6423451` (orderNumber: 20493), deleted after tests
- All 9 test workflows deleted post-run

---

## Results Summary

| # | Operation | Status | Notes |
|---|-----------|--------|-------|
| 1 | list (returnAll=true) | PASS | 100 orders returned, exec 333 |
| 2 | list + filter (status=ORDER_ENTRY_IN_PROGRESS) | PASS | 1 order returned, filter param sent correctly |
| 2a | list + filter (status=OPEN) | N/A (invalid) | `OPEN` is not a valid weclapp salesOrder status; node sent param correctly but weclapp silently ignored it — not a node bug |
| 3 | get (by id) | PASS | id=6423451, orderNumber=20493, commission=QA-U03-COMMISSION-001 |
| 4 | create | PASS | id=6423451 created; body param correctly sent via `JSON.parse($value)` |
| 4a | create (initial attempt) | FAIL (data) | Used `salesOrderItems` — correct weclapp field name is `orderItems` |
| 5 | update (commission) | PASS | commission updated to QA-U03-COMMISSION-UPDATED |
| 6 | delete | PASS | Response: `{"deleted": true, "id": "6423451"}` |
| 7 | downloadLatestOrderConfirmationPdf | PASS (expected 404) | 404 returned — correct; no PDF generated for new ORDER_ENTRY_IN_PROGRESS order |
| 8 | resetTaxes | FAIL (node bug) | weclapp returns 400 "body is not a json object" — see Bug #1 |
| 9 | calculateSalesPrices | PASS (routed correctly) | Node routed correctly; 400 from weclapp: "item unit prices are disabled for some items" — weclapp business rule on K15315, not a node bug |

---

## Bugs Found

### Bug #1 — `resetTaxes` (and likely other no-body actions): `body: {}` causes 400

**Severity:** Medium  
**Operation:** `resetTaxes` (and all other action operations that declare `body: {}` in their routing)

**Root cause:** The `resetTaxes` routing directive in `SalesOrderDescription.ts` includes `body: {}`:

```typescript
routing: {
  request: {
    method: 'POST',
    url: '=/salesOrder/id/{{$parameter.salesOrderId}}/resetTaxes',
    body: {},
  },
},
```

weclapp rejects this with HTTP 400 `{"title":"invalid json","detail":"body is not a json object"}`. weclapp expects POST with no body at all (or a `Content-Type` that signals no body). n8n sends the request with `Content-Type: application/json` and an empty JSON object `{}`, which weclapp's JSON parser cannot map to the expected schema.

**Affected operations (any that use `body: {}` in routing):** `resetTaxes`, `cancelOrManuallyClose`, `activateProjectView`, `createAdvancePaymentRequest`, `createPartPaymentInvoice`, `createPerformanceRecord`, `createPrepaymentFinalInvoice`, `createReturnLabels`, `createShippingLabels`, `manuallyClose`, `recalculateCosts`, `shipOrderForExternalFulfillment`, `toggleProjectTeam`, `toggleServicesFinished`, `updatePrices`

**Fix:** Remove `body: {}` from the routing directive (or omit the `body` key entirely). Compare with `setCostsForItemsWithoutCost` which correctly omits `body`:

```typescript
// CORRECT pattern (no body):
routing: {
  request: {
    method: 'POST',
    url: '=/salesOrder/id/{{$parameter.salesOrderId}}/resetTaxes',
    // no body key
  },
},
```

---

## Node Architecture Findings

- **Purely declarative** — no `execute()` method; all routing via `INodeProperties` routing directives
- **Filter params:** `buildFilterParams()` correctly converts `{filter: [{field, operator, value}]}` to `field-operator=value` query params
- **Body param:** `body` field uses `routing.request.body: '={{ JSON.parse($value) }}'` — correctly parses JSON string into request body
- **Delete post-receive:** Returns `{"deleted": true, "id": "..."}` via `set` post-receive — correct
- **PDF operation:** Uses `encoding: arraybuffer` — correct pattern; 404 for unprinted orders is expected

---

## Cleanup

- All 9 test workflows deleted from localhost:5678
- Test salesOrder id=6423451 deleted from testhandel tenant (exec 338)
