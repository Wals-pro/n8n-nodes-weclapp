# Rebuild Report — R01 LIVE-weclapp-Autopilot

Date: 2026-04-17
Tester: QA worker R01 (coordinator agent)
n8n: localhost:5678 | weclapp tenant: testhandel
Branch: qa/r01-autopilot-rebuild

---

## Source Workflow

**Path:** `weclapp/tenant/neudorff/workflows/LIVE-weclapp-Autopilot.json`
**Production ID:** `f9ZcYZloQ0P4nYz1`
**Purpose:** Full shipment and invoice automation (Auftragsautopilot) — 8 parallel automation branches including address AI check, shipping carrier rule engine, shipment/delivery-note/return-label creation, Amazon FBA fulfillment, invoice creation and lifecycle.

### Source Node Counts

| Category | Count |
|----------|-------|
| Total nodes | 97 |
| `n8n-nodes-base.httpRequest` (weclapp) | 33 |
| Other nodes (Code, If, Set, SplitOut, Aggregate, Email, executeWorkflow, stickyNote, scheduleTrigger) | 64 |

---

## Rebuilt Workflow

**File:** `qa-reports/R01/rebuilt-autopilot.json`
**Deployed ID (test):** `r8OY9jMBWxagNjnO` (deleted after test)
**Credential:** `weclapp testhandel` (id `jebRfSixFZZxu8qH`)

### Rebuilt Node Counts

| Category | Count |
|----------|-------|
| Total nodes | 98 (+1 webhook trigger for test) |
| `n8n-nodes-weclapp.weclapp` nodes | 33 |
| `n8n-nodes-base.httpRequest` nodes | 0 |
| Other nodes (unchanged) | 65 |

**Reduction: 100% of HTTP Request nodes replaced (33/33).**

---

## weclapp Node Operations Used

| Operation | Count | Method |
|-----------|-------|--------|
| `customApiCall` GET (complex filters) | 14 | customApiCall |
| `salesOrder.update` | 7 | structured |
| `salesInvoice.update` | 4 | structured |
| `salesOrder.createSalesInvoice` | 1 | structured |
| `salesOrder.createShipment` | 1 | structured |
| `salesOrder.shipOrderForExternalFulfillment` | 1 | structured |
| `shipment.update` | 2 | structured |
| `shipment.createReturnLabels` | 2 | structured |
| `document.list` | 1 | structured |

Structured operations: 19/33 (58%) | customApiCall fallback: 14/33 (42%)

---

## Readability Assessment

Write/action nodes (update, createSalesInvoice, createShipment, createReturnLabels, shipOrderForExternalFulfillment) are more readable — operation intent is self-documenting without parsing URL templates. No URL construction bugs possible.

GET/list nodes had to stay on `customApiCall` because the source workflow uses weclapp's native boolean filter expressions (`filter=(status="X") and (customAttributeN=Y) and not (fulfillmentProviderId in [...])`) that the structured field/operator/value UI cannot express. This is the primary readability gap — 42% of nodes look similar to the original HTTP Request nodes.

---

## Bugs / Gaps Found

### [HIGH] Structured list operations cannot express weclapp multi-condition `filter=` expressions

The weclapp API supports `filter=(A) and (B) and not (C)` with `or`, `not`, custom attribute keys, null checks, and nested conditions. The node's structured filter UI only supports flat field/operator/value pairs. 14 of 33 nodes fell back to `customApiCall`.

**Suggested fix:** Add a `rawFilter` string escape-hatch field to all list operations.

### [MED] `customApiCall` has no pagination support

Source workflow used n8n HTTP Request's built-in pagination (`updateAParameterInEachRequest` mode). `customApiCall` has no equivalent — all 14 customApiCall list nodes are hard-coded to `page=1`. In production, multi-page result sets will be silently truncated at `pageSize` items.

**Suggested fix:** Add `returnAll` + pagination to `customApiCall`, or document that it requires a separate loop workflow pattern.

### [MED] Dynamic query parameter key expressions unverified

Node `weclapp get shipments` uses `=customAttribute{{ $json.attributeIdDisableAutoprocessing }}-eq` as a query param key (dynamic key expression). `customApiCall` accepts expressions in the `name` field — should work but could not be verified without live data with matching attribute IDs.

### [LOW] fixedCollection `filters` schema mismatch gives unhelpful activation error

Initial rebuild used `{"values": [...]}` (wrong) instead of `{"filter": [...]}` (correct fixedCollection option name). Activation error said `"Could not find property option"` without naming the offending node or field. Required trial-and-error to diagnose.

**Suggested fix:** n8n should report the node name and field in fixedCollection schema errors.

### [INFO] No composite ops needed

This workflow does not use `updatePrices`, `applyPayment`, or `document.upload`. The #30 composite-ops disable has no impact on this rebuild.

---

## Execution Result

| Field | Value |
|-------|-------|
| Deployed ID | `r8OY9jMBWxagNjnO` |
| Execution ID | `274` |
| Status | **success** |
| Trigger | POST `/webhook/qa/r01-autopilot` |
| Duration | 428ms |
| Nodes executed | 24 |
| Errors | 0 |

All 10 weclapp-node GET operations ran without errors. All returned empty result sets from testhandel (no matching data). SplitOut nodes halted downstream processing correctly. Write/action operations validated by successful activation (no schema errors). No data written to testhandel.

---

## Cleanup

- `r8OY9jMBWxagNjnO` deactivated and deleted from n8n
- No testhandel data created
- `qa-reports/R01/rebuilt-autopilot.json` preserved
- Source file unchanged
