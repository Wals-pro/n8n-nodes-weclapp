# QA Report v2 — U12 productionOrder

Date: 2026-04-17
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678 | weclapp: testhandel
Branch: qa2/u12-production-order
Node version: 0.1.0 (symlinked from qa2-u07, commit 6d4ee87)
Re-tests fixes from PR #48 findings. Fixes landed in: fix/57-58-29-shared-fields-routing (#77), fix/65-binary-routing (#74).

---

## Operations tested

| Op | Result | Exec ID | Notes |
|----|--------|---------|-------|
| list | ✅ | 390 | 5 items returned (limit=5), rootProperty unwrap works |
| list with filter (status-eq=CLOSED) | ✅ | 363 | **F1 FIXED** — 5 CLOSED items, filter actually sent to API |
| get | ✅ | 354 | id=4394 retrieved correctly |
| create | ✅ | 401 | id=6423633, status=ENTRY\_IN\_PROGRESS, number=QA2-U12-TEST-001 |
| update | ✅ | 408 | pickingInstructions set, PUT with ignoreMissingProperties=true works |
| delete | ✅ | 409 | `{deleted: true, id: "6423633"}` |
| createPickingList | ❌ | 355 | **F3 NOT FIXED** — HTTP 400 "body is not a json object" (regression) |
| downloadLatestProductionOrderPdf | ⚠️ | 356 | binary.data correct (PDF 55.8 kB), but Buffer still leaks into json |

**Score: 6/8 — same pass rate as v1. F1 fixed; F3 unresolved (regression in failure mode).**

---

## F1 — Filter no-op: FIXED ✅

**Fix**: `filtersPreSend` preSend hook added to `filtersCollection.routing.send.preSend` in SharedFields.ts (PR #77 / fix/57-58-29-shared-fields-routing).

**Evidence**: Exec 363 — list-filter with `status-eq=CLOSED` returned exactly 5 CLOSED orders (ids 4394, 4483, 4558, 4647, 4774). All items have `status=CLOSED`. In v1, the same filter silently returned items of any status.

**Verification**: Direct weclapp API call `GET /productionOrder?status-eq=CLOSED&pageSize=5` also returns only CLOSED items — n8n result matches.

---

## F3 — createPickingList binary POST: NOT FIXED ❌ (regression)

**Fix attempt**: PR #74 (fix/65-binary-routing) removed `body: {}` from the createPickingList routing and added `returnFullResponse: true`. The intent was to prevent `encoding: arraybuffer` from corrupting the body.

**Result**: The fix changed the failure mode but did not resolve it:

| | v1 failure | v2 failure |
|--|-----------|-----------|
| HTTP status | 400 | 400 |
| weclapp error | "body is not a json object" | "body is not a json object" |
| Root cause | `body: {}` sent as arraybuffer-encoded binary | No body sent at all (Content-Length: 0) |

**Root cause analysis**: weclapp's `createPickingList` POST endpoint requires `Content-Type: application/json` with `{}` as body. Without an explicit body, n8n sends an empty body (verified via weclapp 400 response). n8n's declarative `encoding: arraybuffer` on a POST both (a) encodes the request body differently and (b) decodes the response as arraybuffer. Removing `body: {}` eliminated (a) but also eliminated the body entirely.

**Direct API evidence**:
- `POST /productionOrder/id/4394/createPickingList` with `-H "Content-Type: application/json" -d '{}'` → HTTP 200, PDF returned
- `POST /productionOrder/id/4394/createPickingList` with no body → HTTP 411 (Length Required)
- `POST /productionOrder/id/4394/createPickingList` with `-H "Content-Length: 0"` → HTTP 400 "body is not a json object"

**Required fix**: Move `createPickingList` to a `customOperation` handler in `Weclapp.node.ts` using `handleBinaryDownload()` from GenericFunctions.ts. The `customOperation` approach can POST with `{}` body + `application/json` Content-Type while reading the response as binary — bypassing the declarative routing limitation that conflates request encoding with response encoding.

Alternatively, implement a `preSend` hook that explicitly sets the request body to `{}` regardless of encoding, if n8n's routing DSL supports this.

---

## downloadLatestProductionOrderPdf — Partial fix ⚠️

**Fix**: `returnFullResponse: true` and `binaryData` postReceive added (PR #74).

**Progress**: In v1 — binary data was NOT set (Buffer leaked into json, no binary property). In v2:
- `binary.data` is correctly populated: mimeType=application/pdf, fileSize=55.8 kB ✅
- `json.type = "Buffer"` and `json.data = [37, 80, 68, 70, ...]` still present ❌

The buffer leaks into the json field alongside the correct binary property. Downstream nodes reading `item.json` get a useless byte array. Operationally usable (binary property is correct) but confusing.

**Required fix**: Same as createPickingList — move to `customOperation` using `handleBinaryDownload()`, which returns `{json: {}, binary: {data: binaryData}}` with empty json.

---

## Other findings (carry-forward from v1)

**[MED-UX] `status: NEW` accepted in UI but rejected by weclapp**: The `createAdditionalFields.status` and `updateFields.status` dropdowns list `NEW` as an option. weclapp returns 400 "production order cannot be created or updated with status NEW". Note: weclapp requires `status` to be set on create — omitting it returns 400 "status null". Suggested fix: remove `NEW` from options; document that create requires `ENTRY_IN_PROGRESS`.

**[INFO] testhandel has 151+ production orders** — all smoke coverage possible. Statuses: CLOSED (majority), ENTRY\_IN\_PROGRESS, STARTED, DOCUMENTS\_PRINTED, CANCELLED.

---

## Test data

| Item | Created | Deleted |
|------|---------|---------|
| productionOrder QA2-U12-TEST-001 (id=6423633) | exec 401 | exec 409 |

0 failed cleanups — all test data removed.

---

## Workflows created (localhost:5678)

| Workflow | ID |
|----------|----|
| QA2-U12-list | TXzrqWjX6eQdPhRG |
| QA2-U12-list-filter | BWtV9CIkEbpnaAll |
| QA2-U12-get | ddPe66TUptdNWzz5 |
| QA2-U12-create | B9Bfg6frBxRdunZO |
| QA2-U12-update | YmA9ldYFgBkuX9k5 |
| QA2-U12-delete | 3VAV8yxtucAwUUpm |
| QA2-U12-createPickingList | FQlwjRuP2kJC3pMn |
| QA2-U12-downloadPdf | ROjKnJkayrrMhan2 |

---

## Summary vs v1

| | v1 | v2 |
|--|----|----|
| list | ✅ | ✅ |
| list with filter | ❌ (silent no-op) | ✅ (F1 fixed) |
| get | ✅ | ✅ |
| create | ✅ | ✅ |
| update | ✅ | ✅ |
| delete | ✅ | ✅ |
| createPickingList | ❌ (body corrupted) | ❌ (no body sent — regression) |
| downloadPdf | ⚠️ (no binary prop) | ⚠️ (binary prop OK, json still leaks) |

F1 (filter): **fully fixed**.
F3 (createPickingList): **failure mode changed, not resolved** — still HTTP 400 from weclapp, different root cause.
F3 (downloadPdf): **partially fixed** — binary property now correct; json Buffer leak persists.
