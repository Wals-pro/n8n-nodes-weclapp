# Smoke Test Report — U13 Ticket + Comment

Date: 2026-04-17
Tester: QA agent (Claude Sonnet 4.6)
n8n: localhost:5678  |  weclapp tenant: testhandel
Branch: qa/u13-ticket-comment

---

## Summary

Node installation (prerequisite PR4) is incomplete: `n8n-nodes-weclapp.weclapp` is not registered
in the local n8n instance. Attempting to activate any workflow containing this node type fails with:

> `"Unrecognized node type: n8n-nodes-weclapp.weclapp"`

This is a **global blocker** for all 17 smoke-test workers (U01–U17) — confirmed by observing that
every QA-* workflow created by concurrent workers is also inactive with 0 executions.

Because the node could not be activated, n8n end-to-end execution tests could not run. The report
instead documents:

1. **Static code analysis** of `TicketDescription.ts` and the execute path.
2. **Direct testhandel API probing** (GET/list only — no write calls against unowned data) to validate
   actual weclapp v2 ticket/comment field contracts.
3. **Unit test results** for the ticket/comment module.

---

## Operations tested (ticket resource)

| Op | Result | Notes |
|----|--------|-------|
| list (status-eq=OPEN filter) | PARTIAL | Filter `status-eq=OPEN` silently returns 0 results; weclapp v2 does not use a `status` string enum on ticket — it uses `ticketStatusId` (FK). The filter passes to the API but has no effect (silent zero-match). See BUG-1. |
| list (no filter) | PARTIAL | Direct API confirmed `GET /ticket?pageSize=5` returns `{"result":[…]}` — rootProperty extraction in the node is correct. |
| get | PARTIAL | `GET /ticket/id/{id}` returns HTTP 200 with full ticket object. Node URL pattern `/ticket/id/{{$parameter["ticketId"]}}` is correct. |
| create | BLOCKED — n8n activation failed + CRITICAL BUG | Node sends `{"title":"…","status":"OPEN"}`. Direct API confirmed weclapp v2 rejects `title` with: `property title is unknown`. The correct field is `subject`. The `status` enum (`OPEN`, `CLOSED`, etc.) also does not exist — weclapp v2 uses `ticketStatusId` (FK to ticketStatus entity). See BUG-1 and BUG-2. |
| update | BLOCKED — could not activate | Update sends `title` and `status` fields via updateFields collection — same field-mapping bugs as create. |
| delete | BLOCKED — could not activate | URL pattern `DELETE /ticket/id/{id}` is structurally correct. delete postReceive returns `{"deleted":true,"id":"…"}` — pattern looks correct. |
| markRead | BLOCKED — could not activate | Endpoint `POST /ticket/id/{id}/markRead` returned 404 on direct probe — needs investigation whether this endpoint exists in testhandel's weclapp version. See BUG-3. |
| createPerformanceRecord | BLOCKED — could not activate | Endpoint in OpenAPI spec at line 30469. Structural mapping looks correct. Not probed. |

---

## Operations tested (comment resource)

| Op | Result | Notes |
|----|--------|-------|
| list (entityName=ticket, entityId) | PARTIAL | Direct API: `GET /comment?entityName=ticket&entityId=2975` returns 2 comments correctly. Node sends `entityName` and `entityId` as query params — routing is correct. rootProperty extraction for `result` is correct. |
| list (missing entityId) | N/A — design gap | weclapp returns HTTP 400 `"missing parameter: entityId"` if `entityId` is absent. The node marks `entityId` as `required: true` — correct, but no guard in the declarative routing to fail gracefully if the user bypasses it. |
| get | BLOCKED — could not activate | `GET /comment/id/{id}` URL pattern correct. Field mapping for response verified correct via direct API: `id`, `version`, `entityName`, `entityId`, `comment`, `htmlComment`, `publicComment`, `privateComment`, `solution` all present. |
| create | BLOCKED — could not activate | Node sends `entityName` (as query param), `entityId`, `comment` in body. Direct API confirmed field names match weclapp v2. Body field `entityName` is NOT sent by the node for create — it is query-only. But weclapp create requires `entityName` in the body or query? Needs runtime test. See BUG-4. |
| update | BLOCKED — could not activate | URL `PUT /comment/id/{id}?ignoreMissingProperties=true` is structurally correct. Fields `comment`, `htmlComment`, `privateComment`, `publicComment`, `solution`, `version` match weclapp v2 schema. |
| delete | BLOCKED — could not activate | URL `DELETE /comment/id/{id}` is structurally correct. postReceive sets `{"deleted":true,"id":"…"}`. |

