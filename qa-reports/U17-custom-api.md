# Smoke Test Report — U17 Custom API Call

Date: 2026-04-16  
Tester: coordinator agent (Claude Sonnet 4.6)  
n8n: localhost:5678 | weclapp tenant: testhandel  
Branch: qa/u17-custom-api  
Node version: main @ c208466 (post-PR#28)

---

## Executive Summary

All three `customApiCall.call` operations are **non-functional** in the current build. Two independent
failure modes stack on top of each other:

1. **Infrastructure gap (prerequisite failure):** The `n8n-nodes-weclapp` package is not installed in
   the local docker n8n instance. The activation attempt for the test workflow returned
   `"Unrecognized node type: n8n-nodes-weclapp.weclapp"`, confirming the node is absent from n8n's
   runtime. Prerequisites PR4–PR5 from the QA plan have not been completed.

2. **Code-level bug — issue #30 (primary target of this worker):** Even if the node were installed,
   `customApiCall.call` would still produce zero output items. The root cause is the absence of any
   `routing` property on the `call` operation and its fields in `CustomApiDescription.ts`. After PR#28
   removed the `execute()` method to enable declarative routing, the dispatcher now relies entirely on
   `routing` configs embedded in `INodeProperties`. `customApiCall` has none, so n8n produces 0 items
   silently and without error.

---

## Operations attempted

| Op | entityPath | Expected result | Actual result |
|----|-----------|-----------------|---------------|
| customApiCall.call GET | `currency` | `{result: [...]}` currency list | Workflow activation failed: `Unrecognized node type: n8n-nodes-weclapp.weclapp` — node not installed |
| customApiCall.call GET | `paymentMethod` | `{result: [...]}` payment method list | Same — node not installed |
| customApiCall.call GET | `termOfPayment` | `{result: [...]}` term of payment list | Same — node not installed |

No execution IDs were generated — the workflow could not be activated.

---

## Root-cause analysis: issue #30

### What PR#28 changed

Commit `7355940` (`fix(node): remove stub execute() so n8n uses declarative routing`) removed the
`execute()` method from `Weclapp.node.ts`. After that change the class is:

```ts
export class Weclapp implements INodeType {
  description: INodeTypeDescription = { ... };
  methods = { loadOptions, listSearch };
  // No execute() method — purely declarative
}
```

n8n's runtime detects the absence of `execute()` and falls back to its built-in declarative router.
The declarative router dispatches HTTP calls by reading `routing.request` values from the active
`INodeProperties` options and fields.

### Why `customApiCall` fails

Every working resource (e.g. Shipment, Quotation, Party) defines `routing` directly on each operation
option:

```ts
// ShipmentDescription.ts — declarative routing present
{
  name: 'Create',
  value: 'create',
  routing: {
    request: { method: 'POST', url: '/shipment' },
  },
},
```

`CustomApiDescription.ts` defines the `call` operation with zero routing config:

```ts
// CustomApiDescription.ts — NO routing at all
{
  name: 'Call',
  value: 'call',
  description: 'Make a raw HTTP request to any weclapp endpoint',
  action: 'Call a weclapp endpoint',
  // ← no routing.request, no routing.output
},
```

The fields (`method`, `entityPath`, `entityId`, etc.) also carry no `routing` properties.

When n8n's declarative router finds no `routing` config on any active parameter, it makes **no HTTP
request** and returns **0 output items** — silently, without raising an error.

### The `executeCustomApiCall` function is unreachable

`CustomApiDescription.ts` exports `executeCustomApiCall`, an async function with the full
implementation (URL builder, query parameter loop, JSON body parsing, binary download support).
`descriptions/index.ts` re-exports it:

```ts
export { executeCustomApiCall } from './CustomApiDescription';
```

However, `Weclapp.node.ts` does not import or call `executeCustomApiCall` anywhere. Without an
`execute()` method to dispatch to it, the function is dead code in the current build.

---

## Failure reproduction steps (for v0.2.0 fix verification)

After prerequisites PR4–PR5 are completed (node installed in docker n8n):

1. Create a workflow:
   - Webhook trigger → weclapp node (resource=`customApiCall`, operation=`call`, method=`GET`,
     entityPath=`currency`) → Respond to Webhook
2. Activate the workflow.
3. POST to `http://localhost:5678/webhook/qa/u17`.
4. **Expected (broken):** weclapp node outputs 0 items; Respond to Webhook has nothing to send.
5. **Expected (fixed):** weclapp node outputs `{result: [{id: "...", name: "EUR", ...}, ...]}`

---

## Recommended fix for v0.2.0

Two approaches are viable. The recommended one (Option A) avoids re-introducing `execute()`:

### Option A — Declarative routing with dynamic URL/method (preferred)

Add `routing` properties to the `call` operation and its fields. The challenge is that the URL and
method are dynamic (user-supplied). n8n declarative routing supports expressions:

```ts
// In customApiOperations, on the 'call' option:
{
  name: 'Call',
  value: 'call',
  routing: {
    request: {
      method: '={{ $parameter["method"] }}',
      url: '=/{{ $parameter["entityPath"].trim() }}{{ $parameter["entityId"] ? "/id/" + $parameter["entityId"] : "" }}{{ $parameter["action"] ? "/" + $parameter["action"] : "" }}',
    },
  },
},
```

Query parameters require a `routing` on each parameter field or use the `send.type: "query"` pattern.
Body requires `routing.request.body` expression. This approach keeps the node fully declarative.

**Caveats:** n8n declarative routing expressions for dynamic URLs have known edge cases with
URL-encoding and nested field collections (`queryParameters.parameter`). The QS loop in
`executeCustomApiCall` handles this correctly; reproducing it declaratively requires care.

### Option B — Hybrid: restore `execute()` for `customApiCall` only

Re-introduce a minimal `execute()` method that handles only `customApiCall` and delegates to
`executeCustomApiCall`. All other resources remain handled by declarative routing (n8n calls
`execute()` if defined, then falls through to declarative for nodes that return `null` from
`execute()` — this is not standard behavior; verify with n8n core docs before choosing this path).

**More likely approach:** `execute()` short-circuits to `executeCustomApiCall` when
`resource === 'customApiCall'`, then for all other resources re-invokes the declarative dispatcher
via `this.helpers.httpRequestWithAuthentication` or similar. This is messy and reintroduces the
stub pattern PR#28 tried to eliminate.

### Recommendation

Implement **Option A** with careful expression testing. The `buildEndpoint` logic in
`executeCustomApiCall` is simple enough to inline as a declarative URL expression. The
`queryParameters` collection is harder — consider replacing it with a `json` type field
(`Additional Query Params`) that accepts a flat JSON object, which maps cleanly to
`routing.request.qs = '={{ $parameter["queryParams"] }}'`.

---

## Infrastructure gap confirmation

The activation error `"Unrecognized node type: n8n-nodes-weclapp.weclapp"` confirms that
prerequisites PR4–PR5 (build node, copy `dist/` into docker n8n, restart container) have not been
executed. This is a **blocker for all 17 smoke-test workers**, not just U17. The coordinator must
complete those prerequisites before any smoke worker can produce live execution evidence.

---

## Bugs / friction found

- **[CRITICAL] customApiCall produces 0 output items silently** — no error, no output, operation
  appears to succeed but passes nothing downstream. Matches issue #30 exactly. Root cause: missing
  `routing` config + dead `executeCustomApiCall` function after PR#28. Fix required before v0.2.0.

- **[BLOCKER — infrastructure] weclapp node not installed in docker n8n** — `"Unrecognized node
  type: n8n-nodes-weclapp.weclapp"` on activation. Blocks all smoke workers. Coordinator must
  complete prerequisites PR4–PR5.

- **[LOW] executeCustomApiCall exported but unreachable** — dead export in
  `descriptions/index.ts`. No runtime harm, but misleading during code review. Should be removed or
  connected to a working dispatch path in v0.2.0.

---

## Cleanup

- Test workflow `QA-U17-custom-api-smoke` (ID: `5zj8pFyxr706Jg62`) created and deleted.
- No entities created on testhandel (workflow never executed).
- No cleanup failures.

---

## Execution IDs

None generated — workflow activation failed before any execution could run.

---

## Files inspected

- `nodes/Weclapp/Weclapp.node.ts` — confirmed no `execute()` method post-PR#28
- `nodes/Weclapp/descriptions/CustomApiDescription.ts` — confirmed zero `routing` properties
- `nodes/Weclapp/descriptions/index.ts` — confirmed `executeCustomApiCall` exported but not called
- `nodes/Weclapp/descriptions/ShipmentDescription.ts` — reference implementation of correct
  declarative `routing` pattern
- Git log: PR#28 commit `7355940` is the proximate cause; `executeCustomApiCall` predates it and was
  never wired to declarative routing
