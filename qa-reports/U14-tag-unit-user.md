# Smoke Test Report — U14 Tag / Unit / User / CustomAttributeDefinition

Date: 2026-04-17
Tester: coordinator agent (Claude Sonnet 4.6)
n8n: localhost:5678 | weclapp tenant: testhandel

---

## Operations tested

| Resource | Op | Result | Exec ID | Notes |
|---|---|---|---|---|
| tag | list | PASS | 223 | returnAll=true; 4 tags returned |
| tag | get | PASS | 224 | id=40352 "Icon Logo" fetched |
| tag | create | FAIL | none | Node sends empty body → weclapp 400 "body is not a json object". Root cause: `name` as parameter name conflicts with n8n internal node property; routing `send.body.name` silently no-ops. |
| tag | update | FAIL | none | Workflow executes with 500 "There was a problem executing the workflow" — no execution record created. Root cause: `tagBody` collection has child field `name` with `displayOptions: { show: { operation: ['update'] } }` which triggers n8n "Could not resolve parameter dependencies" error during activation. Webhook appears registered (active=true) but execution silently fails. |
| tag | delete | PASS | 305 | id=6423429 (QA-U14-TAG-001) deleted; `{deleted: true}` returned |
| unit | list | PASS | 225 | returnAll=true; 5 units returned (Kg, g, l, Stk., h) |
| unit | get | PASS | 226 | id=2264 "Stk." fetched |
| user | list | PASS | 227 | returnAll=true; users returned |
| user | get | PASS | 228 | id=2165 fetched |
| user | getCurrent | PASS | 229 | office@wals.pro fetched |
| customAttributeDefinition | list | PASS | 230 | returnAll=true; 5 CADs returned |
| customAttributeDefinition | get | SKIP | — | Skipped: create failed so no ID available for get test |
| customAttributeDefinition | create | FAIL | none | Two compounding bugs: (1) same displayOptions/collection bug as tag:update — workflow 500 without execution; (2) wrong field names: node sends `entityName` (rejected by weclapp as unknown property) and `type` (should be `attributeType`); also `label` is required by weclapp but not in node's required fields |
| customAttributeDefinition | delete | SKIP | — | Skipped: create failed |

---

## Bugs / Friction Found

### [CRITICAL] BUG-U14-01: `tag:create` sends empty body — weclapp 400

**Symptom:** `tag:create` with `name="QA-U14-TAG-001"` results in weclapp returning `400 body is not a json object`.  
**Root cause:** The parameter is named `name` (`name: 'name'` in the INodeProperties) which conflicts with n8n's internal node `name` field. The declarative routing `send: { type: 'body', property: 'name' }` silently no-ops, resulting in an empty POST body.  
**Evidence:** Execution recorded; weclapp context.data shows `"body is not a json object"`.  
**Fix:** Rename the internal parameter to `tagName` and keep body mapping to `name`:
```typescript
{ name: 'tagName', ..., routing: { send: { type: 'body', property: 'name' } } }
```
Same fix applies to `unit:create` (`unitName`) and `user:create` (`username`/`email` — verify these too).

---

### [CRITICAL] BUG-U14-02: `tag:update` and `tag:create` workflow activation fails silently due to `displayOptions` in child of collection

**Symptom:** Any workflow using `tag:update` or `tag:create` with the `tagBody` collection returns HTTP 500 "There was a problem executing the workflow" — no execution is recorded. The activation API returns `active: true` but the workflow never runs.  
**Root cause:** n8n throws "Could not resolve parameter dependencies. Max iterations reached! Hint: If `displayOptions` are specified in any child parameter of a parent `collection` or `fixedCollection`, remove the `displayOptions` from the child parameter." This was confirmed explicitly when testing with the `tagBody` collection that has:
```typescript
{ displayName: 'Name', name: 'name', displayOptions: { show: { operation: ['update'] } }, ... }
```
The `displayOptions` on a child of a `collection` type causes n8n to silently fail to execute.  
**Evidence:** Explicit 400 error when attempting to activate with `tagBody` included. Consistent 500 from all tag:update/tag:create workflows with 0 recorded executions.  
**Fix:** Remove `displayOptions` from all child fields inside `collection` and `fixedCollection` parameter types. Instead, control visibility at the collection level via `displayOptions` on the parent, or split into separate parameters per operation.  
**Affected parameters in TagUnitUserDescription.ts:**
- `tagBody.name` (line ~133–140): has `displayOptions: { show: { operation: ['update'] } }` — REMOVE
- `unitBody.name` (line ~268): has `displayOptions: { show: { operation: ['update'] } }` — REMOVE
- `userBody.email` (line ~413): has `displayOptions: { show: { operation: ['update'] } }` — REMOVE
- `userBody.username` (line ~434): has `displayOptions: { show: { operation: ['update'] } }` — REMOVE
- `customAttributeDefinitionBody.attributeKey`, `.entityName`, `.type` — all have `displayOptions` — REMOVE

