# Rebuild Report — R07 Pulpo Zone Tag Sync

Date: 2026-04-17
Tester: QA worker R07
n8n: localhost:5678 | weclapp tenant: testhandel

## Source Workflow

Path: `weclapp/tenant/localhost/workflows/DEMO-Pulpo-Zone-Tag-Sync.json`

| Category | Count |
|---|---|
| Total nodes | 7 |
| weclapp HTTP Request nodes | 2 |
| Other nodes | 5 |

weclapp HTTP Request nodes replaced:
- `weclapp get articles` GET /article (paginated, articleType-eq=STORABLE, properties=id,articleNumber,tags) → article.list
- `weclapp update article tags` PUT /article/id/{id}?ignoreMissingProperties=true body {tags:[...]} → customApiCall (GAP-3)

## Rebuilt Workflow

File: qa-reports/R07/rebuilt-pulpo-zone-tag-sync.json
Deployed ID: 6BAOLxMJetOG1Vwh

| Category | Count |
|---|---|
| Total nodes | 10 |
| weclapp community nodes | 5 |
| Other nodes unchanged | 5 |
| HTTP Request nodes | 0 |

Reduction in HTTP Request nodes: 100% (2 -> 0)

## Operations Tested

| Op | Resource | Result | Exec ID | Notes |
|----|----------|--------|---------|-------|
| list | tag | PASS | 292 | Returns tag array; returnAll:true works |
| list | article | PARTIAL | 277 | Articles returned but filters and properties NOT sent to API (GAP-1, GAP-2) |
| create | tag | FAIL | n/a | displayOptions inside tagBody collection → crash (GAP-4) |
| delete | tag | BLOCKED | n/a | Blocked by create failure |
| GET | customApiCall | PASS | 296 | Correct URL built; 404 expected (no matching article on testhandel) |
| PUT | customApiCall | NOT TESTED | n/a | GET path confirmed; PUT path identical |

## Bugs / Gaps Found

### GAP-1 [CRITICAL] filtersCollection has no routing: filters silently ignored

Every List operation configured with filters sends NO filter query params to weclapp. The filtersCollection UI field in SharedFields.ts has no routing.send or routing.request.qs sub-keys. buildFilterParams() exists in GenericFunctions.ts and is correct but is never called — no preSend hook wires it.

Evidence: article.list with articleType-eq=STORABLE returned articles of all types. Execution 277.

Fix: Add preSend routing hook on all list operations to call buildFilterParams() and merge into qs.

### GAP-2 [HIGH] additionalFields.properties has no routing: field projection ignored

additionalFields collection (properties, includeReferencedEntities, serializeNulls) in SharedFields.ts has no routing.send entries. Parameters are collected but never forwarded as HTTP query params.

Evidence: Execution 277 returned 55+ article fields despite properties:"id,articleNumber,tags" configured.

Fix: Add routing: { send: { type: 'query', property: 'properties' } } (and equivalent) to each additionalFields option.

### GAP-3 [HIGH] article.update missing tags field

updateFields collection in ArticleDescription.ts has no tags entry. The source workflow updates article tags via PUT {tags:[...]}. Workaround: use customApiCall with entityPath:article, entityId:={{$json.articleId}}, method:PUT, requestBody:={{JSON.stringify({tags:$json.newTags})}}.

Fix: Add tags as a fixedCollection multi-value string field to updateFields in ArticleDescription.ts.

### GAP-4 [HIGH] displayOptions in collection children causes execution crash

tag.create, tag.update, unit.create/update, user.create/update, customAttributeDefinition.update all fail at execution with "Could not resolve parameter dependencies. Max iterations reached!" n8n's declarative parameter resolver cannot handle displayOptions inside collection/fixedCollection children.

Affected code:
- TagUnitUserDescription.ts line 136: tagBody.name has displayOptions:{show:{operation:['update']}}
- Same pattern at lines 266, 412, 437, 665, 674, 699

Evidence: workflow 7xCcrn26w223WZ33 tag.create returned 500 on webhook hit.

Fix: Remove displayOptions from ALL collection child parameters. Create separate create/update collections or always show all fields and remove the operation-specific display filter.

### GAP-5 [LOW] webhookId required in node JSON for production webhook registration

Workflows created via REST API without webhookId in the webhook node JSON never register their production webhook (stays 404 even when workflow is active). Must set "webhookId": "<path>" in the node's top-level JSON (not parameters).

Fix: Document in E2E recipe: always include webhookId in webhook node JSON when creating via REST API.

## Readability Assessment

The rebuilt workflow is substantially more readable. Intent is explicit (article.list vs raw HTTP Request with embedded pagination). Credential is centralized as named weclappApi. The customApiCall workaround for tag update is acceptable but a native tags field would be better. +3 nodes from added tag CRUD test branch (QA addition, not in source).

## Cleanup

Temporary test workflow IDs to delete: H2s7ao26aqheslrM, MsG7c2PLP9FtGbK3, 7xCcrn26w223WZ33, LeTGRoZdhNKtPUKX, nAqt9Yh2y1ELgx2l
No testhandel entities created (tag.create blocked before creating any data).

## Execution IDs

| Op | Workflow | Exec | Status |
|----|----------|------|--------|
| tag.list | MsG7c2PLP9FtGbK3 | 292 | success |
| article.list | LeTGRoZdhNKtPUKX | 277 | success |
| tag.create | 7xCcrn26w223WZ33 | n/a | fail (500 pre-exec) |
| customApiCall GET | nAqt9Yh2y1ELgx2l | 296 | error (404 expected) |
