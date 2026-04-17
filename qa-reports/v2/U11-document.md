# QA Report v2 — U11: Document Resource

**Branch:** `qa2/u11-document`
**Node version:** v0.2.0-pre (origin/main at commit `6d4ee87`)
**Tested against:** testhandel.weclapp.com
**n8n instance:** localhost:5678 (Docker `n8n-local`)
**Credential:** `jebRfSixFZZxu8qH` (weclapp testhandel)
**Date:** 2026-04-17
**QA prefix:** `QA2-U11-`
**Predecessor:** PR #51 (v1 smoke, no n8n node execution)

---

## Scope

Re-QA of the `document` resource after two v0.2.0-pre fixes:

- **F3** — binary routing (`binaryData` postReceive, `encoding: arraybuffer`, `returnFullResponse: true`) for `download`, `downloadDocumentVersion`, `downloadDocumentVersionsZipped`
- **F2** — `upload` operation via `documentUpload.ts` (multipart FormData, `customOperations` path)

Full n8n node execution for all operations (not direct API only).

---

## Test Results

### T1 · list

**Operation:** `document.list` (entityName=salesInvoice, entityId=4073)
**n8n exec:** Webhook `GET /qa2-u11-list` → HTTP 200
**Result:** 1 document returned, `id=salesInvoice.4073.4080`, correct metadata
**Status:** PASS

---

### T2 · get

**Operation:** `document.get` (documentId=salesInvoice.4073.4080)
**n8n exec:** Webhook `GET /qa2-u11-get` → HTTP 200
**Result:** `id=salesInvoice.4073.4080`, `name=R-RE1000-Kdnr-10013.pdf`
**Status:** PASS

---

### T3 · download (binary)

**Operation:** `document.download` (documentId=salesInvoice.4073.4080)
**n8n exec:** Webhook `GET /qa2-u11-download` → HTTP 200
**Result:** Buffer (type=Buffer, len=59620) — PDF bytes confirmed (`%PDF` magic)
**Direct API check:** HTTP 200, `Content-Type: application/pdf`, 59620 bytes
**Status:** PASS — F3 fix confirmed working

---

### T4 · downloadDocumentVersion (binary)

**Operation:** `document.downloadDocumentVersion` (documentId=salesInvoice.4073.4080, versionId=4082)
**n8n exec:** Webhook `GET /qa2-u11-dlver` → HTTP 200
**Result:** Buffer (type=Buffer, len=59620) — PDF bytes confirmed
**Direct API check:** HTTP 200, `Content-Type: application/pdf`, 59620 bytes
**Status:** PASS — F3 fix confirmed working

---

### T5 · downloadDocumentVersionsZipped (binary)

**Operation:** `document.downloadDocumentVersionsZipped` (documentId=salesInvoice.4073.4080)
**n8n exec:** Webhook `GET /qa2-u11-dlzip` → HTTP 200
**Result:** Buffer (type=Buffer, len=58141) — ZIP magic `PK` (0x504b) confirmed
**Direct API check:** HTTP 200, `Content-Type: application/zip`, 58141 bytes
**Status:** PASS — F3 fix confirmed working

---

### T6 · copy

**Operation:** `document.copy` (documentId=article.3162.217834, copySourceDocumentId=article.3162.217834)
**n8n exec:** Webhook `POST /qa2-u11-copy` → HTTP 200
**Result:** doc `article.3162.217834`, versions count 2 (new version added with comment "QA2-U11 n8n copy test")
**Note:** `copySourceDocumentId` in body must be the compound document ID (`entity.entityId.docId`), NOT the plain version ID. Sending numeric version ID returns `400 invalid sourceDocumentId`.
**Status:** PASS

---

### T7 · delete

**Operation:** `document.delete` (documentId=article.3162.6423617 — QA-uploaded doc)
**n8n exec:** Webhook `POST /qa2-u11-delete` → HTTP 200
**Result:** `{"deleted": true}` — confirmed; direct API GET returns 404 afterward
**Status:** PASS

---

### T8 · upload (NEW — F2)

**Operation:** `document.upload` (entityName=article, entityId=3162, binary PDF via FormData)

#### First attempt — BUG FOUND

**Error:** `Document upload failed: Invalid URL`
**Root cause:** `documentUpload.ts → postMultipart()` called `httpRequestWithAuthentication` with a relative URL (`/document/upload`). The `customOperations` path in n8n does NOT automatically apply `requestDefaults.baseURL` from the node description. Only the declarative routing engine gets that. The relative URL fails URL validation in the underlying axios/undici client.

