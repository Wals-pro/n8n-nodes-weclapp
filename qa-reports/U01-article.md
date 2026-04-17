# QA U01 — Article smoke
Date: 2026-04-17  |  Tester: coordinator agent  |  n8n: localhost:5678  |  tenant: testhandel

## Operations tested

| Op | Result | Execution ID | Notes |
|----|--------|--------------|-------|
| list | PASS | 184 | 100 items returned (issue #29: limit param not wired — returns 100 regardless of `limit` setting); sample articleNumbers: 234234545, K15315, K10037 |
| get | PASS | 204 | Article K15315 "SOLITAIRE RING" (id 3191) returned; requires `articleId` as `__rl` resourceLocator: `{"__rl":true,"mode":"id","value":"3191"}` |
| create | PASS | 211 | Article QA-U01-TEST-001 (STORABLE, name "QA Test") created, assigned id 6423254 |
| update | PASS | 215 | name changed to "QA Test Updated" via `updateFields.name`; `ignoreMissingProperties=true` applied correctly |
| delete | PASS | 268 | Returns `{"deleted": true}` as per node spec |
| createDatasheetPdf | FAIL | 218 | weclapp API returns HTTP 400 "body is not a json object" — node sends empty body with `encoding: arraybuffer`; weclapp POST endpoints require `Content-Type: application/json` with `{}` body even for PDF generation |
| createLabelPdf | FAIL | 233 | Same root cause as createDatasheetPdf: empty body sent, weclapp rejects with 400 "body is not a json object" |
| downloadMainArticleImage | PARTIAL | 239 | Execution status: success, response size 189KB; however n8n binary property not populated — response returned as raw `{"type":"Buffer","data":[...]}` JSON object instead of binary item; image not usable downstream |
| changeUnit | PASS | 259 | Unit changed to id 2261 (Kg); response wrapped as `{"result":{"success":true}}` — weclapp API shape, not unwrapped by node |
| packagingUnitStructure | PARTIAL | 249 | HTTP 200, data returned but wrapped under `result` key: `{"result":[...]}` — node lacks `rootProperty: result` post-receive handler; article data accessible but not as top-level items |
| updatePrices (composite) | N/A | — | Composite op — expected N/A until issue #30 lands |
| uploadArticleImage | FAIL | 275 | HTTP 400 from weclapp; no binary input available from webhook trigger; expected failure in test harness — real usage requires binary data from upstream node |

## Bugs / friction found

- **[HIGH]** `createDatasheetPdf` and `createLabelPdf` both fail with HTTP 400 "body is not a json object" — evidence: executions 218, 233. Root cause: `encoding: 'arraybuffer'` in routing causes n8n to send an empty body; weclapp's POST endpoints require a valid JSON body (`{}`) even when no params are needed. Suggested fix: add `body: {}` to the routing request definition for both operations, or use a `preSend` hook to inject an empty JSON body.

- **[HIGH]** `downloadMainArticleImage` (and likely `downloadArticleImage`) returns binary data as a raw `{"type":"Buffer","data":[...]}` JSON object rather than populating `item.binary` — evidence: execution 239, response 189KB but zero binary properties in n8n items. The arraybuffer response is not being converted to an n8n binary property. Suggested fix: add a `postReceive` handler that calls `this.helpers.prepareBinaryData()` to wrap the buffer as a proper binary property.

- **[MED]** `packagingUnitStructure` returns `{"result": [...]}` wrapper instead of unwrapped items — evidence: execution 249 response. The `GET /article/id/{id}/packagingUnitStructure` endpoint returns a weclapp envelope `{"result":[...]}`. The node is missing a `rootProperty: 'result'` post-receive extractor (same pattern as the `list` operation which has it). Suggested fix: add `{type: 'rootProperty', properties: {property: 'result'}}` to `packagingUnitStructure` routing output.

- **[LOW]** `changeUnit` response `{"result":{"success":true}}` not unwrapped — evidence: execution 259. The weclapp API wraps the action response in a `result` key. Not strictly a bug (the data is accessible), but inconsistent with how `delete` returns `{deleted: true}` directly. Suggested fix: add a `set` post-receive to extract `result.success` or document the expected shape.

- **[LOW / Infra]** Webhook registration fails silently when workflow is created via REST API without `webhookId` set at the node level (not in `parameters`). Node ID must match the path in `webhookId` field. No error is returned during activation — the workflow shows `active: true` but webhook 404s. This is an n8n behaviour issue, not a node bug, but affects test harness setup.

- **[INFO]** `list` limit parameter not wired to API request (issue #29 known): setting `limit: 10` in node parameters returns 100 items. Documented as known, not a new finding.

## Cleanup status
- Workflows created: 10
- Workflows deleted: 10 (all cleaned up)
- Test articles created: 1 (QA-U01-TEST-001, id 6423254)
- Test articles deleted: 1 (via delete operation, execution 268)
- Manual action needed: none

## Execution IDs (for replay)
- list: 184
- get: 204
- create: 211
- update: 215
- createDatasheetPdf: 218 (error)
- createLabelPdf: 233 (error)
- downloadMainArticleImage: 239 (partial)
- changeUnit: 259
- packagingUnitStructure: 249 (partial)
- delete: 268
- uploadArticleImage: 275 (expected fail — no binary input)

## Summary
5 of 10 tested operations fully pass (list, get, create, update, delete). 2 operations fail due to a shared bug where PDF-generation POST endpoints reject the empty body sent by the node (createDatasheetPdf, createLabelPdf). 2 operations work at the HTTP level but produce incorrect n8n output (downloadMainArticleImage — binary not populated; packagingUnitStructure — result wrapper not stripped). uploadArticleImage fails as expected without binary input. updatePrices skipped per issue #30.
