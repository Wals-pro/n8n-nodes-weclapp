# QA2-R04 — Dispo Tool Rebuild Report
**Date:** 2026-04-17
**Branch:** `qa2/r04-dispo`
**Target node version:** v0.2.0-pre (main @ 6d4ee87)
**Source workflow:** `LIVE-weclapp-Dispo-Tool.json` (neperformances tenant)
**Rebuilt workflow ID:** `A0wcC9zLFjVxbiT2` (localhost:5678)
**Prefix:** `QA2-R04-`

---

## Summary

Re-QA of the Dispo Tool rebuild against v0.2.0-pre. The rebuild is structurally identical to v1 QA-R04 but validated against the new node schema (fixes #57/#58/#59/#60/#61/#62/#63/#64/#65/#29/#30/#31).

**Source:** 14 nodes, 5 weclapp HTTP Request nodes
**Rebuilt:** 13 nodes, 4 weclapp community nodes (salesOrder:list, article:list, 2x customApiCall)
**Eliminated:** 2 Split Out nodes (replaced by returnAll:true on list ops)

---

## Node Mapping

| Source | Rebuilt | Notes |
|---|---|---|
| Schedule Trigger | Webhook (QA) | manual test trigger |
| Edit fields Constants | Constants (Set) | weclappTenant=testhandel |
| weclapp get salesOrders (HTTP) | salesOrder:list | returnAll=true, filtersCollection |
| weclapp get articles (HTTP) | article:list | returnAll=true, filtersCollection |
| Split Out x2 | eliminated | returnAll removes need |
| Code aggregate | Code aggregate | unchanged |
| Edit Fields set default | Edit Fields set default | unchanged |
| Merge | Merge | unchanged |
| weclapp put articles (HTTP) | customApiCall PUT | gap workaround (see below) |
| Schedule Trigger2 | Webhook MRP (QA) | manual test trigger |
| Edit fields Constants1 | Constants MRP (Set) | |
| weclapp POST deleteAllRequisitions | customApiCall POST | |
| weclapp POST startMaterialPlanningRun | customApiCall POST | |

Added (QA-only): Code node pre-computing international category 4x multiplier before PUT.

---

## v0.2.0-pre Fixes Applied

**F1 — Filter routing (#57/#58):** Both list nodes use filtersCollection with filtersPreSend; operators use correct suffixes (-ge, -in, -notnull, -eq).

**F5 and other fixes:** Not applicable to Dispo Tool.

---

## Gaps

### [HIGH — OPEN] article.update missing minimumStockQuantity + tags
Confirmed still absent in v0.2.0-pre ArticleDescription.ts updateBody (only: active, articleNumber, articleType, description, ean, name, unitId).

**Workaround:** Code node pre-computes `computedMinStock`, then customApiCall does `PUT /article/id/{id}?ignoreMissingProperties=true` with `requestBody: JSON.stringify({ minimumStockQuantity: $json.computedMinStock })`.

**Fix needed:** Add `minimumStockQuantity` (number) to updateBody options in ArticleDescription.ts with routing to body property.

### [INFRA — BLOCKER] SQLite instability prevents execution testing
n8n-local crashes repeatedly (`SQLITE_MISUSE: Database handle is closed`, `SQLITE_CONSTRAINT: NOT NULL constraint failed: workflow_entity.active`). Workflows activate but in-memory webhook registry is lost on restart. Webhook DB entry IS correctly written (`A0wcC9zLFjVxbiT2/webhook/qa2-r04-dispo`) but n8n cannot serve it. This is the same infra blocker from PR #36 (previously misattributed to N8N_NODES_ADDITIONAL_PACKAGES; actual cause is SQLite concurrency).

---

## Deployment Status

- Workflow ID: `A0wcC9zLFjVxbiT2`
- Active: Yes
- Webhook: `POST /webhook/qa2-r04-dispo` (dispo), `POST /webhook/qa2-r04-mrp` (MRP)
- Node installed: n8n-nodes-weclapp@0.1.0

## Execution Results

| Test | Result |
|---|---|
| Deployed to localhost:5678 | PASS |
| active:true in API | PASS |
| Webhook DB entry correct | PASS |
| Webhook HTTP trigger | BLOCKED (SQLite instability) |
| End-to-end execution | BLOCKED |

## Remaining Actions

1. Fix `article.update` — add minimumStockQuantity to ArticleDescription.ts updateBody
2. Fix n8n-local SQLite instability (WAL mode or switch to Postgres)
3. Re-run execution test once infra stable
