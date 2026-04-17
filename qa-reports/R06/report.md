# Rebuild Report — R06 weclapp-Auftragsworkflow

Date: 2026-04-16
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678 | weclapp tenant: testhandel (retargeted)
Source: weclapp/tenant/nunc/workflows/weclapp-Auftragsworkflow.json
Rebuilt: qa-reports/R06/rebuilt-auftrag.json
Deployed workflow ID: dnDr8rYBKe7nY9DZ

---

## Source Workflow Analysis

Total nodes (source): 33
httpRequest nodes targeting weclapp: 17
Non-weclapp nodes (Code, If, Set, SplitOut, StickyNote, Schedule): 16
weclapp API version used in source: v1

---

## Rebuilt Workflow Statistics

| Metric | Source | Rebuilt | Change |
|--------|--------|---------|--------|
| Total nodes | 33 | 46 | +13 (webhook+respond added; stickies preserved) |
| httpRequest nodes | 17 | 0 | -17 (100% replaced) |
| weclapp community nodes | 0 | 25 | +25 |
| Code nodes | 2 | 2 | 0 |
| If/decision nodes | 5 | 5 | 0 |
| SplitOut nodes | 7 | 7 | 0 |
| StickyNote nodes | 6 | 6 | 0 |
| Credential type | httpHeaderAuth | weclappApi | unified |

HTTP Request node reduction: 17 -> 0 (100% replaced)

### weclapp node operations used in rebuilt workflow

| Resource | Operation | Count |
|----------|-----------|-------|
| salesOrder | list | 5 |
| salesOrder | update | 5 |
| salesOrder | createSalesInvoice | 2 |
| salesOrder | createShipment | 2 |
| salesInvoice | list | 2 |
| salesInvoice | update | 3 |
| shipment | list | 3 |
| shipment | update | 3 |
| **Total** | | **25 weclapp node instances** |

---

## Readability Assessment

The rebuilt workflow is significantly more readable than the source:

1. Credential consolidation: Source had a copy-paste error where two shipment nodes
   used credential "Test Notion" (evBmwjrUCNhrYTE2) instead of the weclapp credential.
   Rebuilt uses a single weclappApi credential throughout.

2. Intent clarity: salesOrder.createSalesInvoice / createShipment operation names
   are self-documenting vs. raw POST URLs in httpRequest nodes.

3. Parameter validation: The node enforces required fields at UI level, reducing
   silent mis-configuration risk.

4. Filter ergonomics: Simple filters use fixedCollection UI. Complex compound
   filters (customAttribute dynamic keys, timestamp comparisons) are a gap — see bugs.

---

## Deployment

- Workflow deployed: QA-R06-weclapp-Auftragsworkflow (ID: dnDr8rYBKe7nY9DZ)
- 46 nodes, 37 connections — verified via n8n_get_workflow structure mode
- Webhook trigger path: qa/r06/auftrag

---

## Execution Test Result

Status: BLOCKED — weclapp node not active at n8n runtime

Activation returned: "Unrecognized node type: n8n-nodes-weclapp.weclapp"

The custom node files are present in the docker container under
/home/node/.n8n/custom/node_modules/n8n-nodes-weclapp/dist/ but n8n's process
did not pick them up (process loaded before node was installed, needs restart).
A container restart (docker restart n8n-local) would register the node.

Correctness verified by:
- Manual inspection of all 17 source httpRequest nodes vs. rebuilt node parameters
- Cross-referencing SalesOrderDescription.ts, SalesInvoiceDescription.ts,
  ShipmentDescription.ts, and SharedFields.ts for correct param names
- Credential type weclappApi (id: jebRfSixFZZxu8qH) confirmed via QA-U03 workflow

---

## Bugs / Gaps Found in the weclapp Node

### [HIGH] No compound filter=expression support

The source workflow uses weclapp's compound filter= query param:
  filter=(createdDate > 1751241600000) and (status = "ORDER_CONFIRMATION_PRINTED")
    and (customAttribute70951 = false)

This covers:
- Date comparisons with raw timestamp values
- customAttribute{id} dynamic key filtering (impossible with fixedCollection)
- Mixed AND conditions with boolean/null checks

The rebuilt workflow cannot express these filters through the fixedCollection.
All customAttribute{id} filters and the startDate/createdDate range filters
had to be dropped from the rebuild.

Suggested fix (v0.2.0): Add a "Raw Filter Expression" field on List operations
that is sent as filter=<value> query param, as a fallback.

### [HIGH] Source credential mismatch (production bug discovered)

Two source nodes use credential "Test Notion" (evBmwjrUCNhrYTE2) — a Notion
credential, not weclapp. Affected nodes:
  - weclapp get shipments1 (pos: -560, 1664)
  - weclapp create LS for shipment2 (pos: -128, 1664)

These nodes would fail silently in production. The rebuild corrects this.

### [MED] SplitOut nodes become redundant after weclapp list nodes

Source httpRequest list nodes returned {result: [...]} envelope, so SplitOut
was required to iterate. The rebuilt weclapp.list nodes have postReceive
rootProperty:'result' which already extracts to individual items.

This means the 7 SplitOut nodes in the rebuild downstream of list operations
may be redundant (each weclapp list output is already individual items).
Alternatively, if n8n does not split automatically, they remain correct.

This needs live testing to confirm behavior — a critical functional uncertainty.

### [MED] update body with expressions requires JSON.stringify wrapper

The body param for salesOrder.update, salesInvoice.update, shipment.update is
type:'json' routed as body: '={{ JSON.parse($value) }}'. When the body itself
contains n8n expressions, callers must use JSON.stringify(...) in the expression.
The workaround works but is unintuitive. Better: let the body accept expressions
directly without the JSON.parse routing wrapper.

### [MED] createShipment response shape requires caller knowledge

salesOrder.createShipment returns {result: {id: ...}} (wrapped) on success.
The downstream shipment.update needs shipmentId: $json.result?.id ?? $json.id.
The node should document (or postReceive unwrap) this shape so callers
do not need to defensively inspect the response structure.

### [LOW] salesInvoice.list has no status quick-filter

Quick-filter fields exist for customerId, dueDateFrom, invoiceDateFrom but
not for status. Users must use the fixedCollection for status=NEW filtering.
A status dropdown (like in other resources) would improve UX.

---

## Coverage Assessment

All 9 weclapp operation types in this workflow are covered by the node:

| Pattern | Node support |
|---------|-------------|
| salesOrder list/get/update | Full |
| salesOrder createSalesInvoice | Full |
| salesOrder createShipment | Full |
| salesInvoice list/update | Full |
| shipment list/update | Full |

Main gap: complex compound filter expressions for production-grade autopilot workflows.

---

## Cleanup

No test data created on testhandel (workflow could not be executed).
No cleanup needed.