**Fix applied (in this QA branch):**
```typescript
// In postMultipart():
const creds = await ctx.getCredentials('weclappApi');
const baseUrl = (creds.baseUrl as string).replace(/\/$/, '');
const absoluteUrl = `${baseUrl}${endpoint}`;
// Then: url: absoluteUrl
```

**After fix + Docker restart:**
**n8n exec:** Webhook `POST /qa2-u11-doc-upload` → HTTP 200
**Result:**
```json
{
  "id": "article.3162.6423922",
  "version": "1",
  "documentSize": 541,
  "mediaType": "multipart/form-data;boundary=axios-1.12.0-boundary-...",
  "name": "QA2-U11-n8n-test.pdf"
}
```
**Status:** PASS (after fix)

#### mediaType observation

The returned `mediaType` is `multipart/form-data;boundary=...` rather than `application/pdf`. This is **weclapp API behavior** — the endpoint reflects the outer multipart Content-Type rather than the individual part's MIME type. Confirmed by direct `curl -F` test (same behavior without the node). Not a node bug.

---

## Findings

| Severity | Area | Finding |
|----------|------|---------|
| HIGH | `upload` (F2) | **BUG — `Invalid URL` in `postMultipart()`**: `customOperations` bypass declarative routing; relative URL fails. Fix: resolve `baseUrl` from credentials and prepend to endpoint. Fixed in this branch. |
| LOW | `upload` (API) | `mediaType` returned by weclapp reflects outer multipart envelope (`multipart/form-data;boundary=...`), not the file part's MIME type. weclapp API limitation, not a node bug. |
| LOW | `copy` | `copySourceDocumentId` (body field `sourceDocumentId`) must be the compound document ID (`entity.entityId.docId`), not a plain numeric version ID. The field label says "Source Document ID" which is correct, but users may confuse it with a version ID. No code change needed; could add a description hint. |

---

## Stale Docs from PR #51

| Doc ID | Status | Notes |
|--------|--------|-------|
| `purchaseInvoice.11600.6423436` | Gone — PI 11600 doc list returns empty | Versions were inside `purchaseInvoice.11600.6423229`; that doc appears auto-cleaned by weclapp or was deleted by another process |
| `purchaseInvoice.11600.6423438` | Gone — same | |

Version-level delete is not supported by the weclapp document API. Two QA copy-versions remain on pre-existing test articles (`article.3162.177380` ver `6423512`, `article.3162.217834` ver `6423599`) — these are benign additions to test data and cannot be individually removed.

---

## Cleanup

| Item | Action | Result |
|------|--------|--------|
| `article.3162.6423922` (n8n upload) | `DELETE /document/id/...` | HTTP 204 — deleted |
| `article.3162.6423518` (direct API upload) | `DELETE /document/id/...` | HTTP 204 — deleted |
| n8n QA workflows (3×) | Deactivated + deleted via API | Done |
| Version 6423512 on article.3162.177380 | Cannot delete (no API) | Remains — benign |
| Version 6423599 on article.3162.217834 | Cannot delete (no API) | Remains — benign |

---

## Bug Fix Required

The `upload` operation (and by extension `uploadNewVersion`) requires a one-line fix in `documentUpload.ts`:

**File:** `nodes/Weclapp/actions/documentUpload.ts` — `postMultipart()` function
**Change:** Resolve `weclappApi` credential's `baseUrl`, strip trailing slash, prepend to `endpoint` before passing to `httpRequestWithAuthentication`.

**This fix is committed in the `qa2/u11-document` branch.** Must be merged before v0.2.0-pre ships.

The same pattern applies to `uploadNewVersion` — it shares the same `postMultipart` helper so the fix covers both.

---

## Summary

| Operation | Protocol | Status |
|-----------|----------|--------|
| list | declarative | PASS |
| get | declarative | PASS |
| download | declarative + binaryData (F3) | PASS |
| downloadDocumentVersion | declarative + binaryData (F3) | PASS |
| downloadDocumentVersionsZipped | declarative + binaryData (F3) | PASS |
| copy | declarative | PASS |
| delete | declarative | PASS |
| upload | customOperation (F2) | PASS after bug fix |

**F3 (binary routing):** Confirmed working for all 3 binary download operations.
**F2 (upload):** Bug found and fixed — `customOperations` must use absolute URLs.
