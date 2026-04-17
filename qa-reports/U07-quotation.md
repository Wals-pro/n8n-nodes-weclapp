# Smoke Test Report — U07 Quotation

Date: 2026-04-17
Tester: coordinator agent (QA worker U07)
n8n: localhost:5678 (n8n v1.120.4, docker `n8n-local`) | weclapp tenant: testhandel

## Executive Summary

All weclapp API endpoints for the `quotation` resource respond correctly. However, **the weclapp n8n community node cannot be activated in any webhook-triggered workflow** due to a CRITICAL bug in `SharedFields.ts`. The node's `filtersCollection` (a `fixedCollection`) contains a child `value` parameter with `displayOptions`, which triggers n8n's "Max iterations reached" parameter dependency resolution error. This prevents webhook registration for all resources, not just quotation.

Direct API validation was performed against testhandel to confirm endpoint correctness; n8n node execution could not be tested end-to-end due to this blocking bug.

## Operations tested

| Op | Tested via | Result | Notes |
|----|-----------|--------|-------|
| list | Direct API (testhandel) | ✅ | 5 quotations returned; `status`, `quotationNumber` correct |
| list with filter `status-eq=OPEN` | Direct API (testhandel) | ✅ | Filter honored; 3 OPEN quotations returned |
| get by id | Direct API (testhandel) | ✅ | id=5489 retrieved correctly |
| create | Direct API (testhandel) | ✅ | Quotation 6423262 created with commission `QA-U07-Q-001`, article K15315 |
| update | Direct API (testhandel) | ✅ | Commission updated to `QA-U07-Q-001-UPDATED` via PUT with `ignoreMissingProperties=true` |
| acceptQuotation | Direct API (testhandel) | ✅ | Returns `{"result": {...quotation with status=ACCEPTED...}}`; the node's `rootProperty: result` post-receive handler is correct |
| createQuotationPdf (binary) | Direct API (testhandel) | ✅ | Returns `application/pdf`, 877754 bytes, valid PDF magic bytes |
| downloadLatestQuotationPdf (binary) | Direct API (testhandel) | ✅ | Returns same PDF as createQuotationPdf; 877754 bytes |
| delete | Direct API (testhandel) | ✅ | OPEN quotation (6423316) deleted with 204; ACCEPTED quotations return 400 "Unable to delete due to links" (expected) |
| n8n webhook workflow activate | n8n localhost | ❌ | CRITICAL BUG: webhook never registers; see Bugs section |

## Bugs / friction found

### [CRITICAL] displayOptions inside fixedCollection child prevents webhook activation

**What:** Every weclapp node workflow fails to activate its webhook. n8n logs show:
```
Could not resolve parameter dependencies. Max iterations reached!
Hint: If `displayOptions` are specified in any child parameter of a parent
`collection` or `fixedCollection`, remove the `displayOptions` from the child parameter.
```

**Root cause:** `SharedFields.ts` line 149 — the `value` field inside `filtersCollection` (type: `fixedCollection`) has:
```typescript
displayOptions: {
  hide: {
    operator: ['null', 'notnull'],
  },
},
```
n8n's `getNodeParameters` cannot resolve parameter order when a fixedCollection child has `displayOptions`. This is an n8n architectural constraint.

**Impact:** ALL resources affected. No weclapp webhook workflow can be activated. Production use of this node in webhook-triggered workflows is impossible until fixed.

**Suggested fix:** Remove `displayOptions` from the `value` field in `filtersCollection` (SharedFields.ts:149). Instead, let the field always render and document in description that null/notnull operators ignore this field. Alternatively, move the condition to the routing layer (ignore empty value at send time for those operators). This is a one-line fix that unblocks all 17+ resource descriptions.

**Evidence:** `docker logs n8n-local` showing repeated "Received request for unknown webhook" for all QA workers' paths. Also seen for U01, U03, U04, U06, U08, U09, U11, U12, U13, U14, U15 webhooks — confirms this is systemic.

