# QA Report — R05v2: quotation-accepted-slack rebuild

**Date:** 2026-04-16
**Branch:** qa2/r05-quotation-slack
**n8n instance:** localhost:5678 (n8n 1.120.4)
**Node package:** n8n-nodes-weclapp @ v0.2.0-pre (worktree qa2/r05-quotation-slack)
**Workflow ID:** `UjNCEeyTDmiGTTHa`
**Workflow name:** `QA2-R05-quotation-accepted-slack`
**Credential:** weclappApi `testhandel` (id `vBabVqjOHglitxCo`) — tenant `testhandel.weclapp.com`

---

## Goal

Replace the old Webhook+polling trigger pattern in `LIVE-quotation-accepted-slack.json` with the new `WeclappTrigger` node (`entityName=quotation`, `events=[updated]`) now that F9 (fix/59-trigger: WeclappTrigger atCreate/atUpdate/atDelete schema) is merged into main.

---

## Structural changes vs source

| Removed | Reason |
|---|---|
| `Webhook Trigger` node | Replaced by WeclappTrigger |
| `Respond 200 OK` | WeclappTrigger uses `responseMode: onReceived` — handles 200 itself |
| `Set event context` | WeclappTrigger spreads payload at `$json` root (`entityId`, `entityName`, `type`) — no mapping needed |

| Added | Reason |
|---|---|
| `weclapp Trigger` (weclappTrigger) | Primary trigger — `entityName: quotation`, `events: [updated]` |
| `Webhook (manual test)` | Secondary trigger for manual QA execution (POST `/qa2-r05-quotation-slack`); outputs same field shape |

| Converted | Before | After |
|---|---|---|
| `weclapp get quotation full` | HTTP Request node with `httpHeaderAuth` | `weclapp` node: `resource: quotation, operation: get` |
| `weclapp get opportunity` | HTTP Request node with `httpHeaderAuth` | `weclapp` node: `resource: customApiCall, operation: call, method: GET, entityPath: opportunity` |
| `weclapp flag notification sent` | HTTP Request node with `httpHeaderAuth` | `weclapp` node: `resource: customApiCall, operation: call, method: PUT, entityPath: quotation` |
| Slack nodes | `Slack` nodes (OAuth) | `STUB` Set nodes (no Slack cred available in QA instance) |

All downstream credential references changed from `httpHeaderAuth` id `fMCBUhi1ve4MoHJ3` (Weclapp Prod) to `weclappApi` id `vBabVqjOHglitxCo` (testhandel).

entityId extraction changed from `$json.body.entityId || $json.query.entityId` to `$json.entityId` (WeclappTrigger output shape).

---

## BUG-R05-01 (BLOCKER): n8n 1.120.4 activation crash

**Symptom:** `POST /api/v1/workflows/UjNCEeyTDmiGTTHa/activate` returns HTTP 500 after ~30 s timeout. n8n process crashes and must be restarted.

**Root cause:** n8n 1.120.4 `generateNodesGraph` (telemetry) calls `getNodeParameters` on every node in the workflow. The `weclapp get opportunity` node uses `resource: customApiCall`, which renders `CustomApiDescription.ts`'s `queryParameters` fixedCollection field. The n8n 1.120.4 `getParameterResolveOrder` enters an infinite dependency resolution loop on this fixedCollection (nested multipleValues collection with default `{}`) and throws:

```
Could not resolve parameter dependencies. Max iterations reached!
```

This propagates as an unhandled exception that kills the n8n process.

**Evidence that WeclappTrigger itself is NOT the cause:**
QA2-U16-WeclappTrigger-Smoke (id `EJmhVgqCkM2mj3vA`) activated successfully. The crash is specific to workflows containing `customApiCall` + the fixedCollection `queryParameters` field.

**Fix required:** In `CustomApiDescription.ts`, change `queryParameters` fixedCollection `default` from `{}` to `{ parameter: [] }`, or restructure to avoid triggering the infinite loop in `getParameterResolveOrder`. Track as separate issue against CustomApiDescription / fixedCollection behavior on n8n 1.120.4.

**Impact on this QA cycle:** Activation blocked — webhook cannot be registered — end-to-end execution test via WeclappTrigger route not completed.

---

## Manual webhook test (partial)

The `Webhook (manual test)` trigger was tested via the n8n test-webhook URL. This confirms the downstream logic (IF guards, Code node, flag-sent node construction) is structurally correct. Full end-to-end via WeclappTrigger path requires BUG-R05-01 to be resolved first.

---

## Credential note

The `weclappApi` credential type is a community node type not in the n8n public API schema whitelist. `n8n_manage_credentials` (MCP) cannot create it — error: "type is not a known type". Credential was created via direct `POST /api/v1/credentials` with `allowedDomains: ""` field.

---

## Result

| Check | Status |
|---|---|
| WeclappTrigger node present with `entityName=quotation, events=[updated]` | PASS |
| `Respond 200 OK` removed | PASS |
| `Set event context` mapping removed | PASS |
| All httpRequest nodes converted to weclapp nodes | PASS |
| Downstream IF guards use `$json.entityId` (no path change needed) | PASS |
| Dual-trigger wiring (WeclappTrigger + manual Webhook -> Constants) | PASS |
| Workflow deployed to localhost:5678 | PASS |
| Workflow activation | FAIL -- BUG-R05-01 |
| End-to-end WeclappTrigger execution | BLOCKED |

**Overall: CONDITIONAL PASS** -- rebuild structurally complete and deployed. Activation blocked by pre-existing bug in CustomApiDescription fixedCollection, not by WeclappTrigger node itself.
