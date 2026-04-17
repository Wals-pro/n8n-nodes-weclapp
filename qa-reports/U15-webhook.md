# Smoke Test Report — U15 Webhook CRUD

Date: 2026-04-17
Tester: coordinator agent (Claude)
n8n: localhost:5678 | weclapp tenant: testhandel

---

## Infrastructure note

**CRITICAL: `n8n-nodes-weclapp.weclapp` cannot be activated as a live workflow trigger.**
Error on `activateWorkflow`: `"Unrecognized node type: n8n-nodes-weclapp.weclapp"`.

The node appears in `/types/nodes.json` (via session cookie) — it is mounted into the custom dir — but n8n's runtime process does not recognise it as a loadable community package (the `/rest/community-packages` list is empty). This means no QA-UXX weclapp-node workflow can be activated or executed via webhook trigger in the current docker setup.

**Mitigation applied:** All five webhook CRUD operations were tested by calling the testhandel REST API directly (curl → `https://testhandel.weclapp.com/webapp/api/v2/webhook`). The node's routing definition (URL, method, body fields, `rootProperty`, `postReceive`) was validated by static inspection of `WebhookDescription.ts` against the observed API responses.

---

## Operations tested

| Op     | Result | Method + URL                                    | Notes |
|--------|--------|-------------------------------------------------|-------|
| list   | PASS   | GET /webhook?pageSize=1000                      | Returns `{result:[...], count:0}`. `rootProperty:"result"` in node correctly unwraps. 27 existing (deactivated) webhooks returned. `count` field is 0 even though result has 27 items — weclapp quirk, not a node bug. |
| get    | PASS   | GET /webhook/id/6423233                         | Returns full webhook object. All expected keys present: id, version, entityName, url, atCreate, atUpdate, atDelete, requestMethod, createdDate, lastModifiedDate. |
| create | PASS   | POST /webhook (body: entityName, url, requestMethod, atCreate, atUpdate, atDelete) | Created id=6423233 (entityName=article, url=https://example.com/qa-u15, atCreate=true, atUpdate=false, atDelete=false, requestMethod=POST). Node field mapping confirmed correct. |
| update | PASS   | PUT /webhook/id/6423233?ignoreMissingProperties=true | Changed atCreate→false, atUpdate→true. version incremented 0→1. `ignoreMissingProperties=true` hardcoded in routing — correct. |
| delete | PASS   | DELETE /webhook/id/6423233                      | Returns 204 No Content. Node applies `postReceive: set { deleted: true }` — correct synthetic response for empty body. |

---

## Node description correctness (static analysis of WebhookDescription.ts)

| Aspect | Assessment |
|--------|-----------|
| list rootProperty | CORRECT — `property: "result"` matches API envelope `{result: [], count: 0}` |
| list returnAll / limit | CORRECT — `returnAll` field wired in from SharedFields; pageSize=1000 hardcoded in routing qs |
| create body fields | CORRECT — entityName, url, requestMethod, atCreate, atUpdate, atDelete all use `send: {type:"body", property:...}` correctly |
| update `ignoreMissingProperties` | CORRECT — hardcoded in routing qs, matches weclapp convention |
| delete postReceive | CORRECT — synthetic `{ deleted: true }` is correct since API returns no body (204) |
| get/list simplify filter | CORRECT — keeps id, url, entityName, atCreate, atUpdate, atDelete, requestMethod, version |
| webhookIdField required for get/update/delete | CORRECT — displayOptions restrict to those 3 ops |
| update fields collection | CORRECT — all update fields use `send: {type:"body"}` |

No defects found in the routing definition.

---

## Bugs / friction found

- **[CRITICAL] n8n runtime does not load the node — "Unrecognized node type: n8n-nodes-weclapp.weclapp" on activation.**
  - Evidence: `mcp__n8n-mcp__n8n_update_partial_workflow` with `activateWorkflow` returned `activationError: "Unrecognized node type: n8n-nodes-weclapp.weclapp"`. All other QA-UXX workflows are also `active: false` for the same reason.
  - Root cause: node is present in filesystem but not installed via n8n's community package manager (`/rest/community-packages` = `[]`). n8n's runtime only loads packages from its npm-managed store; file-mount alone is insufficient for runtime resolution.
  - Fix needed: Install the node via n8n UI "Community Nodes" (or `N8N_COMMUNITY_PACKAGES_ENABLED=true` + npm install in container). PR5 of QA prerequisites must be redone properly.
  - Impact: ALL QA smoke tests (U01–U17) share this blocker. No n8n-nodes-weclapp operations were executed through the n8n execution engine during this sprint.

- **[LOW] weclapp webhook list: `count` field returns 0 while `result` array contains 27 items.**
  - Evidence: `GET /webhook?pageSize=1000` → `{"count":0,"result":[...27 items...]}`.
  - This is a weclapp API quirk (webhooks may not be counted in the same way as other entities). The node's `returnAll` implementation checks `result.length < pageSize` for pagination termination — this is still correct regardless of the count field.
  - No node fix needed; worth noting in docs.

- **[LOW] `create` operation: task description mentioned `event=article.created` and `active=true` fields. These do not exist on weclapp webhooks.**
  - weclapp uses `entityName` + `atCreate/atUpdate/atDelete` booleans — no `event` composite field, no `active` boolean.
  - The node's description correctly uses the weclapp API shape. The task spec was simplified/fictional — not a node bug.

---

## Cleanup

- Created 2 test webhooks (id=6423233, id=6423234) during create op exploration.
- Both deleted via `DELETE /webhook/id/{id}`.
- Post-cleanup list confirmed: 27 results, 0 QA-U15 items remaining.
- n8n workflow `QA-U15-webhook-list` (id: InGf9Wv6j4VJfrPl) created and deleted.

---

## Execution ids (for replay)

No n8n executions were recorded — the workflow could not be activated due to the CRITICAL infrastructure bug. All testing was performed via direct curl calls to testhandel.

Testhandel API calls (no execution IDs — direct HTTP):
- list: GET /webhook?pageSize=1000 → 27 results
- create: POST /webhook → id=6423233
- get: GET /webhook/id/6423233 → version=0, entityName=article
- update: PUT /webhook/id/6423233 → version=1, atCreate=false, atUpdate=true
- delete: DELETE /webhook/id/6423233 → 204 No Content
- cleanup delete: DELETE /webhook/id/6423234 → 204 No Content
