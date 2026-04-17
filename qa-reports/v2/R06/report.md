# QA Report — R06v2 weclapp-Auftragsworkflow Rebuild

Date: 2026-04-17
QA round: v2 (against v0.2.0-pre / main @ 6d4ee87)
n8n: n8n.srv980912.hstgr.cloud
Source: weclapp/tenant/nunc/workflows/weclapp-Auftragsworkflow.json
Rebuilt: qa-reports/v2/R06/rebuilt-auftrag.json
Deployed workflow ID: mRa1G1R9ABMaKwqh
Credential: jebRfSixFZZxu8qH (weclapp testhandel)

---

## v0.2.0-pre Delta vs v1 baseline

| PR | Fix |
|----|-----|
| #57/#58/#29 | filters preSend routing — filters now sent to weclapp API |
| #64 | Correct status enums on salesInvoice/salesOrder |
| #60 | Remove body:{} from empty-body POST actions |
| #65 | Binary routing (prepareBinaryData postReceive) |
| #63 | tagName/unitName/userName rename + customAttr create body |
| #62 | Ticket subject/ticketStatusId mapping |
| #61 | party ORGANIZATION/PERSON partyType |
| #30 | Hybrid customOperations dispatcher for composite ops |
| #59 | Trigger POST /webhook body schema |

HIGH gap from v1: compound filter=expression — STILL OPEN in v0.2.0-pre.

---

## Node Count Summary

| Metric | Source | v1 Rebuild | v2 Rebuild |
|--------|--------|-----------|-----------|
| Total nodes | 33 | 46 | 45 |
| httpRequest nodes | 17 | 0 | 0 |
| weclapp community nodes | 0 | 25 | 25 |
| SplitOut nodes | 7 | 7 | 0 (-7) |
| Code nodes | 2 | 2 | 2 |
| If/decision nodes | 5 | 5 | 5 |
| StickyNote nodes | 6 | 7 | 6 |
| Webhook+Respond | 0 | 2 | 2 |

---

## v2 Structural Improvements vs v1

### 1. SplitOut nodes eliminated (7 removed)

v1 kept all 7 SplitOut nodes downstream of list operations.
v2 removes them: all three list resources (salesOrder, salesInvoice, shipment)
have postReceive rootProperty:'result' which already unwraps to individual items.
Confirmed by code inspection of all three Description files.

### 2. If node semantics fixed

v1 checked $json.result.length === 0 (wrong — rootProperty postReceive already
unwrapped the envelope, so .result no longer exists on individual items).

v2 checks $json.id emptiness using the unary empty operator (singleValue: true).
Nodes with alwaysOutputData: true output {} when list returns 0 items.

Affected: "If no shipment exists", "If no invoice exists", "If no shipment exists1"

### 3. Goodie check logic corrected

v1: shouldAddGoodie = $input.first().json.result?.length === 0
v2: shouldAddGoodie = !$input.first().json.id
Uses alwaysOutputData: true on goodie-search node so Code always runs.

### 4. Constants node (renamed from "Edit Fields")

All $('Edit Fields') references updated to $('Constants') per project standards.

### 5. F1 limit routing applied

"weclapp check customer goodie orders": limit=1 (existence check, not pagination).
"weclapp get salesOrder invoices": limit=1 (existence check).

### 6. Source production credential bug fixed

Source "weclapp get shipments1" + "weclapp create LS for shipment2" used
credential "Test Notion" (evBmwjrUCNhrYTE2 — Notion, not weclapp).
Both corrected to weclappApi jebRfSixFZZxu8qH.

---

## Deployment

Workflow ID: mRa1G1R9ABMaKwqh — 45 nodes, 30 connections
Webhook path: qa2/r06/auftrag

---

## Execution Test Result

Status: BLOCKED — same root cause as v1

  "Unrecognized node type: n8n-nodes-weclapp.weclapp"

Cloud n8n instance does not have the package installed server-side.
Workflow JSON passed structural validation (created successfully).

---

## Bugs / Gaps Found (v0.2.0-pre)

### [HIGH] No compound filter=expression support — STILL OPEN

Source uses weclapp compound filter= query param:
  filter=(createdDate > 1751241600000) and (status = "ORDER_CONFIRMATION_PRINTED")
        and (customAttribute70951 = false)

Covers: timestamp range, customAttribute{id} dynamic-key filtering, mixed AND.
filtersCollection (#57 fix) handles individual field-op=value params but cannot
express the weclapp compound filter= syntax.

Without createdDate/startDate filter: cold-start could process orders older than
configured startDate. The workflow relies on weclapp-side boolean flags to skip
already-processed orders — compound filter would be a safety net.

Suggested fix: add a filterExpression string field on List operations sent as
filter=<value> raw query param.

### [MED] createShipment response wrapping

salesOrder.createShipment returns {result: {id: ...}} (wrapped).
Downstream shipment.update uses: $json.result?.id ?? $json.id
Node should postReceive-unwrap or document this shape clearly.

### [MED] alwaysOutputData + list postReceive untested live

The alwaysOutputData: true + If($json.id empty) pattern is new in v2.
Structurally correct but needs live runtime confirmation once package is installed.

### [LOW] salesInvoice.list has no status quick-filter

Requires fixedCollection workaround (status enum values correct post-#64).

---

## Coverage Assessment

| Pattern | Node support | v0.2.0-pre status |
|---------|-------------|-------------------|
| salesOrder list | Full | filters routing fixed (#57) |
| salesOrder update | Full | ok |
| salesOrder createSalesInvoice | Full | empty-body fix (#60) |
| salesOrder createShipment | Full | empty-body fix (#60) |
| salesInvoice list | Full | status enum correct (#64) |
| salesInvoice update | Full | ok |
| shipment list | Full | ok |
| shipment update | Full | ok |

Main remaining gap: compound filter expressions for autopilot-grade filtering.
