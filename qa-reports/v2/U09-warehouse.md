# QA2-U09 — Warehouse Family Re-QA Report

**Branch:** `qa2/u09-warehouse`
**Node version:** `0.2.0-pre` (WarehouseDescription.js, 27 679 bytes, 8 preSend hooks)
**Tenant:** testhandel (credential `jebRfSixFZZxu8qH`)
**Date:** 2026-04-17
**Tester:** automated via n8n webhook triggers (localhost:5678)

---

## Summary

| ID | Test | Workflow ID | Result |
|----|------|-------------|--------|
| T1 | warehouse › list (no filter, limit=50) | `zphznUPIODyZrOzl` | PASS |
| T2 | warehouse › list-filter (name-eq=Hauptlager) | `Drf0ggsVPyPAV0XK` | PASS |
| T3 | warehouse › get (id=2315) | `bKBssU0ZV6EN916g` | PASS |
| T4 | warehouseStock › list-filter (warehouseId-eq=2315) | `ch94nrEmtU5YWytv` | PASS |
| T5 | warehouseStock › get (id=15984) | `UExGm6d4YYQLo2OT` | PASS |
| T6 | warehouseStockMovement › list-filter (stockMovementType-eq=IN) | `81YgrQhaief488mJ` | PASS |
| T7 | warehouseStockMovement › bookIncomingMovement | `xNCQVFfgdWY6CYNb` | PASS |
| T8 | warehouseStockMovement › bookOutgoingMovement | `5CtrP3hSDSXzdeVW` | PASS |

**Result: 8/8 PASS**

---

## Test Details

### T1 — warehouse › list

- URL: `POST /webhook/qa2-u09-wh-list`
- Parameters: `returnAll=false, limit=50`
- Response: 31 warehouses returned
- Sample: `id=2312 name=Streckenlager`, `id=2315 name=Hauptlager`
- Status: `200 OK`, execution status `success`

### T2 — warehouse › list-filter (name-eq)

- URL: `POST /webhook/qa2-u09-wh-list-filter`
- Parameters: `filterName=Hauptlager` (uses `warehouseFilterNamePreSend` → `name-eq`)
- Response: 1 warehouse returned
- Result: `id=2315, name=Hauptlager`
- Status: `200 OK`, execution status `success`

### T3 — warehouse › get

- URL: `POST /webhook/qa2-u09-wh-get`
- Parameters: `warehouseId=2315`
- Response: `id=2315, name=Hauptlager, active=true`
- Status: `200 OK`, execution status `success`

### T4 — warehouseStock › list-filter (warehouseId-eq)

- URL: `POST /webhook/qa2-u09-whstock-list`
- Parameters: `filterWarehouseId=2315` (uses `warehouseStockFilterWarehouseIdPreSend` → `warehouseId-eq`)
- Response: 50 stock records, all `warehouseId=2315`
- First record: `id=15984, articleId=3228, quantity=17`
- Status: `200 OK`, execution status `success`

### T5 — warehouseStock › get

- URL: `POST /webhook/qa2-u09-whstock-get`
- Parameters: `stockId=15984`
- Response: `id=15984, articleId=3228, warehouseId=2315, quantity=17`
- Status: `200 OK`, execution status `success`

### T6 — warehouseStockMovement › list-filter (stockMovementType-eq)

- URL: `POST /webhook/qa2-u09-mov-list`
- Parameters: `filterMovementType=IN` (uses `movementFilterMovementTypePreSend` → `stockMovementType-eq`)
- Response: 20 movements, all `stockMovementType=IN`
- First movement: `id=3949, articleId=3199, quantity=3`
- Status: `200 OK`, execution status `success`

### T7 — warehouseStockMovement › bookIncomingMovement

- URL: `POST /webhook/qa2-u09-book-in`
- Parameters: `articleId=3228, quantity=1, targetStoragePlaceId=2317, movementNote="QA2-U09 incoming test"`
- Response: `id=6424923, stockMovementType=IN, quantity=1, articleId=3228`
- Status: `200 OK`, execution status `success`

### T8 — warehouseStockMovement › bookOutgoingMovement

- URL: `POST /webhook/qa2-u09-book-out`
- Parameters: `articleId=3228, quantity=1, sourceStoragePlaceId=2317, movementNote="QA2-U09 outgoing test"`
- Response: `id=6424925, stockMovementType=OUT, quantity=-1, articleId=3228`
- Status: `200 OK`, execution status `success`

---

## Cleanup

T7 (IN, id=6424923) and T8 (OUT, id=6424925) are complementary and self-cancelling:
- Stock `id=15984` (articleId=3228, warehouseId=2315) verified at `quantity=17` before and after.
- Net stock change: 0. No further cleanup required.

---

## Bugs Found and Fixed

### BUG-1: `displayOptions` inside `collection` child parameter

**WarehouseDescription.ts** had a `displayOptions` block on the `name` child field inside the `warehouseBodyFields` collection. n8n throws `"Could not resolve parameter dependencies"` for any workflow using this node type, which also prevents webhook registration.

**Fix:** Removed `displayOptions` from the `name` field inside `warehouseBodyFields`. The field is now shown for both `create` and `update` operations (safe: `create` has a separate required top-level `name` field).

**File:** `nodes/Weclapp/descriptions/WarehouseDescription.ts`

### BUG-2: Missing `webhookId` in QA test workflow Webhook nodes

All QA2-U09 workflow Webhook nodes lacked the `webhookId` property. Without it, n8n's `getNodeWebhookPath` generates `${workflowId}/${nodeName}/${path}` (e.g., `zphznUPIODyZrOzl/webhook/qa2-u09-wh-list`) instead of just `path`. This caused webhook registration failures and a misleading `"Cannot read properties of undefined (reading 'node')"` runtime error.

**Fix:** Added `webhookId` matching the path value to all 9 QA2-U09 Webhook nodes directly in the n8n SQLite database. After the fix, n8n correctly generates clean paths on every activation cycle — confirmed across multiple restarts.

**Affected workflows:** all 9 QA2-U09 workflow Webhook nodes (DB fix, not in repo JSON files since these are ephemeral test workflows).

### BUG-3: Stale tarball at `/tmp/new-weclapp.tgz` in Docker container

The Docker container's `npm install` was installing from `/tmp/new-weclapp.tgz`, which contained the old (unfixed) `WarehouseDescription.js`. Background agents were triggering reinstalls that reverted the fixed file.

**Fix:** Replaced `/tmp/new-weclapp.tgz` inside the container with the correct tarball built from the `qa2/u09-warehouse` worktree. The tarball is now the canonical source for the container's community node.

---

## preSend Hook Verification

The installed `WarehouseDescription.js` (27 679 bytes) contains 8 `preSend` hooks:

| Export | weclapp filter param |
|--------|---------------------|
| `warehouseFilterNamePreSend` | `name-eq` |
| `warehouseStockFilterWarehouseIdPreSend` | `warehouseId-eq` |
| `warehouseStockFilterArticleIdPreSend` | `articleId-eq` |
| `movementFilterArticleIdPreSend` | `articleId-eq` |
| `movementFilterWarehouseIdPreSend` | `warehouseId-eq` |
| `movementFilterEntryDateFromPreSend` | `entryDate-ge` |
| `movementFilterEntryDateToPreSend` | `entryDate-le` |
| `movementFilterMovementTypePreSend` | `stockMovementType-eq` |

T2 (name filter), T4 (warehouseId filter), and T6 (movement type filter) confirmed three of these hooks produce correctly filtered API results.
