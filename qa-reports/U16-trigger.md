# Smoke Test Report — U16 WeclappTrigger End-to-End

Date: 2026-04-17
Tester: Claude Code (QA coordinator agent)
n8n: localhost:5678 (v1.120.4) | weclapp tenant: testhandel

---

## Summary

**Register: FAILED (CRITICAL bug — wrong API payload schema)**
**Deregister: NOT REACHED (blocked by register failure)**
**Cleanup: COMPLETE (0 orphaned weclapp webhooks, workflow deleted)**

The WeclappTrigger node cannot be activated because its `create()` method
sends a webhook creation payload that does not match the weclapp webhook API schema.
weclapp returns HTTP 400 with `"property event is unknown"`, which propagates as a
NodeApiError and causes n8n's `ActiveWorkflowManager.add()` to throw, failing the
activation with "Bad request - please check your parameters".

---

## Operations tested

| Op | Result | Notes |
|----|--------|-------|
| Node install (localhost n8n) | PASS | `weclappTrigger` and `weclappTriggerTool` present in node registry |
| Workflow create (inactive) | PASS | Workflow `MfOmsV1HabqLoWUH` created with 2 nodes via `POST /api/v1/workflows` |
| Workflow activate (register) | FAIL | 400 from weclapp during `create()` — wrong payload schema (see Bug #1) |
| Verify weclapp webhook row exists | NOT RUN | blocked by activation failure |
| Workflow deactivate (unregister) | NOT RUN | workflow never activated |
| Verify weclapp webhook row deleted | NOT RUN | blocked |
| Cleanup | PASS | Workflow deleted, 0 orphaned weclapp webhooks on testhandel |

---

## Bugs found

### [CRITICAL] Bug #1 — WeclappTrigger.create() sends wrong webhook payload schema

**File:** `nodes/WeclappTrigger/WeclappTrigger.node.ts`, method `create()` (~line 186)

**Symptom:** Workflow activation always fails with HTTP 400 from weclapp:
```json
{
  "status": 400,
  "error": "Validation failed",
  "validationErrors": [
    { "location": "event", "detail": "property event is unknown" }
  ]
}
```

**Root cause:** The node sends:
```js
{
  url: webhookUrl,
  event: `${entityName}.${event}`,   // ← field does not exist in weclapp schema
  active: true                        // ← field does not exist in weclapp schema
}
```

**Correct weclapp webhook schema** (from `docs/weclapp-openapi.yaml` and live API):
```json
{
  "entityName": "party",
  "url": "http://...",
  "requestMethod": "POST",
  "atCreate": true,
  "atUpdate": false,
  "atDelete": false
}
```

The events `created`, `updated`, `deleted` map to boolean fields `atCreate`, `atUpdate`, `atDelete`.
There is no `event` or `active` field. The `requestMethod` is required (POST).

**Evidence:** Direct API test:
```bash
curl -X POST https://testhandel.weclapp.com/webapp/api/v2/webhook \
  -H "AuthenticationToken: ..." \
  -d '{"url":"http://localhost:5678/webhook/test","event":"party.created","active":true}'
# → HTTP 400: "property event is unknown"

curl -X POST https://testhandel.weclapp.com/webapp/api/v2/webhook \
  -H "AuthenticationToken: ..." \
  -d '{"url":"http://localhost:5678/webhook/test","active":true}'
# → HTTP 400: "property active is unknown"
```

**Suggested fix:** Replace the body in `create()`:
```ts
body: {
  entityName,
  url: webhookUrl,
  requestMethod: 'POST',
  atCreate: events.includes('created'),
  atUpdate: events.includes('updated'),
  atDelete: events.includes('deleted'),
},
```
And create ONE webhook row per entity (not one per event), since weclapp uses
`atCreate/atUpdate/atDelete` booleans on a single row, not separate rows per event.

This also means `delete()` only needs to delete one ID (not an array), and
`staticData.weclappWebhookIds` can be simplified to a single `weclappWebhookId: string`.

---

### [CRITICAL] Bug #2 — checkExists() filter is insufficient

**File:** `nodes/WeclappTrigger/WeclappTrigger.node.ts`, method `checkExists()` (~line 142)

**Current filter:** `qs: { 'url-eq': webhookUrl }`

**Problem:** This checks if ANY weclapp webhook points at this n8n instance, regardless of
entity. If a second trigger node (e.g. for `salesOrder`) registers on the same n8n instance,
`checkExists()` for a `party` trigger returns true when it should return false (because the
existing row is for `salesOrder`, not `party`).

**Suggested fix:** Also filter by `entityName`:
```ts
qs: { 'url-eq': webhookUrl, 'entityName-eq': entityName }
```

---

### [HIGH] Bug #3 — n8n parameter dependency resolution warning

**Observed in n8n server logs** during workflow creation (telemetry subsystem):
```
Could not resolve parameter dependencies. Max iterations reached!
Hint: If displayOptions are specified in any child parameter of a parent
collection or fixedCollection, remove the displayOptions from the child parameter.
```

This is thrown during telemetry graph generation (non-blocking — does not prevent
workflow creation or execution). Likely caused by a `displayOptions` in a child
parameter of a `collection`-type property in either `Weclapp.node.ts` or
`WeclappTrigger.node.ts`. The WeclappTrigger's `additionalOptions` collection has
only `includeHistory` (no `displayOptions`) so this may originate from the main
Weclapp node. Investigate with `npm run lint` or n8n's workflow graph validator.

**Evidence:** n8n logs show this on every workflow creation containing weclapp nodes.

---

### [LOW] Bug #4 — `create()` creates N rows for N events (design mismatch)

The current `create()` uses `Promise.all(events.map(...))` to create one weclapp webhook
row per event. The weclapp API model (single row with `atCreate/atUpdate/atDelete` booleans)
means this approach always fails after fixing Bug #1. Once Bug #1 is fixed, `create()` must
be restructured to create exactly one row regardless of how many events are selected.

---

## Additional observations

### Node registry check (PASS)
`curl .../types/nodes.json` returned all 4 weclapp node types:
- `n8n-nodes-weclapp.weclapp` (group: transform)
- `n8n-nodes-weclapp.weclappTrigger` (group: trigger, webhooks: [default], inputs: [])
- `n8n-nodes-weclapp.weclappTool` (group: transform)
- `n8n-nodes-weclapp.weclappTriggerTool` (group: trigger)

### n8n activation check (PASS — after fix)
`checkIfWorkflowCanBeActivated()` checks `nodeType.webhook !== undefined`.
The WeclappTrigger defines `async webhook()` as an instance method so this check passes.
n8n's activation pipeline correctly identifies it as a webhook-type trigger and
calls `createWebhookIfNotExists()` → `checkExists()` → `create()`.
The failure happens in `create()`, not in n8n's internal routing.

### weclapp `url-eq` filter (PASS)
Confirmed: weclapp accepts `GET /webhook?url-eq=http%3A%2F%2Flocalhost...` with HTTP 200.
No validation restriction on localhost URLs for GET filters.

### Live event firing limitation (DOCUMENTED)
Even after fixing Bug #1, testhandel cannot reach `http://localhost:5678` to fire events.
Full E2E (create entity → weclapp fires webhook → n8n executes) requires a publicly
reachable n8n instance (e.g. via ngrok, production deployment, or cloud n8n).
Register/deregister testing is possible locally once Bug #1 is fixed.

---

## Cleanup

- Deleted workflow `MfOmsV1HabqLoWUH` (QA-U16-WeclappTrigger-Smoke)
- Verified 0 orphaned webhooks on testhandel with `url-like=%localhost%`
- No entities created on testhandel (activation failed before any webhook was registered)

---

## Execution IDs

No successful executions (workflow never reached active state).

---

## Required fix before retesting

1. Fix `create()` payload to use `entityName`, `atCreate`, `atUpdate`, `atDelete`, `requestMethod`
2. Fix `checkExists()` to filter by both `url-eq` and `entityName-eq`
3. Fix `delete()` to handle single ID (not array) after model change
4. Fix `staticData` type: `weclappWebhookId: string` instead of `weclappWebhookIds: string[]`
5. Investigate parameter dependency resolution warning (Bug #3)

After these fixes, re-run U16 to verify register/deregister cycle works end-to-end.