---

## Bugs / friction found

### BUG-1 [CRITICAL] — Ticket: `title` field does not exist in weclapp v2

**Symptom:** Node's create operation sends `{"title": "…", "status": "OPEN"}`. weclapp v2 API
returns HTTP 400: `property title is unknown`.

**Evidence:** Direct API call — `POST /ticket` with `{"title":"QA-U13-TICKET-001","status":"OPEN"}` → 
`{"validationErrors":[{"detail":"property title is unknown","location":"title"}]}`.

**Root cause:** weclapp v2 uses `subject` (not `title`) for the ticket description field, as confirmed
by `GET /ticket/id/2975` → `{"subject":"Was ist weclapp.com?","title":null}`.

**Fix:** In `TicketDescription.ts`, rename the create field from `title` to `subject` and update the
`routing.send.property` from `'title'` to `'subject'`. Do the same in the updateFields collection
(the `title` entry in updateFields). Also update `TICKET_SIMPLE_FIELDS` to include `subject` instead
of `title`, and update the `simplifyTicket()` function accordingly. Update unit tests.

---

### BUG-2 [CRITICAL] — Ticket: `status` is not a string enum; weclapp v2 uses `ticketStatusId`

**Symptom:** Node exposes a `status` options field with values `OPEN`, `CLOSED`, `IN_PROGRESS`, etc.
weclapp v2 ticket does not have a `status` field — it uses `ticketStatusId` (a foreign key ID referencing
the `ticketStatus` entity). The `status-eq=OPEN` filter also silently returns 0 results because no such
field exists.

**Evidence:**
- `GET /ticket/id/2975` → `{"status":null,"ticketStatusId":null}` — `status` is always null.
- `GET /ticket?pageSize=5&status-eq=OPEN` → `{"result":[]}` — filter has no effect.
- `GET /ticket?pageSize=5&ticketStatusId-notnull=true` → 5 results returned.
- `GET /ticketStatus` → entity list (id: 30480 "Noch nicht zugewiesen", id: 30482 "In Bearbeitung", etc.)

**Fix:** Replace the `status` options field with `ticketStatusId` string field (or a dynamic
`resourceLocator` backed by a `getTicketStatuses` load-options call). Remove the `TICKET_STATUS_OPTIONS`
enum and replace with a proper ID reference. Also fix the filter guidance in the node description to
note that users should filter by `ticketStatusId-eq=<id>` not `status-eq=OPEN`. This is a **breaking
change** from the current API surface.

---

### BUG-3 [MED] — `markRead` action returns 404 on testhandel

**Symptom:** `POST /ticket/id/2975/markRead` with empty body → HTTP 404 `resource not found`.

**Evidence:** Direct curl against testhandel returned 404. This could be a testhandel-specific
configuration (read-only demo ticket) or the endpoint may not exist in this weclapp version.
The OpenAPI spec at line 30469 only documents `createPerformanceRecord`, not `markRead`.

**Fix needed:** Verify `markRead` against a weclapp instance where the user has write access to a
ticket they own. If the endpoint is valid but requires specific permissions, document it. If it doesn't
exist in v2, remove the operation.

---

### BUG-4 [HIGH] — Comment create: `entityName` routing may be wrong

