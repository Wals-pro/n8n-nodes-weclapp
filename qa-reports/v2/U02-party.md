# Re-Smoke Test Report — U02 Party (v0.2.0-pre)

**Date:** 2026-04-17
**Tester:** QA agent U02 (automated)
**n8n:** localhost:5678 | weclapp tenant: testhandel
**Node version tested:** installed dist from `main` HEAD (6d4ee87) = post-merge of PRs #60, #61, #57/#58, #70, #71
**Baseline report:** `qa-reports/U02-party.md` (PR #52, v0.1 smoke test)

---

## Before / After Table (Bug Tracking from PR #52)

| # | Bug (v0.1 baseline) | PR fix | v0.2.0-pre result |
|---|---|---|---|
| 1 | Wrong `partyType` enum values (CUSTOMER/SUPPLIER/PROSPECT) → weclapp 400 | #61 | **FIXED** |
| 2 | `name` field unknown → weclapp 400; should be `company` | #61 | **FIXED** |
| 3 | `simplify` postReceive `type:'filter'` discards all items (always 0 returned) | #61 | **FIXED** (pass-through, returns items) |
| 4 | `createPublicPage` sends `body: {}`, weclapp 400 "body is not a json object" | #60 | **PARTIAL** — old 400 gone; node now sends no body, but weclapp API requires `{}` body (spec: `requestBody required: true`); execution errors. See T10 note. |
| — | `filtersCollection` filters silently dropped (preSend not wired) | #57/#58 | **FIXED** |

---

## Test Matrix

| Test | Operation | Scenario | Result | HTTP | Notes |
|---|---|---|---|---|---|
| T1 | list | `partyTypeFilter=ORGANIZATION` (Bug #1 re-test) | ✅ PASS | 200 | 5 items, all `partyType=ORGANIZATION` |
| T2 | list | `partyTypeFilter=PERSON` (F5: new enum) | ✅ PASS | 200 | 5 items, all `partyType=PERSON` |
| T3 | list | `simplify=true`, no type filter (Bug #3 re-test) | ✅ PASS | 200 | 5 items returned; previously always 0 |
| T4 | list | `filtersCollection partyType-eq=PERSON` (#57 re-test) | ✅ PASS | 200 | 5 items, all `partyType=PERSON`; filter applied correctly |
| T5 | create | `partyType=ORGANIZATION`, `company` field (Bug #1+#2 re-test) | ✅ PASS | 200 | id=6423621, partyType=ORGANIZATION, company=QA2-U02-TestOrg |
| T6 | create | `partyType=PERSON`, firstName+lastName (Bug #1 re-test) | ✅ PASS | 200 | id=6423628, partyType=PERSON |
| T7 | get | `simplify=true` on ORGANIZATION party (Bug #3 re-test) | ✅ PASS | 200 | 1 item returned; previously always 0 |
| T8 | get | `simplify=false` on PERSON party | ✅ PASS | 200 | 1 item, partyType=PERSON, firstName=QA2Fn |
| T9 | update | ORGANIZATION: `company` → `QA2-U02-TestOrg-Updated` | ✅ PASS | 200 | company updated, version=2 |
| T10 | createPublicPage | POST to `/party/id/{id}/createPublicPage` (Bug #4 re-test) | ⚠️ PARTIAL | 200* | Webhook returns HTTP 200 but n8n exec status=error. Old "body is not a json object" 400 gone. New issue: PR #60 removed `body:{}` but weclapp spec requires `requestBody` (even empty `{}`). Node errors internally. |
| T11 | delete | ORGANIZATION party (id=6423621) | ✅ PASS | 200 | `{deleted: true}` returned |
| T12 | delete | PERSON party (id=6423628) | ✅ PASS | 200 | `{deleted: true}` returned |

*T10: the webhook caller receives HTTP 200 with empty body because `respondToWebhook` with `allIncomingItems` returns 200/empty when the upstream weclapp node errored. The underlying weclapp API call fails.

---

## Execution Reference

| Test | Exec ID | Exec Status |
|---|---|---|
| T1–T6 | (workflows deleted, execs not captured) | success |
| T7 | n/a (cleanup error in test harness) | success (observed output) |
| T8 | n/a | success (observed output) |
| T9 | 411 | success |
| T10 | 428 | **error** |
| T11 | 429 | success |
| T12 | 430 | success |

---

## Findings

### FIXED (4 of 5 bugs resolved)

- **Bug #1** — `partyType` enum: `ORGANIZATION`/`PERSON` now correctly used in `partyTypeFilter` (list) and `partyFields.partyType` (create). Verified via T1, T2, T5, T6. weclapp accepts without error.

- **Bug #2** — `company` field: `Company Name` field now sends `property: 'company'` in body. Verified via T5. weclapp accepts and returns `company: "QA2-U02-TestOrg"`.

- **Bug #3** — `simplify` postReceive: broken `type:'filter'` removed. `simplify=true` now passes through all items unchanged (documented as "reserved for future use"). Verified via T3 (list, 5 items) and T7 (get, 1 item). Previously returned 0 items.

- **filtersCollection (#57/#58)** — `filtersPreSend` now wired to the collection. T4 confirms `partyType-eq=PERSON` filter applied: 5 results, all `partyType=PERSON`. Previously returned mixed/unfiltered results.

### PARTIAL — Bug #4 createPublicPage (regression from PR #60)

The old failure was: PR #60 removed `body: {}` from createPublicPage routing, which eliminated the "body is not a json object" 400 error. However, the weclapp OpenAPI spec (`docs/weclapp-openapi.yaml` line 15411–15416) shows `requestBody` is `required: true` with schema `properties: {}`. weclapp therefore **requires** a JSON body even if empty.

After PR #60: n8n sends no body → weclapp returns a different error → n8n exec status=error → webhook caller receives HTTP 200 with empty body.

**Root cause:** PR #60 correctly fixed endpoints that reject any body (e.g., where weclapp returns 400 for any body), but `createPublicPage` requires `{}`. The fix needs to selectively restore `body: {}` on `createPublicPage` while keeping it absent on other empty-body POSTs.

**Suggested fix:** In `PartyDescription.ts` createPublicPage routing, add `body: {}` back specifically for this operation, and keep it removed from other empty-body actions. OR implement a `preSend` hook that sends `{}` only when the operation matches `createPublicPage`.

---

## Cleanup

- 2 test parties created: id=6423621 (ORGANIZATION), id=6423628 (PERSON)
  - id=6423621: deleted via T11 ✅
  - id=6423628: deleted via T12 ✅
- All QA2-U02 test workflows: deleted ✅ (0 remain in n8n)
- 0 weclapp entities remain

---

## Infrastructure Notes

- n8n session login rate-limiting (5 req/5 min) caused some activation failures during test run. Worked around by batching login calls and reusing session cookies. All target workflows were confirmed active via GET `/api/v1/workflows/{id}` before triggering.
- n8n SQLite entered readonly mode briefly during test (batch 3) due to concurrent PATCH requests; recovered after 5s cooldown.
- MCP tools target neudorff cloud n8n (does not have `n8n-nodes-weclapp` installed); tests executed via localhost:5678 REST API directly.
