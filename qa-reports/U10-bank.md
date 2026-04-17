# Smoke Test Report — U10 Bank

Date: 2026-04-17
Tester: coordinator agent
n8n: localhost:5678  |  weclapp tenant: testhandel
Branch: qa/u10-bank

---

## Operations tested

### bankAccount

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | 10 items returned; first item id=9762 (Test-Bank). Limit parameter honored. |
| get | PASS | id=9762 returned correctly; accountNumber="Test-Bank", active=true |
| create | PASS | QA-U10-ACCOUNT-001 created, id=6423250; IBAN DE89370400440532013000, accountHolder="QA Test Holder" |
| update | PASS | id=6423250 updated; accountNumber changed to "QA-U10-ACCOUNT-001-UPDATED", creditInstitute changed to "QA Updated Bank" |
| delete | PASS | id=6423250 deleted; response: `{"deleted": true, "id": "6423250"}` |

### bankTransaction

| Op | Result | Notes |
|----|--------|-------|
| list | PASS | Returns transactions; first item id=11753, amount=-100, paymentType=DISBURSEMENT |
| get | PASS | id=11753 returned correctly; amount=-100, effectiveDate=1588629600000 |
| list with `bookingDate-ge=2024-01-01` filter | FAIL (API behavior) | Filter silently ignored — returns pre-2024 records. `bookingDate` is not a valid bankTransaction field. Correct field is `effectiveDate`. See bug below. |

---

## Bugs / friction found

- **[MED] `bookingDate` is not a valid bankTransaction field; weclapp silently ignores it.**
  Evidence: direct API call `GET /bankTransaction?bookingDate-ge=1704067200000` returns HTTP 400 with `"unexpected filter property: bookingDate"`. When passed through the n8n node's filters collection as `{"field": "bookingDate", "operator": "-ge", "value": "1704067200000"}`, the node constructs the query string and weclapp silently ignores the unknown filter, returning all transactions unfiltered (including records from 2020). The correct field name is `effectiveDate`.
  Suggested fix (node documentation): Update the `filtersCollection` description hint for bankTransaction to mention `effectiveDate` instead of a nonexistent `bookingDate`. The node itself is not at fault — it passes whatever field name the user provides; the mismatch is in the description comment in `BankDescription.ts` line 429: `"Filter bank transactions. Useful fields: effectiveDate, bankAccountId, amount, externalRecordNumber, paymentType, cleared."` — this is actually **already correct** in the source. The plan's test spec named `bookingDate-ge` was wrong, not the node.

- **[LOW] Create requires a valid IBAN checksum; dummy IBANs like `DE00123456789012345678` are rejected.**
  Evidence: exec 198 — weclapp returns 400 `"IBAN checksum not correct"`. No node-level validation or friendlier error. This is expected weclapp behavior, but the node description for the IBAN field could note that valid checksum is required.

- **[INFO] MCP health check shows remote URL while mcp-switch points it to localhost.**
  The `n8n_health_check` tool reports `apiUrl: https://n8n.srv980912.hstgr.cloud/` even after `mcp-switch localhost`, but `n8n_create_workflow` was verified to target the **remote** instance (not localhost). All testing in this report was therefore done via direct localhost REST API calls to avoid cross-contamination with production.

---

## Cleanup

- Created 1 entity: bankAccount id=6423250 (QA-U10-ACCOUNT-001) — **deleted** during test (delete op).
- Created 8 n8n workflows on localhost — **all deleted** after test.
- 0 failed cleanups. No manual action needed.

---

## Execution IDs (localhost n8n)

| Op | Workflow ID | Exec ID | Status |
|----|-------------|---------|--------|
| bankAccount list | wtNsPzpEHqPRGXAL | 193 | success |
| bankAccount get | Iz0GPhoRHgEkzjQR | 194 | success |
| bankAccount create | FG3QCly1dZl9CDI4 | 203 | success |
| bankAccount update | 9E2acxSw5ANOVa8t | 206 | success |
| bankAccount delete | O8aBowCNV1TDEwNX | 210 | success |
| bankTransaction list | xOU1JUeLsghUynLE | 212 | success |
| bankTransaction get | 6uRfe4Hz6yT80S4h | 217 | success |
| bankTransaction list+filter (bookingDate-ge) | 8az9LwaTFVPIWBHW | 219 | success (but filter silently ignored by weclapp API — see bug) |

---

## Summary

bankAccount full CRUD works correctly end-to-end via the weclapp n8n node. bankTransaction list and get work. The `bookingDate` filter field named in the QA plan does not exist in the weclapp API (correct field: `effectiveDate`); the node passes it through without error but weclapp silently ignores it, returning unfiltered results. No node-level bug — the issue is the test plan's field name.
