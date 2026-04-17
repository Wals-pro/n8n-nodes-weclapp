# QA R02 — Rebuild: Price SalesChannel Sync

**Worker:** R02 of 25
**Date:** 2026-04-16
**Branch:** `qa/r02-price-sync-rebuild`
**Deployed workflow ID:** `DegajfMJJ3XKZOJD` (local docker n8n, http://localhost:5678)
**Test executions:** 293, 311

---

## Source Workflow

**Path:** `weclapp/tenant/alango/workflows/LIVE-weclapp-Price-SalesChannel-Sync.json`
**Total nodes:** 26 (including 1 stickyNote)
**HTTP Request nodes (weclapp calls):** 6

| # | Node name | Method | Endpoint |
|---|-----------|--------|----------|
| 1 | GET salesChannel activeSalesChannels | GET | `/salesChannel/activeSalesChannels?pageSize=...` |
| 2 | GET articles | GET | `/article?...` (paginated, pageSize=1000) |
| 3 | weclapp PUT article prices | PUT | `/article/id/{articleId}?ignoreMissingProperties=true` |
| 4 | AH GET salesChannel activeSalesChannels | GET | `/salesChannel/activeSalesChannels` (Alpenhammer tenant) |
| 5 | AH GET articles | GET | `/article?...` (Alpenhammer tenant) |
| 6 | AH PUT article prices | PUT | `/article/id/{articleId}?ignoreMissingProperties=true` (Alpenhammer) |

The workflow has two parallel paths: main Alango path (nodes 1-3) and cross-tenant Alpenhammer path (nodes 4-6) using separate credentials.

---

## Rebuilt Workflow

**Path:** `qa-reports/R02/rebuilt-price-saleschannel-sync.json`
**Total nodes:** 14 (stickyNote removed)
**weclapp community nodes:** 2 (both `customApiCall` resource)
**HTTP Request nodes retained:** 0
**Alpenhammer path:** Dropped (cross-tenant path out of scope for single-credential rebuild)

### Nodes rebuilt with the weclapp community node

| Source node | Rebuilt as | Resource | Operation |
|-------------|------------|----------|-----------|
| GET salesChannel activeSalesChannels | Get Active Sales Channels | `customApiCall` | GET `/salesChannel/activeSalesChannels` |
| GET articles | Get Articles | `customApiCall` | GET `/article` (paginated) |

### Nodes NOT rebuilt (primary blocker)

| Source node | Reason |
|-------------|--------|
| weclapp PUT article prices | `article.updatePrices` composite blocked — see Primary Blocker section |
| AH GET/PUT nodes (3 nodes) | Alpenhammer path dropped |

**Rebuild coverage:** 2 of 6 weclapp HTTP calls rebuilt (33%). 0 of 2 write operations rebuilt.

---

## Primary Blocker: `article.updatePrices` Composite (Issue #30)

`ArticleDescription.ts` lists `updatePrices` in the operation dropdown but the operation has **no `routing.request` property** — the declarative routing engine cannot handle it.

`articlePriceSync.ts` exports `executeUpdatePrices(input: UpdatePricesInput)` with the correct GET-then-PUT logic, but `Weclapp.node.ts` has **no `execute()` method** to call it. When a user selects `operation: updatePrices`, n8n falls through to the declarative router which finds no routing config and returns empty. The price PUT never fires.

**Impact:** The price-update step cannot be rebuilt with the community node until issue #30 is resolved. The rebuilt workflow replaces both PUT nodes with a NoOp placeholder. The "Code build target prices" node runs in dry-run mode — it computes the `requestBody` but does not PUT.

---

## Secondary Blocker: `weclappApi` Credential Type Not Registered (PR4 Prerequisite Gap)

Both test executions (293, 311) failed with HTTP 404 at the weclapp customApiCall node. Root cause: `weclappApi` credential type is **not present in n8n's type registry**.

```bash
# Verified: weclappApi absent from /home/node/.n8n/types/credentials.json
docker exec n8n-docker-n8n-1 python3 -c "
import json
d = json.load(open('/home/node/.n8n/types/credentials.json'))
print([c['name'] for c in d if 'weclapp' in c['name'].lower()])
"
# Output: []
```

The node package is installed but the credential type was never registered at n8n startup. When the node tries to resolve `$credentials.baseUrl`, n8n falls back to its own base URL (`http://localhost:5678`), so the request hits `http://localhost:5678/salesChannel/activeSalesChannels` → 404.

**Fix:** Restart the n8n docker container after node installation. This is a PR4 deployment prerequisite not completed in the QA environment.

---

## Bug Found: If Node typeVersion 2.3 + singleValue Operator Causes Activation Failure

The source workflow uses `If` nodes with `typeVersion: 2.3` and operators:
```json
{ "type": "boolean", "operation": "true", "singleValue": true }
```

Importing this workflow and attempting activation throws:
```
Cannot read properties of undefined (reading 'execute')
```

n8n's `getNodeParameters` cannot resolve the `singleValue` property descriptor for `typeVersion: 2.3` in the installed n8n version.

**Fix applied in rebuilt workflow:**
- `typeVersion` changed from `2.3` to `2` on both If nodes
- Operator changed to `{ "type": "boolean", "operation": "equals" }` with explicit `"rightValue": true`

After this fix, the workflow activated successfully.

---

## Other Observations

1. **Compiled dist is pre-PR-#28**: The installed compiled version still has the stub `async execute() { return [[]]; }`. The declarative routing engine works independently, but `executeCustomApiCall()` requires credential resolution to work — blocked by the unregistered credential type.

2. **Alpenhammer cross-tenant path**: Uses a separate credential to hit the Alpenhammer weclapp tenant. This pattern is not supportable via declarative routing in the community node. It would require an `execute()` method with credential-switching logic or a separate sub-workflow per tenant.

3. **Pagination**: The rebuilt GET Articles node uses `updateAParameterInEachRequest` pagination with `completeExpression: {{ $response.body.result.length < 1000 }}`, matching project standards.

---

## Summary

| Metric | Value |
|--------|-------|
| Source nodes | 26 |
| Rebuilt nodes | 14 |
| weclapp httpRequest nodes in source | 6 |
| Rebuilt with community node | 2 (GET only) |
| Write operations rebuilt | 0% — blocked by issue #30 |
| Activation success | Yes (after If node typeVersion fix) |
| End-to-end execution success | No — credential type not registered (PR4 prerequisite) |
| Bugs discovered | 2: If typeVersion 2.3 activation failure; weclappApi type not registered |
