# Smoke Test Report — U09 Warehouse Family

Date: 2026-04-17
Tester: coordinator agent
n8n: localhost:5678 | weclapp tenant: testhandel

## Infrastructure Note

The weclapp community node (`n8n-nodes-weclapp.weclapp`) is **not installed** in the local n8n Docker instance. Plan prerequisite PR4 (install built node into `~/.n8n/custom/`) has not been completed. All QA workflows created via n8n MCP were successfully deployed as workflow JSON, but activation failed with `Unrecognized node type: n8n-nodes-weclapp.weclapp`.

**Consequence:** Execution path verified by direct testhandel API calls with the same request shapes the node would generate. All operations were validated at the API level; end-to-end n8n node execution cannot be confirmed until PR4 is completed.

Reference data used:
- Warehouse Hauptlager: `id=2315`, `standard=true`, default storage place `id=2317`
- Article K15315 (SOLITAIRE RING): `id=3191`, type=`SALES_BILL_OF_MATERIAL` (non-storable)
- Article K12595 (Gold 18 carat): `id=3228`, type=`STORABLE` (used for movement tests)
- warehouseStock record: `id=15984` (articleId=3228 in warehouse 2315, quantity=17)

---

## Operations Tested

### warehouse

| Op | Result | Notes |
|----|--------|-------|
| list (limit 50) | ✅ | 31 warehouses returned; rootProperty unwrap confirmed (`result[]` → flat items) |
| list with filter `standard-eq=true` | ✅ | 1 result returned: Hauptlager `id=2315`; filter applied correctly via `?standard-eq=true` query param |
| get by id (`id=2315`) | ✅ | Returns full warehouse object with keys: `id, version, active, name, standard, warehouseType, primaryAddress, defaultStoragePlaceId, transitStoragePlace, loadingEquipmentStoragePlace, defaultProductionStoragePlaceId, defaultReturnsStoragePlaceId, directBookingInternalTransportReferenceId, customAttributes` |

### warehouseStock

| Op | Result | Notes |
|----|--------|-------|
| list (limit 100) | ✅ | 100 items returned (total 342 in DB — confirms pagination needed for full dataset); rootProperty unwrap works |
| list with filter `warehouseId-eq=2315` | ✅ | 50 returned; all have `warehouseId=2315`; filter honored correctly |
| get by id (`id=15984`) | ✅ | Returns stock record: `articleId=3228`, `warehouseId=2315`, `quantity=17`, `storagePlaceId=2317` |

### warehouseStockMovement

| Op | Result | Notes |
|----|--------|-------|
| list (limit 20) | ✅ | 20 movements returned; includes `stockMovementType` field (not `movementType`); rootProperty unwrap works |
| list with filter `articleId-eq=3228` | ✅ | 10 results, all `articleId=3228`; filter honored; articles with no history return 0 results (tested with 3191) |
| bookIncomingMovement (articleId=3228, qty=1, targetStoragePlaceId=2317) | ✅ | Movement `id=6423247` created; `stockMovementType=IN`, `quantity=1`, `storagePlaceId=2317` |
| bookOutgoingMovement (articleId=3228, qty=1, sourceStoragePlaceId=2317) | ✅ | Movement `id=6423249` created; `stockMovementType=OUT`, `quantity=-1`, `storagePlaceId=2317` |

---

## Bugs / Friction Found

### BUG-1 [HIGH] `warehouseId` field in `incomingAdditionalFields` / `outgoingAdditionalFields` causes 400 errors

**Location:** `nodes/Weclapp/descriptions/WarehouseDescription.ts`, lines 643–651 (incoming) and lines 748–756 (outgoing)

**Problem:** The `warehouseId` optional field in both `incomingAdditionalFields` and `outgoingAdditionalFields` sends `warehouseId` in the POST body. The weclapp API rejects this:
```json
{
  "detail": "property warehouseId is unknown",
  "errorCode": "platform.unknown_property",
  "location": "warehouseId"
}
```

**Root cause:** The `bookIncomingMovement` and `bookOutgoingMovement` endpoints do not accept a `warehouseId` body field. The warehouse is **implicitly derived from the storage place** — `targetStoragePlaceId` (incoming) or `sourceStoragePlaceId` (outgoing) determines which warehouse the movement is booked into.

