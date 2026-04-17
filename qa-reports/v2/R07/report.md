# Rebuild Report — R07v2 Pulpo Zone Tag Sync

Date: 2026-04-17
Tester: QA worker R07v2
n8n: localhost:5678 | weclapp tenant: testhandel
Node version under test: n8n-nodes-weclapp v0.2.0-pre (post-fix: F1 displayOptions, F7 tagName param)
Baseline: R07 report from 2026-04-16 (4 gaps: GAP-1 filters, GAP-2 properties, GAP-3 article.update tags, GAP-4 displayOptions crash)

## Source Workflow

Path: `weclapp/tenant/localhost/workflows/DEMO-Pulpo-Zone-Tag-Sync.json`

| Category | Count |
|---|---|
| Total nodes | 7 |
| weclapp HTTP Request nodes | 2 |
| Other nodes | 5 |

HTTP Request nodes replaced:
- `weclapp get articles` GET /article (paginated) → article.list community node
- `weclapp update article tags` PUT /article/id/{id} → customApiCall (article.update still missing tags field — GAP-3 open)

Architecture difference: source workflow used SplitOut to unwrap `result[]` from HTTP response. Community node `article.list` applies `rootProperty` postReceive hook which unwraps automatically — SplitOut node removed.

## Rebuilt Workflow

File: `qa-reports/v2/R07/rebuilt-zone-tag.json`
Deployed ID: `NgqILkuLzBveVpK9`

| Category | Count |
|---|---|
| Total nodes | 9 |
| weclapp community nodes | 5 |
| Other nodes | 4 |
| HTTP Request nodes | 0 |

Reduction in HTTP Request nodes: 100% (2 -> 0)

## Operations Tested (Definitive Run: exec 578)

| Op | Resource | Result | Exec | Notes |
|----|----------|--------|------|-------|
| create | tag | PASS | 578 | QA2-R07-Zone-Test created; F4 displayOptions crash eliminated |
| list | tag | PASS | 578 | 3 tags returned via returnAll:false limit:3 |
| delete | tag | PASS | 578 | Tag deleted immediately after create |
| list | article | PASS | 578 | 100 STORABLE articles returned; articleType filter applied (GAP-1 FIXED) |
| call (PUT) | customApiCall | PASS | 578 | article 3162 tags set to ['ZONE_A']; ignoreMissingProperties=true |
| list | article (properties) | PARTIAL | 578 | properties:"id,articleNumber,tags" configured but weclapp returned 55+ fields (GAP-2 OPEN) |

Summary node output: `"Zone tag sync complete. Updated: 1, Failed: 0, Total: 1"`

Post-test cleanup: ZONE_A tag (id 6424126) deleted, article 3162 tags cleared.

## Gaps from R07 — Status

### GAP-1 [CRITICAL] filters silently ignored — FIXED

`filtersPreSend` hook added in SharedFields.ts (commit c65eb53) calls `buildFilterParams()` and merges into qs. Confirmed: article.list with `articleType-eq=STORABLE` filter returned only STORABLE articles (exec 578 vs exec 277 which returned all types).

### GAP-2 [HIGH] additionalFields.properties ignored — PARTIAL / OPEN

Routing was added for the `properties` param (commit c65eb53). The parameter is sent, but weclapp /article endpoint still returns 55+ fields despite `properties:"id,articleNumber,tags"` configured. The `properties` query param may require different formatting, or routing wire is not connecting for article.list specifically. Data pipeline still works (extra fields are harmless for zone tag sync), but field projection is not functional. Needs separate investigation.

### GAP-3 [HIGH] article.update missing tags field — OPEN (workaround confirmed)

`updateFields` in ArticleDescription.ts has no `tags` entry. Workaround: customApiCall with `entityPath:article`, `entityId:={{$json.articleId}}`, `method:PUT`, `requestBody:={{JSON.stringify({tags:$json.newTags})}}`, `?ignoreMissingProperties=true`. Confirmed working in exec 578 — article 3162 tags updated to `['ZONE_A']` and visible in testhandel.

Fix required: add `tags` as fixedCollection multi-value string field to `updateFields` in ArticleDescription.ts.

### GAP-4 [HIGH] displayOptions in collection children causes execution crash — FIXED

F1 fix: removed `displayOptions` from all collection/fixedCollection child options. tag.create no longer crashes. Confirmed: exec 578, tag created successfully without "Max iterations reached" error.

F7 fix (related): internal param renamed `name` -> `tagName` in TagUnitUserDescription.ts to avoid routing key collision. Workflow JSON must use `tagName` (not `name`) for tag.create.

### GAP-5 [LOW] webhookId required for production webhook registration — DOCUMENTED

Not retested. Still valid: include `webhookId` in webhook node top-level JSON when creating via REST API.

## Architecture Notes

**SplitOut removal**: community `article.list` with `rootProperty` postReceive emits individual items. Source workflow's `SplitOut{fieldToSplitOut:"result"}` node finds no `result` field and emits 0 items. The rebuilt workflow connects article.list directly to Code: Compute Tag Diff.

**Fan-out pattern**: Normalize Input fans out to three branches simultaneously: (1) article.list -> diff -> update -> summary; (2) tag.list (standalone, no outgoing connection); (3) tag.create -> tag.delete. This ensures tag.create fires once (from single Normalize Input item), not once per listed tag.

**DB registration**: community node installation requires both disk files AND `installed_packages`/`installed_nodes` rows in n8n SQLite DB. The `/rest/community-packages` API only works for packages published to npm registry. For local/pre-release packages, manual DB row insertion + container restart is required.

## Cleanup

Tag `QA2-R07-Zone-Test` (id 6424126) deleted post-test.
Article 3162 tags cleared post-test.
Deployed workflow `NgqILkuLzBveVpK9` remains active on localhost for reference.

## Execution IDs

| Op | Exec | Status |
|----|------|--------|
| Full 9-node run (tag create/delete + article list + customApiCall PUT) | 578 | success |
| Earlier partial run (article.list + SplitOut bug) | 510 | fail (SplitOut 0 items) |
| Earlier tag.create multi-fire | 535, 564 | fail (fan-out wiring wrong) |