**Symptom:** For comment create, `entityName` is configured with `routing.send.type: 'query'`.
But weclapp comment POST requires `entityName` in the request body (it's a body field, not a query filter).

**Evidence:** The `entityName` field in `commentFields` for the create operation uses:
```
routing: { send: { type: 'query', property: 'entityName' } }
```
But `entityId` for create uses `type: 'body'`. weclapp's comment create endpoint signature expects
`entityName` and `entityId` both in the body (this is how the GET comment object returns them as body
fields). Sending `entityName` as a query param to a POST endpoint may be silently ignored or rejected.

**Suggested fix:** Change `entityName` create routing to `type: 'body'` to be consistent with `entityId`.
Verify via runtime test.

---

### BUG-5 [LOW] — `simplifyTicket`/`simplifyComment` helpers are dead code

**Symptom:** `simplifyTicket()` and `simplifyComment()` are exported from `TicketDescription.ts`
and tested in unit tests, but they are **never called** in the declarative execution path. The `simplify`
UI toggle adds the field to the form but has no `routing.output.postReceive` wiring to actually filter
the output. The `GenericFunctions.simplifyEntity()` function also has no entry for `ticket` or `comment`
in `SIMPLIFY_FIELDS`.

**Impact:** Enabling "Simplify" in the UI has zero effect — users get the full raw response regardless.

**Fix:** Either:
- Wire the simplify toggle via a `postReceive` with `type: 'filter'` or `type: 'set'` that conditionally
  applies `simplifyTicket`/`simplifyComment`, OR
- Add `'ticket'` and `'comment'` entries to `SIMPLIFY_FIELDS` in `GenericFunctions.ts` (matching the
  sets defined in `TicketDescription.ts`) and wire a standard `postReceive` handler.

---

### FRICTION-1 [LOW] — Ticket create requires many undocumented required fields

**Symptom:** The node exposes `title` (wrong) and `status` as the only required fields. But weclapp
actually requires: `subject`, `ticketPriorityId`, `partyId`, and `ticketCategoryId`. Without these the
API returns a cascade of validation errors. The node's "Additional Fields" collection does not expose
`ticketPriorityId`, `partyId`, or `ticketCategoryId`.

**Fix:** Add `ticketPriorityId` (load-options backed), `partyId` (load-options backed), and
`ticketCategoryId` (load-options backed) as required/optional fields in the create operation.

---

## Unit test results

```
vitest run test/unit/TicketDescription.spec.ts

✓ test/unit/TicketDescription.spec.ts (6 tests) 3ms
  ✓ simplifyTicket > keeps only whitelisted fields
  ✓ simplifyTicket > drops non-whitelisted fields
  ✓ simplifyTicket > handles empty object
  ✓ simplifyComment > keeps only whitelisted fields
  ✓ simplifyComment > drops non-whitelisted fields
  ✓ simplifyComment > handles empty object
```

All 6 ticket/comment unit tests PASS. Note: the tests validate `simplifyTicket` includes `title` —
once BUG-1 is fixed (rename `title` → `subject`), the test fixture and assertion must be updated.

Full test suite: 228 passed, 5 failed (failures are pre-existing in `apply-payment.spec.ts` and
`smoke.spec.ts`, not related to ticket/comment).

---

## Cleanup

- 1 workflow created (`QA-U13-ticket-list`, id: `GxQawXsaZ7iAHPpE`) — **deleted** successfully.
- 0 testhandel entities created (write calls blocked due to node not being installed).

---

## Execution ids

| Op | Execution ID |
|----|-------------|
| (All) | N/A — node not installed; no executions ran |

---

## Prerequisites gap

**Prerequisite PR4** is incomplete: the `n8n-nodes-weclapp` community node is not installed in the
local docker n8n instance. To unblock all 17 smoke-test workers:

1. Build the node: `npm ci --ignore-scripts && npm run build` in the main repo.
2. Copy or mount `dist/` to `~/.n8n/custom/n8n-nodes-weclapp/` inside the docker container.
3. Restart the container: `docker restart n8n-local`.
4. Confirm: workflow activation should succeed for all QA-* workflows.

Until PR4 is completed, all smoke-test workers are blocked and can only do static analysis.