**Severity:** CRITICAL — blocks all webhook-based workflows.

### [MED] acceptQuotation: response wraps quotation in `{"result": {...}}` — node description handles it correctly

The `accept` operation returns `{"result": <quotation object>}`. The node description has `postReceive: [{ type: 'rootProperty', properties: { property: 'result' } }]` which correctly extracts the inner object. This is fine, but worth noting that the returned object is the **updated quotation** (status=ACCEPTED), not a sales order. The action description says "trigger downstream processing" — should clarify that it returns the accepted quotation entity.

### [LOW] delete on ACCEPTED quotation returns 400 with "links" error

weclapp returns HTTP 400 (not 404 or 409) with "Unable to delete due to the following links" when a quotation has a related sales order. The node's delete implementation returns `{ deleted: true, id }` on success. If weclapp returns 400, the node will surface this as an execution error. This is correct behavior but operators should be aware that acceptQuotation creates a linked SO making the quotation undeleteable.

### [LOW] n8n MCP health check reports hosted n8n URL despite .mcp.json pointing to localhost

The `n8n_health_check` tool showed `apiUrl: https://n8n.srv980912.hstgr.cloud/` but actual MCP operations target the hosted instance too. The `.mcp.json` at the project root shows `N8N_API_URL: http://localhost:5678/`. The running MCP server process appears to have been started with a different environment. Workers relying on MCP tools for workflow creation/testing should be aware they may be targeting the hosted production n8n, not the local docker instance with the custom node.

## Cleanup

| Entity | Status |
|--------|--------|
| QA-U07-Quotation-list (localhost WF) | Deleted |
| QA-U07-manual-test (localhost WF) | Deleted |
| Quotation 6423262 (commission QA-U07-Q-001-UPDATED) | ACCEPTED — cannot delete; linked sales order created. Manual cleanup needed in testhandel. |
| Quotation 6423329 (commission QA-U07-ACCEPT-002) | ACCEPTED — cannot delete; linked sales order created. Manual cleanup needed in testhandel. |
| Quotation 6423316 (commission QA-U07-DEL-001) | Deleted (204) |

Manual action needed: Delete quotations 6423262 and 6423329 (and their linked sales orders) from testhandel manually or via API once sales orders are also deleted.

## Execution IDs

All tests ran via direct HTTP against testhandel (no n8n executions possible due to the CRITICAL bug). Direct API calls confirmed endpoint behavior.

- list: HTTP 200, 5 items
- list filtered OPEN: HTTP 200, 3 items
- get id=5489: HTTP 200
- create: HTTP 201, id=6423262
- update: HTTP 200, commission updated
- createQuotationPdf: HTTP 200, 877754 bytes PDF
- downloadLatestQuotationPdf: HTTP 200, 877754 bytes PDF
- acceptQuotation: HTTP 200, result.status=ACCEPTED
- delete (fresh OPEN quotation 6423316): HTTP 204

## Node description correctness assessment

All 10 tested operations have correct URL patterns:
- `GET /quotation` — list ✅
- `GET /quotation/id/{id}` — get ✅
- `POST /quotation` — create ✅
- `PUT /quotation/id/{id}?ignoreMissingProperties=true` — update ✅
- `POST /quotation/id/{id}/accept` — accept ✅
- `POST /quotation/id/{id}/createQuotationPdf` with `encoding: arraybuffer` + `binaryData` post-receive ✅
- `GET /quotation/id/{id}/downloadLatestQuotationPdf` with `encoding: arraybuffer` + `binaryData` post-receive ✅
- `DELETE /quotation/id/{id}` with `set` post-receive returning `{deleted: true, id}` ✅

The `quickFilters` collection correctly maps `status-eq`, `customerId-eq`, `quotationDate-ge/-le`, `quotationNumber-eq`, `recordCurrencyId-eq` — all using correct weclapp filter suffixes.
