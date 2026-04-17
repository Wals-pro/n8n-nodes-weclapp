# QA v2 U01 — Article re-smoke

**Date:** 2026-04-17  
**Tester:** U01v2 coordinator agent  
**Node version:** v0.2.0-pre (branch qa2/u01-article)  
**n8n:** localhost:5678  
**Tenant:** testhandel  
**Cred ID:** jebRfSixFZZxu8qH  
**Prefix:** QA2-U01-  
**Baseline:** QA v1 smoke — qa-reports/U01-article.md (commit 5e001db)

---

## Fix Coverage (from PR #43 / associated fix PRs)

| Fix | Description | Expected impact |
|-----|-------------|-----------------|
| F1 | `filtersPreSend` hook + `limit` wired as `pageSize` | `list` filter + limit ops |
| F2 | `customOperations` dispatcher for `article.updatePrices` | `updatePrices` op |
| F3 | `binaryData` postReceive on binary download ops | `downloadMainArticleImage`, `createDatasheetPdf`, `createLabelPdf` |

---

## Results vs v1 Baseline

| Op | v1 Result | v2 Result | Execution | Change |
|----|-----------|-----------|-----------|--------|
| list (no filter) | PASS | PASS | 716 | No regression |
| list (articleType-eq=STORABLE, limit=3) | FAIL (limit not wired; filter not applied) | **PASS** | 716 | F1 FIXED |
| get | PASS | PASS | ~730 | No regression |
| create | PASS | PASS | ~735 | No regression |
| update | PASS | not re-tested | — | Not in scope (no v1 failure) |
| delete | PASS | not re-tested | — | Not in scope (no v1 failure) |
| createDatasheetPdf | FAIL (empty body → 400) | **FAIL** | 777 | F3 not sufficient (body params still missing) |
| createLabelPdf | FAIL (empty body → 400) | **FAIL** | 779 | F3 not sufficient (body params still missing) |
| downloadMainArticleImage | PARTIAL (Buffer JSON, no binary) | **PARTIAL** | ~780 | F3 partially fixed — binary stored in item.binary.data with correct MIME; n8n platform bug prevents binary webhook delivery |
| packagingUnitStructure | PARTIAL (result wrapper not stripped) | **FAIL (same)** | ~785 | MED bug not addressed — rootProperty still missing |
| updatePrices | N/A (issue #30) | **PASS** | ~790 | F2 FIXED |

---

## Detailed Results

### T1 — list with filter + limit (F1 fix) — PASS

- Webhook: `qa2u01-list-filter`
- Filter: `articleType-eq=STORABLE`, limit=3
- Result: 3 STORABLE articles returned, no other types present
- v1 had returned 100 items ignoring both filter and limit
- **F1 verified working.**

### T2 — get — PASS

- Webhook: `qa2u01-get`
- Article 3162 (Test article, STORABLE) returned correctly
- Fix required during setup: `webhookId` missing from webhook node → path was `{workflowId}/webhook/qa2u01-get` instead of `qa2u01-get`; corrected via PUT + deactivate/activate cycle
- Fix required during setup: `articleId` missing `__rl: true` → URL resolved to `/article/id/[object Object]`; corrected to `{"__rl":true,"mode":"id","value":"3162"}`

### T3 — create — PASS

- Webhook: `qa2u01-create`
- Created `QA2-U01-TEST-001` (STORABLE) — id 6424303
- Cleaned up via weclapp DELETE after test

### T4 — createDatasheetPdf (F3 fix) — FAIL

- Webhook: `qa2u01-datasheet`
- Error: HTTP 400 "body is not a json object" (execution 777)
- Root cause: The node sends a POST with an empty body. weclapp requires at minimum a valid JSON body (`{}`). Furthermore the weclapp API for `createDatasheetPdf` requires `commercialLanguageId` and `salesChannel` in the body — both are not defined as parameters in the node description.
- F3 fix added `binaryData` postReceive (for when the request succeeds), but the request itself still fails at the body validation stage.
- **Bug remains: node missing body parameters `commercialLanguageId` and `salesChannel`.** Direct weclapp API call with `{"commercialLanguageId":"270","salesChannel":"GROSS1"}` returns HTTP 200 with valid PDF.

### T5 — createLabelPdf (F3 fix) — FAIL

- Webhook: `qa2u01-label`
- Error: HTTP 400 "body is not a json object" (execution 779)
- Same root cause as T4: empty body, missing `commercialLanguageId`, `salesChannel`, `printCount`, `startPosition` parameters.
- **Bug remains: node missing required body parameters.**

### T6 — downloadMainArticleImage (F3 fix) — PARTIAL

- Webhook: `qa2u01-dlimage`
- HTTP 200, content-type `image/png`, 12,164 bytes delivered
- Response body: `{"type":"Buffer","data":[137,80,78,71,...]}` — raw Node.js Buffer JSON serialization
- Investigation: F3's `binaryData` postReceive IS running — confirmed by:
  1. `item.binary.data` is populated (content-type `image/png` served when `responseData: firstEntryBinary` is set)
  2. The Buffer bytes decode to valid PNG (3531-byte PNG starting with `\x89PNG`)
- Root cause of remaining failure: **n8n platform bug in `WebhookRequestHandler.sendStaticResponse`**: when `body` is a `Buffer`, the code calls `res.json(body)` instead of `res.send(body)`, JSON-serializing the Buffer. The code path checks only `typeof body === 'string'` → `res.send(body)` else `res.json(body)`.
- The `responseNode` mode with `setupResponseNodePromise` has `Buffer.isBuffer(response.body)` check and calls `res.end(body)` — so binary works only via "Respond to Webhook" node, not via `lastNode` mode.
- **Verdict: F3 fix is correct — the weclapp node stores binary properly. The remaining failure is an n8n platform-level bug outside the scope of this node package.**
- Workaround: users must add a "Respond to Webhook" node set to `responseMode: responseNode` downstream of the weclapp node for binary operations.

### T7 — packagingUnitStructure — FAIL (regression unchanged)

- Webhook: `qa2u01-packaging`
- HTTP 200, 7,284 bytes
- Response: full article entity JSON (not the packaging structure)
- Root cause: missing `{type: 'rootProperty', properties: {property: 'result'}}` postReceive on the operation — the `GET /article/id/{id}/packagingUnitStructure` endpoint returns `{"result":[...]}` and without rootProperty extraction, the full response body is placed in `item.json`
- **Bug unchanged from v1. Not addressed by F1/F2/F3.**

### T8 — updatePrices (F2 fix) — PASS

- Webhook: `qa2u01-updateprices`
- Article 3162, grossPrice=9.99, currencyId=253 (EUR), salesChannel=GROSS1
- Response: `{"articleId":"3162","changed":true,"pricesBefore":[...],...}`
- `customOperations` dispatcher correctly routed to `executeUpdatePrices` handler
- v1 had this as N/A (issue #30); now PASS
- **F2 verified working.**

---

## Setup Issues Encountered (Infrastructure — not node bugs)

1. **`webhookId` missing from webhook nodes** — all QA2-U01 workflows needed `webhookId` added to their webhook nodes. Without it, n8n generates path as `{workflowId}/{nodeName}/{path}` instead of just `{path}`. Fixed via PUT + deactivate/activate.

2. **`__rl: true` missing from `articleId` resourceLocator values** — n8n's `isResourceLocatorValue()` requires `__rl: true` in the parameter object. Without it, `$parameter["articleId"]` returns `{mode,value}` as a raw object, producing URLs like `/article/id/[object Object]`. Fixed by adding `__rl: true` to all QA2-U01 workflow params.

3. **n8n container instability** — container crashed 3+ times during this session, likely due to the `checkIfWorkflowCanBeActivated` retry loop for workflows created post-startup (community package not registered in `installed_packages` DB). Recovered via `docker-compose up -d n8n` each time.

4. **`responseData: binaryData` not a valid webhook option** — n8n webhook `responseData` options are `firstEntryJson`, `firstEntryBinary`, `allEntries`, `noData`. `binaryData` is not recognized and falls through to `allEntries`. Must use `firstEntryBinary`.

---

## Bug Summary

| Bug | Severity | Status | Fix Needed |
|-----|----------|--------|------------|
| `createDatasheetPdf` / `createLabelPdf` missing body params | HIGH | **Open** | Add `commercialLanguageId`, `salesChannel` (+ `printCount`, `startPosition` for label) as required node parameters; add `body: {}` default |
| `downloadMainArticleImage` binary not served via webhook `lastNode` mode | HIGH | Platform bug (n8n) | Workaround: document "Respond to Webhook" node requirement; upstream n8n issue |
| `packagingUnitStructure` missing `rootProperty: result` | MED | **Open** | Add `{type: 'rootProperty', properties: {property: 'result'}}` postReceive |

---

## Fixes Verified

| Fix | Status |
|-----|--------|
| F1: `filtersPreSend` hook | VERIFIED — filter + limit work correctly |
| F2: `customOperations` dispatcher | VERIFIED — updatePrices dispatches and returns correct result |
| F3: `binaryData` postReceive | PARTIALLY VERIFIED — binary stored correctly in `item.binary`; webhook delivery limited by n8n platform bug |

---

## Cleanup

- Test workflows: 8 QA2-U01 workflows remain active (not cleaned up — needed for re-runs)
- Test articles: `QA2-U01-TEST-001` (id 6424303) — deleted via weclapp API after T3
- Prices modified: article 3162 GROSS1 price updated during T8 (from existing values to 9.99 EUR)
