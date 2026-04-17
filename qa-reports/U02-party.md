# Smoke Test Report — U02 Party

Date: 2026-04-17
Tester: QA agent U02 (automated)
n8n: localhost:5678 | weclapp tenant: testhandel

## Infrastructure note

n8n-mcp MCP tools in this session target the neudorff cloud n8n (`n8n.srv980912.hstgr.cloud`), which does NOT have `n8n-nodes-weclapp` installed → `activateWorkflow` via MCP fails with "Unrecognized node type". Tests were executed by:
1. Creating workflows via `localhost:5678` public REST API
2. Activating via `n8n_ctl.py activate localhost <id>` (session API)
3. Triggering via `POST localhost:5678/webhook/<path>`
4. Inspecting executions via `localhost:5678/api/v1/executions?includeData=true`

Test workflow ID: `14U4m9kkAb7HiLk3` (QA-U02-party-list) — deactivated and deleted after all ops.

## Operations tested

| Op | Result | Notes |
|----|--------|-------|
| list (partyTypeFilter=CUSTOMER) | ❌ FAIL | Bug #1: 400 "unknown enum value: CUSTOMER"; allowed: [ORGANIZATION, PERSON]; exec 295 |
| list (partyTypeFilter=SUPPLIER) | ❌ FAIL | Bug #1: 400 "unknown enum value: SUPPLIER"; allowed: [ORGANIZATION, PERSON]; exec 330 |
| list (partyTypeFilter=ANY, simplify=false) | ✅ PASS | Returns 1000 parties from testhandel; exec 317 |
| list with filtersCollection (partyType-eq=PERSON) | ⚠️ PARTIAL | Node ran, returned 1000 items with mixed partyTypes; filter not applied; exec 317 |
| get (simplify=true, default) | ❌ FAIL | Bug #3: weclapp node returns 0 items; simplify postReceive filter always discards; exec 313 |
| get (simplify=false) | ✅ PASS | id=6423430 returned correctly; exec 316 |
| create (partyType=CUSTOMER) | ❌ FAIL | Bug #1: 400 "unknown enum value: CUSTOMER"; exec 302 |
| create (partyType=PERSON, name field) | ❌ FAIL | Bug #2: 400 "property name is unknown"; `name` not a valid party field; exec 304 |
| create (partyType=PERSON, firstName+lastName only) | ✅ PASS | id=6423430 created, partyType=PERSON; exec 308 |
| update (firstName → TestUpdated) | ✅ PASS | version incremented to 1; exec 324 |
| createPublicPage | ❌ FAIL | 400 "body is not a json object"; exec 325–327 |
| downloadImage | ⚠️ EXPECTED 404 | Party has no image; 404 as expected; exec 329 |
| uploadImage | ⏭ NOT TESTED | Composite binary upload; requires binary input node; see known issue |
| delete | ✅ PASS | {deleted: true} returned; exec 329 (confirmed via response) |

## Bugs / friction found

- **[HIGH] Bug #1 — Wrong partyType enum values in partyTypeFilter and create partyType field**
  The `PARTY_TYPE_OPTIONS` in `PartyDescription.ts` uses `CUSTOMER`, `SUPPLIER`, `PROSPECT` as option values. The weclapp API `partyType` enum only accepts `ORGANIZATION` and `PERSON`. Both the `partyTypeFilter` list field and the `partyFields.partyType` create field use these wrong values, making it impossible to filter or create parties by type using the node's built-in dropdown.
  Evidence: exec 295 (CUSTOMER filter 400), exec 302 (CUSTOMER create 400), exec 330 (SUPPLIER filter 400). weclapp API response: `{"allowed": ["ORGANIZATION", "PERSON"]}`.
  Suggested fix: Replace `PARTY_TYPE_OPTIONS` values with `ORGANIZATION` and `PERSON`; map display names to "Organization" and "Person". Remove `PROSPECT` and `SUPPLIER` from options (not valid weclapp partyType values — those concepts are represented via `customer: true/false` and `supplier: true/false` flags on the party entity).

