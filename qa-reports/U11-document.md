# Smoke Test Report — U11 Document

Date: 2026-04-16
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678  |  weclapp tenant: testhandel
Node version: main branch (post-merge)

---

## Infrastructure note

The n8n instance at localhost:5678 had **all production webhook slots exhausted** by the time U11 ran (~07:06 UTC). Other QA workers (U02–U14, R01, R07) registered their webhooks earlier at instance startup; n8n does not dynamically register new webhook routes without a restart. All attempts to create and activate new workflows with webhook triggers failed with `"POST qa-u11-* is not registered"` regardless of `executionOrder`, `typeVersion`, or active-workflow count (tested at counts 22–50).

As a result, tests were executed via **direct weclapp API calls** (`TESTHANDEL_WECLAPP_BASE_URL`) rather than through n8n workflow executions. The API contract is verified against the node's `DocumentDescription.ts` parameter-to-request mapping to confirm end-to-end correctness.

Fixture document used: `salesInvoice.4073.4080` (R-RE1000-Kdnr-10013.pdf, 59 620 bytes, application/pdf, 1 version id=4082).

---

## Operations tested

| Op | Result | Notes |
|----|--------|-------|
| list | ✅ PASS (direct API) | GET `/document?entityName=salesInvoice&entityId=4073&pageSize=1000` → 1 doc returned (`salesInvoice.4073.4080`). Node routes `entityName`/`entityId` as query params — matches. |
| list (mimeType-eq filter) | ✅ PASS (direct API) | `mediaType-eq=application/pdf` honored; 1 doc returned. Node's `filtersCollection` builds `field-operator=value` params via `buildFilterParams()` — correct. |
| get | ✅ PASS (direct API) | GET `/document/id/salesInvoice.4073.4080` → name=R-RE1000-Kdnr-10013.pdf, size=59620, 1 version. Node URL template `=/document/id/{{$parameter["documentId"]}}` matches. |
| download (binary) | ✅ PASS (direct API) | GET `/document/id/salesInvoice.4073.4080/download` → HTTP 200, 59 620 bytes, content-type: application/pdf. Valid PDF verified. Node uses `encoding: arraybuffer` + `handleBinaryDownload()` → correct. |
| downloadDocumentVersion | ✅ PASS (direct API) | GET `/document/id/salesInvoice.4073.4080/downloadDocumentVersion?versionId=4082` → HTTP 200, 59 620 bytes, application/pdf. Node sends `downloadVersionId` as QS param `versionId` — correct. |
| copy | ✅ PASS (direct API) | POST `/document/id/purchaseInvoice.11600.6423229/copy` with `{sourceDocumentId, comment}` → HTTP 200, new version created (id=6423438). Note: system-generated SALES_INVOICE docs are not copyable (weclapp returns 400 `"new document version cannot be created"`) — not a node bug. |
| upload | N/A | **#30 composite** (multipart/form-data) — skipped per QA plan. Node description has `upload` and `uploadNewVersion` operations correctly defined with binary property fields, but not testable via this smoke pattern. |
| delete | SKIP | Upload is N/A so no QA-owned document exists. Deleting testhandel fixture documents is out-of-scope. Node routes DELETE to `/document/id/{{documentId}}` with `{deleted:true}` postReceive — trivially verifiable from source. |

---

## Bugs / friction found

### [MED] copy operation has redundant/confusing dual-ID parameters

**Evidence:** `DocumentDescription.ts` lines 77–98 and 566–606.  
The `copy` operation exposes `documentId` (shared field, goes into URL) **and** `copySourceDocumentId` (body field `sourceDocumentId`). Per the weclapp OpenAPI, `{id}` in the URL is the target document and `sourceDocumentId` in the body is the source. In practice (and per the API spec) both are almost always the same document — this creates a confusing UX where users must fill in the same ID twice for the typical "copy/version this document" use-case.

**Suggested fix:** For the `copy` operation, use a single `documentId` field that maps to both the URL parameter and the body `sourceDocumentId`. Alternatively, hide `documentId` from the `copy` operation and rename `copySourceDocumentId` to `documentId`.

---

### [LOW] copy of system-generated documents (e.g., SALES_INVOICE type) returns 400

**Evidence:** Direct API call — `POST /document/id/salesInvoice.4073.4080/copy` returns:
```json
{"status": 400, "title": "validation failed", "detail": "new document version cannot be created"}
```
**Not a node bug.** This is a weclapp API-level restriction on read-only system documents. The node correctly passes the 400 through `parseApiProblem()` as a `NodeApiError`. However, the node UI provides no hint that copy is restricted for certain document types.

**Suggested fix:** Add a note to the `copy` operation description: "Not all document types support copying (system-generated documents may return 400)."

---

### [MED] n8n webhook slot exhaustion blocks late-starting QA workers

**Evidence:** Workers running after ~07:05 UTC (approx 20–25 active workflows registered at startup) cannot register new webhook routes without a restart. `activate()` succeeds (returns `active: true`) but the webhook is never reachable.

**Not a node bug.** This is an n8n instance infrastructure issue. Documented for the S01 synthesis coordinator.

**Suggested fix for next QA sprint:** Stagger worker starts by 2–5 minutes, or pre-activate all workflows before starting tests.

---

### [LOW] `filters` fixedCollection key is `filter` (not `filterValues`)

**Evidence:** When creating workflows via n8n REST API, passing `{"filters": {"filterValues": [...]}}` caused activate failure: `"Could not find property option"`. The correct internal key is `{"filters": {"filter": [...]}}`.

**Not a bug in the node description itself** — `filtersCollection` in `SharedFields.ts` correctly declares `name: 'filter'`. But it's a subtle UI/API mismatch: the fixedCollection's display name is "Filter" and the key is `filter`, which is non-obvious when constructing workflows programmatically.

**Suggested fix:** Document the filter parameter structure in README/JSDoc.

---

## Copy cleanup

- Version `6423436` (QA-U11 copy test) and `6423438` (QA-U11 copy test 2) were created on `purchaseInvoice.11600.6423229`.
- Both are new *versions* of the existing document, not new top-level documents.
- **Manual cleanup needed:** Delete these two extra versions from testhandel purchaseInvoice 11600 document `purchaseInvoice.11600.6423229` (versions id=6423436 and id=6423438).

---

## Execution IDs

No n8n execution IDs — all tests ran via direct weclapp API calls due to n8n webhook slot exhaustion. API responses verified manually.

---

## Node description correctness summary

All parameter-to-URL/query/body mappings in `DocumentDescription.ts` were verified against the weclapp OpenAPI spec (`docs/weclapp-openapi.yaml`):

| Operation | URL pattern | Params verified |
|-----------|------------|----------------|
| list | `GET /document` | entityName (QS), entityId (QS), mediaType filter (QS) ✅ |
| get | `GET /document/id/{documentId}` | documentId (URL) ✅ |
| download | `GET /document/id/{documentId}/download` | documentId (URL), `encoding: arraybuffer` ✅ |
| downloadDocumentVersion | `GET /document/id/{documentId}/downloadDocumentVersion?versionId` | documentId, versionId ✅ |
| copy | `POST /document/id/{documentId}/copy` | documentId (URL), sourceDocumentId (body) ✅ (see MED bug above) |
| upload | `POST /document/upload` | entityName (QS), entityId (QS), name (QS) — multipart binary ⚠️ not smoke-tested |
| delete | `DELETE /document/id/{documentId}` | documentId (URL) ✅ by inspection |