---

### [CRITICAL] BUG-U14-03: `customAttributeDefinition:create` uses wrong field names

**Symptom:** Creating a custom attribute definition fails with weclapp validation errors.  
**Root cause (field mapping errors):**
1. Node sends `entityName` (string) but weclapp expects `entities` (array of strings). weclapp rejects `entityName` with `"property entityName is unknown"`.
2. Node sends `type` body property but weclapp expects `attributeType`. Confirmed by inspecting existing CADs (`attributeType: "STRING"`, not `type`).
3. Node does not send `label` or `attributeLabels`, but weclapp requires `label`.
4. `party` entity type requires `legacyEntities` sub-specification (`lead`, `customer`, `contact`). Use `article` entity type for simpler tests.

**Verified via direct API:** `POST /customAttributeDefinition` with `{"attributeKey": "qaU14TestV3", "attributeType": "STRING", "entities": ["article"], "label": "QA U14 Test"}` → HTTP 201, id=6423448 (subsequently deleted).  
**Fix:**
- Change `entityName` body property to `entities` (send as array: `[value]`)
- Change `type` body property to `attributeType`  
- Add `label` as required field routing to body
- Update `entityName` options to match the actual `entities` accepted values
- Document `legacyEntities` requirement for party entity

---

### [HIGH] BUG-U14-04: `tag:create` `color` field sends invalid format

**Symptom:** Tag create with `color: "#FF5733"` rejected by weclapp with validation failure.  
**Root cause:** The weclapp `/tag` endpoint does not accept a `color` field in the POST body (field not in the schema). Confirmed: direct API `POST /tag` with `{"name": "...", "color": "#112233"}` → validation failed; without `color` → success.  
**Fix:** Remove the `color` field from `tagBody` options, or guard it with a note that it's not supported by weclapp's tag API.

---

### [MED] INFRA-U14-01: Webhook paths with slashes (`/`) do not register in localhost n8n

**Symptom:** Workflows with webhook `path` containing `/` (e.g., `qa/u14/tag-list`) return 404 "not registered" even when active.  
**Fix (workaround applied):** Use flat paths without slashes (e.g., `qa-u14-tag-list`). This is an n8n behavior, not a node bug.

---

### [MED] BUG-U14-05: `user:getCurrent` postReceive `rootProperty` on single-object endpoint

**Symptom:** `/user/currentUser` returns a single user object (not wrapped in `result[]`), but the description applies `rootProperty` postReceive which extracts `result` (empty). The node actually returns the full object correctly — tested manually and it PASSES. But the `rootProperty` postReceive would fail if the API returns `{result: [...]}` format.  
**Observation during test:** `user:getCurrent` returned the correct user object (exec 229). The `rootProperty` postReceive with a non-array endpoint may be harmless if n8n falls back to the raw response, but this is fragile.  
**Fix:** Remove `postReceive: rootProperty` from `getCurrent` operation routing since `/user/currentUser` returns a single object.

---

## Cleanup

- QA-U14-TAG-001 (id=6423429): deleted via node `tag:delete` — confirmed gone
- QA-U14-TAG-UPDATE-TEST (id=6423439): deleted via direct weclapp API call
- QA-U14-VERIFY-001 (id=6423445): deleted via direct weclapp API call
- QA-U14-TAG-API-UPD (id=6423447): deleted via direct weclapp API call
- qaU14TestV3 CAD (id=6423448): deleted via direct weclapp API call
- All QA-U14-* n8n workflows: deleted after use (8 long-lived read-op workflows + ~20 ephemeral CRUD workflows)
- No orphaned test data remains on testhandel

---

## Execution IDs (for replay)

| Op | Exec ID |
|----|---------|
| tag:list | 223 |
| tag:get | 224 |
| unit:list | 225 |
| unit:get | 226 |
| user:list | 227 |
| user:get | 228 |
| user:getCurrent | 229 |
| customAttributeDefinition:list | 230 |
| tag:delete (QA-U14-TAG-001) | 305 |

---

## Summary

**9 of 14 planned operations PASS.** 5 fail due to 3 distinct bugs in `TagUnitUserDescription.ts`:

1. **`name` as internal parameter name** conflicts with n8n internals → create operations send empty bodies
2. **`displayOptions` on children of `collection`** → update/create workflows silently fail to execute
3. **Wrong weclapp field names** in `customAttributeDefinition:create` (`entityName`→`entities[]`, `type`→`attributeType`, missing `label`)

All bugs are in `TagUnitUserDescription.ts` and require surgery on the parameter definitions. No weclapp API issues found — all endpoints respond correctly to valid direct API calls.