- **[CRITICAL] Bug #3 — simplify postReceive filter for get/list returns 0 items (always)**
  The `listSimplify` field in `PartyDescription.ts` uses `type: 'filter'` postReceive with:
  ```
  pass: '={{ ["id","partyNumber","name","firstName","lastName","partyType","email","active","version"].includes($key) }}'
  ```
  `type: 'filter'` operates on items (keeping/discarding whole items), not on properties. `$key` is undefined in this context. `[...].includes(undefined)` is always `false`, so all items are discarded when `simplify = true` (which is the default). This makes `get` always return 0 items with default settings.
  Evidence: exec 313 (simplify=true, 0 items), exec 316 (simplify=false, 1 item with correct data).
  Suggested fix: Use `type: 'set'` postReceive with a property filter, or implement simplify as a Code node step, or use `type: 'filter'` with an item-level condition (e.g., check item has non-empty id). Compare with article resource implementation if it correctly implements simplify.

- **[HIGH] Bug #2 — `name` field does not exist on weclapp party entity**
  `PartyDescription.ts` PARTY_BODY_OPTIONS includes a `Company Name` field that sends `name` to the body. The weclapp API rejects `name` with "property name is unknown". The correct field for organization name is `company` (and `company2` for the second name line).
  Evidence: exec 304, weclapp response: `{"detail": "property name is unknown", "location": "name"}`.
  Suggested fix: Rename the `Company Name` field to use `company` as the body property name (`routing: { send: { type: 'body', property: 'company' } }`).

- **[MED] Bug #4 — createPublicPage sends empty body that API rejects**
  `createPublicPage` routing sets `body: {}` which the API rejects with 400 "body is not a json object". This may be a weclapp API quirk where empty JSON object `{}` is not accepted for this endpoint, or the weclapp action requires specific fields.
  Evidence: exec 325–327. Suggested fix: Investigate the createPublicPage endpoint requirements; may need to send `null` body or add required fields.

- **[LOW] Known issue #29 — limit parameter ignored on list**
  List with `limit: 5` returns 1000 items (the full weclapp pageSize). This is documented expected behavior per issue #29 in the QA plan.

- **[LOW] Known issue #30 — composite ops disabled**
  uploadImage is a composite binary operation. Not tested per plan (composite ops disabled, issue #30).

- **[INFO] filtersCollection partyType-eq=PERSON filter not applied**
  The `filtersCollection` filter with `partyType-eq=PERSON` was set but returned all 1000 parties (mixed ORGANIZATION and PERSON). The query parameter may not be correctly appended when using the collection. Further investigation needed to determine if this is a filtersCollection implementation bug or a test configuration issue.

## Cleanup

- 1 test party created (id=6423430, QA-U02-PARTY-001 equivalent): DELETED via node delete op (exec 329)
- 1 test workflow (`14U4m9kkAb7HiLk3`, QA-U02-party-list): deactivated and deleted
- 2 cloud-n8n orphan workflows (MCP routing issue): deleted via MCP tools
- 0 entities remain — cleanup complete

## Execution IDs (for replay)

| Op | Exec ID | Status |
|----|---------|--------|
| list (CUSTOMER filter — bug) | 295 | error |
| list (ANY filter, no partyType) | 298 | success |
| list (filtersCollection PERSON) | 317 | success |
| create (CUSTOMER — bug) | 302 | error |
| create (name field — bug) | 304 | error |
| create (PERSON, firstName/lastName) | 308 | success |
| get (simplify=true default — bug) | 313 | success (0 items) |
| get (simplify=false) | 316 | success |
| update (firstName→TestUpdated) | 324 | success |
| createPublicPage (400 error) | 326 | error |
| list (SUPPLIER filter — bug) | 330 | error |
| delete | 329 | success |
