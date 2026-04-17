# QA2 Re-Test Report — U10 Bank (v0.2.0-pre)

Date: 2026-04-17
Tester: coordinator agent
n8n: localhost:5678 | weclapp tenant: testhandel
Branch: qa2/u10-bank (from origin/main @ 6d4ee87)
Prefix: QA2-U10-
Cred: jebRfSixFZZxu8qH (weclapp testhandel)

---

## Context: what changed since PR #39

PR #39 (`qa/u10-bank`) documented the original U10 smoke test results:

- bankAccount CRUD: all PASS at API level but node-level filter was a **silent no-op** (fix #57 not yet merged)
- bankTransaction filter: tested with `bookingDate-ge` (wrong field); silently ignored by weclapp

Since PR #39, fixes merged to `main`:
- **fix #57** (`c65eb53`): `filtersCollection` now carries `routing.send.preSend: [filtersPreSend]` — filters are actually sent to the weclapp API
- **fix #58** (`c65eb53`): removed `displayOptions` from fixedCollection child field (`value`) — prevents n8n "max iterations" crash
- Several other fixes: #59 trigger, #60 empty body, #61 party, #62 ticket, #63 tag, #64 enums, #65 binary routing, #29 composite dispatcher, #30 dispatcher, #31 test failures

This re-QA verifies fix #57 (F1) at the node level using the correct field `effectiveDate-ge` for bankTransaction.

---

## Test matrix

All 8 ops executed via webhook-triggered n8n workflows on localhost using the `n8n-nodes-weclapp.weclapp` node (production workflows, not test mode).

### bankAccount (CRUD)

| Op | Result | Exec | Notes |
|----|--------|------|-------|
| list | PASS | 424 | 9 accounts returned; first id=9762 (Test-Bank). Limit=10 honored. |
| get | PASS | 420 | id=9762 returned; accountNumber="Test-Bank", active=true |
| create | PASS | 425 | QA2-U10-ACCOUNT-001 created, id=6423692; IBAN DE89370400440532013000, accountHolder="QA2 Test Holder" |
| update | PASS | 426 | id=6423692 updated; accountNumber → "QA2-U10-ACCOUNT-001-UPDATED", creditInstitute → "QA2 Updated Bank" |
| delete | PASS | 427 | id=6423692 deleted; `{"deleted": true, "id": "6423692"}` |

### bankTransaction (read + filter)

| Op | Result | Exec | Notes |
|----|--------|------|-------|
| list | PASS | 421 | 5 items returned (limit=5); first id=11753, effectiveDate=1588629600000 |
| get | PASS | 422 | id=11753 returned; amount=-100, effectiveDate=1588629600000 |
| list + `effectiveDate-ge=2024-01-01` filter | **PASS (F1 VERIFIED)** | 423 | 100 items returned; **all effectiveDate ≥ 1704067200000 (2024-01-01)**. Min effective date: 1705070772031 (2024-01-12). Zero pre-2024 records leaked. Filter was previously a silent no-op (fix #57). |

---

## F1 fix verification detail

**Filter config sent (exec 423):**
```json
{
  "resource": "bankTransaction",
  "operation": "list",
  "returnAll": false,
  "limit": 100,
  "filters": {
    "filter": [{"field": "effectiveDate", "operator": "ge", "value": "1704067200000"}]
  }
}
```

**Result:** 100 items, all effectiveDate ≥ 1704067200000. Item[0]: id=160573, effectiveDate=1705070772031. Item[1]: id=165846, effectiveDate=1708001321175.

**v1 comparison (PR #39 exec 219):** filter was silently ignored — returned pre-2024 records (e.g. id=11753 with effectiveDate=1588629600000 from 2020). Now correctly excluded.

The `filtersPreSend` hook in `SharedFields.ts` (fix #57) reads the `filters` fixedCollection, calls `buildFilterParams`, and merges `effectiveDate-ge=1704067200000` into the request's `qs`. Confirmed working end-to-end at the node level.

---

## Delta vs PR #39

| Op | v1 (PR #39) | v2 (this report) | Change |
|----|-------------|------------------|--------|
| bankAccount list | PASS | PASS | stable |
| bankAccount get | PASS | PASS | stable |
| bankAccount create | PASS | PASS | stable |
| bankAccount update | PASS | PASS | stable |
| bankAccount delete | PASS | PASS | stable |
| bankTransaction list | PASS | PASS | stable |
| bankTransaction get | PASS | PASS | stable |
| bankTransaction filter | FAIL (silent no-op, wrong field) | **PASS (F1 fixed)** | **fixed by #57** |

---

## Bugs / friction

None new. All previously documented issues resolved:
- fix #57 eliminates the silent filter drop
- `effectiveDate` (not `bookingDate`) is the correct filter field for bankTransaction; node description at line 428 of `BankDescription.ts` already correctly names `effectiveDate`

Residual note: IBAN checksum validation is enforced by weclapp on bankAccount create. Use valid IBANs (e.g. DE89370400440532013000). No node-level validation or friendlier error — expected weclapp behavior.

---

## Cleanup

- Created 1 weclapp entity: bankAccount id=6423692 (QA2-U10-ACCOUNT-001) — **deleted** during test (delete op)
- Created 8 n8n workflows on localhost — **all deleted** after test
- 0 failed cleanups. No manual action needed.

---

## Execution summary

| Op | Workflow ID | Exec ID | Status |
|----|-------------|---------|--------|
| bankAccount list | Jkp9rQS1y3RQrGi7 | 424 | success |
| bankAccount get | Pjl3PJ9j2h9olg5p | 420 | success |
| bankAccount create | DuTqhJI7cCDiYlyW | 425 | success |
| bankAccount update | ygdIUwODqMAMMDm3 | 426 | success |
| bankAccount delete | VHtex6IVzPgaWz9O | 427 | success |
| bankTransaction list | 1HIcTWFE7W2L1XHd | 421 | success |
| bankTransaction get | 09CA9RbcMW3gvXMJ | 422 | success |
| bankTransaction list+filter | 1cSMkIl2HpYI4QkZ | 423 | success |

---

## Summary

All 8 ops PASS. bankAccount full CRUD works end-to-end via the node. bankTransaction list and get work. The `effectiveDate-ge` filter (fix #57 / F1) works correctly at the node level: 100 transactions returned, all dated 2024-01-01 or later, zero pre-2024 records leaked. This is a clean reversal of the v1 finding where filters were silently dropped.