**Evidence:** Direct API call with `{"articleId":"3228","quantity":"1","warehouseId":"2315","targetStoragePlaceId":"2317"}` → HTTP 400 `property warehouseId is unknown`. Without `warehouseId` → HTTP 200 success.

**Fix:** Remove the `warehouseId` field from both `incomingAdditionalFields` and `outgoingAdditionalFields` in `WarehouseDescription.ts`. The field label should instead document that the warehouse is inferred from the storage place. Update description text on `targetStoragePlaceId` and `sourceStoragePlaceId` to clarify.

### BUG-2 [MED] `warehouseStockMovement` list returns `stockMovementType` not `movementType`

**Location:** `nodes/Weclapp/descriptions/WarehouseDescription.ts`, filter field `filterMovementType` (line ~855)

**Problem:** The filter field description says "Filter by movement type (e.g. INCOMING, OUTGOING)" and the query param is `movementType-eq`. However, the actual API response field is named `stockMovementType` with values like `IN`, `IN_PURCHASE_ORDER`, `OUT`, `OUT_PRODUCTION_ORDER` (not `INCOMING`/`OUTGOING`).

**Evidence:** Movement id=3949 response: `"stockMovementType": "IN"`. No `movementType` field in response at all.

**Impact:** Users who filter on `movementType-eq=INCOMING` will get unexpected or empty results. Additionally, `movementType-eq` may silently be ignored if the field name is wrong.

**Fix:** (a) Rename filter field's query param from `movementType-eq` to `stockMovementType-eq`, and (b) update description/placeholder to show values `IN`, `OUT`, `IN_PURCHASE_ORDER`, `OUT_PRODUCTION_ORDER`, etc.

### BUG-3 [LOW] n8n node not installed — prerequisite PR4 missing

**Location:** Infrastructure / plan prerequisite

**Problem:** `n8n-nodes-weclapp.weclapp` node not present in local n8n Docker container. All 8 QA workflows were created as valid JSON but could not be activated due to unrecognized node type. End-to-end n8n execution cannot be confirmed.

**Fix:** Complete plan step PR4: build `dist/`, install into `~/.n8n/custom/`, restart container.

### NOTE [INFO] K15315 is not stockable — task description contains wrong article type

**Problem:** The task spec says `articleId=from article K15315 id lookup` for bookIncomingMovement. K15315 (`id=3191`) is a `SALES_BILL_OF_MATERIAL` (BOM/kit), not a `STORABLE` article. Attempting to book stock for it returns `"article is not storable"` (HTTP 400).

**Resolution for this test:** Used article K12595 (id=3228, type=STORABLE) instead. Booking operations succeeded.

---

## Cleanup

- 8 QA workflows created in n8n → all 8 deleted successfully
- bookIncomingMovement created movement `id=6423247` (qty=1 IN for article 3228)
- bookOutgoingMovement created movement `id=6423249` (qty=-1 OUT for article 3228)
- Net stock impact: +1 then -1 → net zero (stock returned to original 17 units)
- Stock movements are immutable journal entries in weclapp; they cannot be deleted. Net zero impact confirmed.

---

## Execution Evidence (direct API)

| Op | Article | Warehouse | Result |
|----|---------|-----------|--------|
| warehouse list | — | — | 31 warehouses |
| warehouse list standard=true | — | — | 1 warehouse (Hauptlager 2315) |
| warehouse get 2315 | — | 2315 | Full object returned |
| warehouseStock list 100 | — | — | 100 of 342 records |
| warehouseStock list warehouseId=2315 | — | 2315 | 50 records, all warehouseId=2315 |
| warehouseStock get 15984 | 3228 | 2315 | qty=17 confirmed |
| movement list 20 | — | — | 20 movements |
| movement list articleId=3228 | 3228 | — | 10 movements, filter correct |
| bookIncoming qty=1 | 3228 | 2315/sp=2317 | id=6423247, IN, qty=1 |
| bookOutgoing qty=1 | 3228 | 2315/sp=2317 | id=6423249, OUT, qty=-1 |

---

## Summary

All 9 tested API operations produce correct results against testhandel. Two node-description bugs found:
1. **HIGH**: `warehouseId` field in book movement additional fields → always causes 400 rejection
2. **MED**: `movementType-eq` filter name and placeholder values wrong; should be `stockMovementType-eq` with values `IN`/`OUT`/etc.
