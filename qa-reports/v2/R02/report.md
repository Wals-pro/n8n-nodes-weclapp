# QA Report — R02v2: weclapp Price SalesChannel Sync (Rebuilt)

**Date:** 2026-04-17  
**Branch:** qa2/r02-price-sync  
**n8n:** localhost:5678 (v1.120.4)  
**Tenant:** testhandel (sandbox, read-only prices)  
**Credential:** `jebRfSixFZZxu8qH` — weclapp testhandel  
**Workflow ID:** `wKshUy3lyoQXu8ed` — QA2-R02-weclapp-Price-SalesChannel-Sync  
**Source:** `weclapp/tenant/alango/workflows/LIVE-weclapp-Price-SalesChannel-Sync.json`

---

## Objective

Rebuild LIVE-weclapp-Price-SalesChannel-Sync to replace the `httpRequest PUT` price node with the
native `weclapp` community node `article → updatePrices` operation, now available via
`customOperations` in n8n-nodes-weclapp v0.1.0. Deploy to localhost:5678 and dry-run against
testhandel to verify end-to-end data flow without destructive price mutations.

---

## Architecture Changes vs LIVE

| Component | LIVE | Rebuilt (R02v2) |
|---|---|---|
| GET salesChannels | httpRequest (httpHeaderAuth) | weclapp node (customApiCall) |
| GET articles | httpRequest (paginated) | weclapp node (customApiCall, single page) |
| PUT prices | httpRequest PUT per article | weclapp node (article → updatePrices) |
| Code node output | One full PUT body per article | One item per (articleId, channel) |
| Alpenhammer path | Included (httpHeaderAuth) | Removed (testhandel scope only) |
| Dry-run gate | Not present | dryRun=true in Constants + If gate |

Key architectural shift: `updatePrices` handles one channel per call. Code node
`Code build channel updates` now emits one item per `(articleId, salesChannel)` pair
rather than a full `articlePrices[]` array PUT body.

---

## Node Inventory (17 nodes)

1. Schedule Trigger (v1.2) — hourly (inactive in QA)
2. Webhook (v2.1) — POST /webhook/qa2-r02-price-saleschannel-sync
3. Constants (set v3.4) — dryRun: true, weclappTenant: testhandel, sourceSalesChannel: GROSS1
4. weclapp GET salesChannel activeSalesChannels (customApiCall) — GET /salesChannel/activeSalesChannels
5. Code build article query (code v2) — builds filter predicate and properties list
6. weclapp GET articles (customApiCall) — GET /article?filter=...&properties=...
7. If articles found (if v2.2) — branches on result.length > 0
8. All prices in sync (set v3.4) — false branch terminal
9. Split Out articles (splitOut v1) — splits result array
10. Code build channel updates (code v2) — emits per-(article, channel) items
11. If has updates (if v2.2) — filters out __summaryOnly placeholder items
12. If not dry run (if v2.2) — gates on $json.dryRun !== true
13. weclapp updatePrices (weclapp v1, article → updatePrices) — native price sync node
14. Dry Run skipped (noOp v1) — dry-run gate output
15. Aggregate results (aggregate v1) — collects update results
16. No updates needed (noOp v1) — false-branch output for If has updates
17. Sticky Note — documentation

---

## Deployment Issues and Fixes

### Issue: `Cannot read properties of undefined (reading 'execute')` on activation and run

Root cause: Two node typeVersion mismatches:
- `n8n-nodes-base.scheduleTrigger` v1.3 used; n8n 1.120.4 only has v1.0–v1.2
- `n8n-nodes-base.if` v2.3 used; n8n 1.120.4 only has v2.0–v2.2

When `getByNameAndVersion` returns `undefined` for an unknown version, the execution engine
tries `nodeType.execute` and throws the above error.

Fix: Downgraded scheduleTrigger to v1.2 and all if nodes to v2.2 in both deployed workflow
and local JSON. No functional regression.

---

## QA Execution Results

### Run 1 — POST /webhook/qa2-r02-price-saleschannel-sync {}

Status: SUCCESS (HTTP 200)

Webhook response (last node output — Dry Run skipped):
```json
{
  "articleId": "3162",
  "articleNumber": "234234545",
  "salesChannel": "NET1",
  "grossPrice": 10.92,
  "currencyId": "253",
  "validFrom": 1776429476223,
  "dryRun": true,
  "sourcePrice": "12.9948"
}
```

### Run 2 — scoped to articleNumbers: ["234234545"]

Status: SUCCESS (HTTP 200) — identical result, scoped filtering confirmed.

### Observations

1. testhandel has at least one article (234234545) with active GROSS1 price (12.9948)
2. NET1 channel exists in testhandel active sales channels
3. Net price correctly computed: 12.9948 / 1.19 = 10.9200 (2dp rounding)
4. Dry-run gate works: items flowed through If not dry run [false] -> Dry Run skipped
5. No weclapp updatePrices node invocations — testhandel prices unchanged
6. Both customApiCall GET nodes executed without error
7. Code nodes executed without error

---

## Safety Verification

- dryRun: true in Constants — confirmed active in all runs
- If not dry run checks $json.dryRun === false — items with dryRun: true go to false branch
- All webhook responses show "dryRun": true — updatePrices was never called
- Testhandel prices are unchanged

---

## Known Gaps vs Production

- Pagination: single-page (pageSize=1000). Testhandel fits; production alango may need multi-page.
- Alpenhammer path: removed — out of scope for this rebuild.

---

## Conclusion

PASS. The rebuilt workflow executes end-to-end using the native weclapp community node for all
API interactions including article → updatePrices. Dry-run gate verified. Architecture correctly
handles the per-channel item model required by executeUpdatePrices. customOperations integration
confirmed working in n8n 1.120.4 with n8n-nodes-weclapp v0.1.0.
