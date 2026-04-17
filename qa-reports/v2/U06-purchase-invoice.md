# QA Report v2 — U06 PurchaseInvoice

Date: 2026-04-17
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678 (n8n 1.120.4, docker)
weclapp tenant: testhandel (testhandel.weclapp.com)
Node build: n8n-nodes-weclapp v0.1.0 + PRs #65 (F3), #60 (F4), #30 (F2) + PR #101 (baseURL fix)

---

## PRs Under Test

| PR | Fix |
|----|-----|
| **F2** PR #30 | `customOperations` dispatcher — `applyPayment` composite now reachable |
| **F3** PR #65 | `downloadLatestPurchaseInvoiceDocument` + `printLabel` binary routing (`encoding: arraybuffer`, `postReceive: binaryData`) |
| **F4** PR #60 | `body: {}` removed from empty-body POST actions (resetTaxes, convertToCreditNote, saveDuplicateInvoiceAsOriginal) |

---

## Infrastructure

Node built from `qa2/u06-purchase-invoice` branch (merged main at commit `a478da6` which includes PR #101 fix for baseURL regression in `weclappApiRequest`). Files hot-patched into `/home/node/.n8n/.n8n/nodes/node_modules/n8n-nodes-weclapp/dist/nodes/Weclapp/` via host volume mount.

**Important discovery:** The installed node's `weclappApiRequest` in the pre-#101 build passed relative paths directly as `url` to `httpRequestWithAuthentication`, causing "Invalid URL" for all `customOperations` (which bypass `requestDefaults.baseURL` injection). PR #101 adds `resolveWeclappUrl` to prepend credentials `baseUrl`. The qa2/u06 test build must include PR #101 alongside F2/F3/F4.

---

## Operations Tested

| Op | Workflow ID | Exec ID | HTTP | Result | Notes |
|----|------------|---------|------|--------|-------|
| list | w6V6ivxksnePpRLm | 783 | 200 | **PASS** | 5 items returned (limit=5) |
| list-filter | Ni0VjDAw0GzGQuy5 | 784 | 200 | **PASS** | Filter passed correctly; testhandel has no INVOICE_RECEIVED invoices (data limitation) |
| get | H3lalgb7vi54pgkZ | 785 | 200 | **PASS** | id=8281 returned with correct fields |
| reset-taxes | Kn48HVwVgUDkroYl | 806 | 400 | **FAIL (F4)** | F4 regression — see bug F4-REG below |
| convert-credit-note | vk621LxYabQTbY9d | 786 | 400 | **FAIL (F4)** | F4 regression — same cause |
| download-doc | zdU0fXkGCfDetyyq | — | 200 | **PASS (F3)** | Binary `%PDF-1.3` header confirmed in response buffer; binaryData postReceive routing works |
| print-label | nHJMpHTkhyf3nSMu | 788 | 200 | **PASS (F3)** | 60,709-byte `%PDF-1.6` PDF returned as n8n binary output |
| apply-payment | 5xca1q3BemTShOFR | 789 | — | **PASS-PARTIAL (F2)** | Dispatcher works; API call reaches `createPaymentApplication` at line 123; fails with weclapp 400 (party mismatch + wrong body key) |
| crud-create | Egh6XxRe1pcyoRD2 | — | 200 | **PASS** | Created id=6424397 invoiceNumber=QA2-U06-TEST-001 |
| crud-update | MzW1sttq6Rpl6qAh | 791 | 200 | **PASS** | invoiceNumber updated to QA2-U06-TEST-001-UPD-{ts} |
| crud-delete | JJjOZXeBg5Q64DYY | 792 | 200 | **PASS** | `{deleted: true, id: "6424397"}` returned |

---

## PR Verdicts

### F3 — Binary routing (downloadLatestPurchaseInvoiceDocument + printLabel)

**PASS.**

Both operations now have correct declarative routing:
- `encoding: 'arraybuffer'`
- `returnFullResponse: true`
- `postReceive: [{type: 'binaryData', properties: {destinationProperty: 'data'}}]`

`download-doc` (invoice 228352): HTTP 200, response buffer starts `[37, 80, 68, 70, 45, 49, 46, 51]` = `%PDF-1.3`. (The PDF body is empty in testhandel but the binary routing headers are present and correct.)

`print-label` (invoice 11600): HTTP 200, 60,709-byte PDF, buffer starts `[37, 80, 68, 70, 45, 49, 46, 54]` = `%PDF-1.6`. Full binary download confirmed.

---

### F4 — Empty body removed from POST actions

**FAIL — REGRESSION INTRODUCED.**

PR #60 removed `body: {}` from the `routing.request` of `resetTaxes`, `convertPurchaseInvoiceToCreditNote`, and `saveDuplicateInvoiceAsOriginal`. When no body is specified in n8n declarative routing with `Content-Type: application/json`, the HTTP request is sent with an empty body (no Content-Length header). The weclapp Akamai CDN returns:

```
HTTP 400 Bad Request
Your browser sent a request that this server could not understand.
Reference #7.bc79ca17...
```

Direct API verification:
```bash
# With body: {}  → HTTP 200 (or weclapp-side validation error, but reaches app)
curl -X POST -H "Content-Type: application/json" -d '{}' .../purchaseInvoice/id/228352/resetTaxes
→ HTTP 200, {"result": {...}}

# Without body → CDN blocks at edge, returns HTML 400
curl -X POST -H "Content-Type: application/json" .../purchaseInvoice/id/228352/resetTaxes
→ HTTP 400, HTML body
```

**Fix required:** Restore `body: {}` to all three operations. The original v1 behavior (sending empty JSON object) was correct — weclapp's CDN requires a Content-Length > 0 for all POST requests.

Affected operations: `resetTaxes`, `convertPurchaseInvoiceToCreditNote`, `saveDuplicateInvoiceAsOriginal`.

---

### F2 — customOperations dispatcher for applyPayment

**PASS (partial — composite dispatcher confirmed reachable).**

The `customOperations.purchaseInvoice.applyPayment` handler is correctly wired. Execution stack trace confirms the flow:

```
ExecuteContext.applyPayment (Weclapp.node.ts:210)
  → ExecuteContext.executeApplyPayment (applyPayment.ts:57 → :123)
    → weclappApiRequest → resolveWeclappUrl → httpRequestWithAuthentication
```

**Important prerequisite:** F2 requires PR #101 (baseURL regression fix) to be included in the build. Without `resolveWeclappUrl`, `weclappApiRequest` passes relative paths (e.g., `/purchaseInvoice/id/11600`) directly as `url` to `httpRequestWithAuthentication`, which throws "Invalid URL". The qa2/u06 branch must be built from a commit that includes both PR #30 and PR #101.

**Testhandel data limitation:** No invoice/bankTransaction pair exists in testhandel with matching party and amount. The test used invoice 11600 (supplierId=2757, grossAmount=2975) and bankTransaction 11770 (partyId=2931, amount=-2975). Amount validation passes (abs(2975) == abs(-2975)), but `createPaymentApplication` returns weclapp 400 "different party in openItem and moneyTransaction".

**Additional bug discovered (applyPayment.ts):** The code sends `{bankTransactionId}` in the POST body of `createPaymentApplication`, but direct API testing shows weclapp expects `{moneyTransactionId}`. The OpenAPI spec shows `bankTransactionId` as the field name, but the live API rejects it with "missing parameter: moneyTransactionId". Using `moneyTransactionId` advances further to the party-mismatch error, confirming the field name in the code is wrong.

---

## Additional Bugs Found

### [CRIT] F4 regression — body:{} removal breaks all empty-body POST actions

Already described above. Must be reverted in PR #60.

### [CRIT] F2 dependency — applyPayment requires PR #101 (baseURL fix)

Without `resolveWeclappUrl` (introduced in PR #101), all `customOperations` fail with "Invalid URL" because relative paths are passed as URL to `httpRequestWithAuthentication`. F2 (PR #30) cannot function independently without this fix. The qa2/u06 branch needs to be rebased or have PR #101 merged before testing.

### [HIGH] applyPayment.ts body key wrong: sends `bankTransactionId`, API expects `moneyTransactionId`

**File:** `nodes/Weclapp/actions/applyPayment.ts`, line 123
```typescript
const result = await weclappApiRequest.call(
    this,
    'POST',
    `/purchaseOpenItem/id/${openItemId}/createPaymentApplication`,
    { bankTransactionId },  // ← WRONG — should be moneyTransactionId
);
```
Direct test: `{"bankTransactionId":"11770"}` → weclapp 400 "missing parameter: moneyTransactionId"; `{"moneyTransactionId":"11770"}` → weclapp 400 "different party" (advances further, confirming correct field).

The OpenAPI spec (`/purchaseOpenItem/id/{id}/createPaymentApplication`) documents `bankTransactionId`, but the live API requires `moneyTransactionId`. The code should use `moneyTransactionId`. The spec should be updated too.

### [MED] update operation sends empty invoiceDate/supplierId causing weclapp 400

When `invoiceDate` and `supplierId` are left at their default empty string values in an `update` workflow, the node sends `invoiceDate: ""` and `supplierId: ""` in the PUT body. weclapp rejects the empty invoiceDate string with `{error: "invalid data"}` even with `ignoreMissingProperties=true`.

**Cause:** All `bodyFields` (invoiceDate, invoiceNumber, supplierId) have `routing.send.type: 'body'` — they are always included in the body regardless of value. The correct fix is to only send these fields if they are non-empty (use `routing.send.preSend` or move them to an `updateFields` collection with conditional send logic).

### [LOW] list-filter: testhandel has no INVOICE_RECEIVED invoices — filter validation blocked

The filter `status-eq=INVOICE_RECEIVED` is sent correctly by the node, but testhandel has no invoices in that status (they all have OCR_VERIFICATION or OPEN_ITEM_CREATED). Unable to validate filter correctness end-to-end. Direct API confirms the node sends the correct query parameter format.

---

## Execution IDs

| Operation | Workflow ID | Exec ID | n8n Status |
|-----------|------------|---------|-----------|
| list | w6V6ivxksnePpRLm | 783 | success |
| list-filter | Ni0VjDAw0GzGQuy5 | 784 | success |
| get | H3lalgb7vi54pgkZ | 785 | success |
| reset-taxes | Kn48HVwVgUDkroYl | 806 | error (F4) |
| convert-credit-note | vk621LxYabQTbY9d | 786 | error (F4) |
| download-doc | zdU0fXkGCfDetyyq | — | success |
| print-label | nHJMpHTkhyf3nSMu | 788 | success |
| apply-payment | 5xca1q3BemTShOFR | 789 | error (party mismatch) |
| crud-create | Egh6XxRe1pcyoRD2 | — | success |
| crud-update | MzW1sttq6Rpl6qAh | 791 | success |
| crud-delete | JJjOZXeBg5Q64DYY | 792 | success |

---

## Cleanup

QA2-U06 workflows to delete after this report:
- w6V6ivxksnePpRLm (list)
- Ni0VjDAw0GzGQuy5 (list-filter)
- H3lalgb7vi54pgkZ (get)
- Kn48HVwVgUDkroYl (reset-taxes)
- vk621LxYabQTbY9d (convert-credit-note)
- zwok3Ruc0bQfKn83 (duplicate convert-credit-note)
- zdU0fXkGCfDetyyq (download-doc)
- nHJMpHTkhyf3nSMu (print-label)
- 5xca1q3BemTShOFR (apply-payment)
- Egh6XxRe1pcyoRD2 (crud)
- MzW1sttq6Rpl6qAh (crud-update)
- JJjOZXeBg5Q64DYY (crud-delete)

Invoice created: id=6424397 — deleted (exec 792, confirmed).

No entities orphaned.
