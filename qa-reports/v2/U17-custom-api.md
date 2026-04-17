# Re-QA Report — U17 Custom API Call (v0.2.0-pre)

**Date:** 2026-04-17
**Tester:** coordinator agent (Claude Sonnet 4.6)
**n8n:** localhost:5678 (v1.120.4) | weclapp tenant: testhandel
**Branch:** qa2/u17-custom-api (from main @ 6d4ee87)
**Node version:** main @ 6d4ee87 (post-PR#79 — F2 merged)
**Credential:** `jebRfSixFZZxu8qH` (weclapp testhandel, type: weclappApi)

---

## Executive Summary

All five `customApiCall.call` operations are **non-functional** in v0.2.0-pre.

F2 (PR #79 "hybrid customOperations dispatcher") added the `customOperations` property to `Weclapp.node.ts`
and wired `customApiCall.call → executeCustomApiCall`. However, n8n v1.120.4's runtime does **not** dispatch
via `customOperations`. The property is declared in the `n8n-workflow` interface (v1.117.1) but the n8n core
executor does not call it. n8n's declarative router runs instead, finds no `routing` config on the `call`
operation, attempts a request with an undefined URL, and throws `NodeApiError: Invalid URL` on every
execution.

**Root cause:** `customOperations` is in the `INodeType` interface but not yet implemented in n8n's
execution engine at v1.120.4. The fix requires adding an `execute()` method that dispatches composite
operations to the handlers in `customOperations`.

---

## vs. PR #32 (F1) — Before/After

| Aspect | PR #32 (F1 — issue #30) | v0.2.0-pre (F2 — PR #79) |
|--------|--------------------------|---------------------------|
| `executeCustomApiCall` | Exported but dead code — not imported in `Weclapp.node.ts` | Imported and wired into `customOperations.customApiCall.call` |
| Dispatch mechanism | No `execute()`, no `routing` on `call` — 0 output items | No `execute()`, `customOperations` not dispatched by n8n — `NodeApiError: Invalid URL` |
| Error visibility | Silent (0 items, no error) | Explicit 500 from webhook, `NodeApiError: Invalid URL` in execution |
| Root cause | Dead code (function never called) | Interface mismatch (n8n doesn't invoke `customOperations` at v1.120.4) |

F2 is an improvement in one sense: the error is now explicit instead of silent. But `customApiCall` is still fully non-functional.

---

## Test Executions

All 5 test workflows created via REST API (`/api/v1/workflows`), activated, and triggered via production webhooks.

| # | Workflow | Method | entityPath | Exec ID | Result | Error |
|---|----------|--------|------------|---------|--------|-------|
| 1 | QA2-U17-get-currency | GET | `currency` | 431 | FAIL | `NodeApiError: Invalid URL` |
| 2 | QA2-U17-get-paymentMethod | GET | `paymentMethod` | 432 | FAIL | `NodeApiError: Invalid URL` |
| 3 | QA2-U17-get-termOfPayment | GET | `termOfPayment` | 433 | FAIL | `NodeApiError: Invalid URL` |
| 4 | QA2-U17-post-comment | POST | `comment` | 435 | FAIL | `NodeApiError: Invalid URL` |
| 5 | QA2-U17-get-article-pageSize1 | GET | `article` (pageSize=1) | 436 | FAIL | `NodeApiError: Invalid URL` |

No binary (returnBinary=true) test was attempted — the base GET path fails before reaching any binary logic.

---

## Root-Cause Analysis

### Why `customOperations` does not dispatch

`n8n-workflow` v1.117.1 defines `customOperations` on `INodeType`:

```ts
// interfaces.d.ts line 1228-1235
/**
 * Defines custom operations for nodes that do not implement an `execute` method,
 * such as declarative nodes. This function will be invoked instead of `execute`
 * for a specific resource and operation.
 */
customOperations?: {
    [resource: string]: {
        [operation: string]: (this: IExecuteFunctions) => Promise<NodeOutput>;
    };
};
```

However, a grep of all n8n runtime JS files (`/usr/local/lib/node_modules/n8n/**/*.js` and
`/usr/local/lib/node_modules/n8n/node_modules/**/*.js`) finds **zero occurrences** of `customOperations`
outside of the type declaration files. The executor does not read or invoke this property.

### What actually happens

When `customApiCall.call` runs:

1. n8n detects no `execute()` on `Weclapp` → falls back to declarative router.
2. Declarative router reads `routing` properties from the active parameters of `call`.
3. The `call` option in `customApiOperations` has no `routing.request` — by design (PR #79 explicitly
   avoids adding routing, relying on `customOperations` dispatch instead).
4. Router has no method or URL — assembles an empty request and throws `NodeApiError: Invalid URL`.

### What `customOperations` currently IS (in this n8n version)

The property exists as forward-looking interface scaffolding — n8n has declared the contract in the type
system but not yet implemented the runtime dispatch. This is consistent with n8n's public roadmap for
declarative node enhancements.

---

## Bug Filed

**BUG-v02-U17-001** [CRITICAL] — `customApiCall.call` throws `NodeApiError: Invalid URL` on every execution.

- **Affected operations:** All `customApiCall.call` executions regardless of method, entityPath, or parameters.
- **Root cause:** `customOperations` not invoked by n8n v1.120.4 runtime; declarative router runs instead and
  finds no `routing` on the `call` option.
- **Impact:** `customApiCall` resource is completely non-functional. All 5 operations tested: FAIL.
- **Regression vs F1:** Changed from silent 0-item output to explicit error. Still a full blocker.

**Recommended fix for v0.2.0:**

Add an `execute()` method that dispatches to `customOperations` handlers when a match exists:

```ts
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const handler = (this as unknown as Weclapp).customOperations?.[resource]?.[operation];
    if (handler) {
        return handler.call(this);
    }
    // No customOperation — this should not be reached for declarative ops,
    // but guard to avoid silent failure.
    throw new NodeOperationError(
        this.getNode(),
        `No execute handler for resource=${resource} operation=${operation}`,
    );
}
```

Note: Adding `execute()` means n8n will no longer use declarative routing for ANY operation on this node.
All declarative operations (article.list, party.get, etc.) must then be handled either by routing their
requests through `this.helpers.httpRequestWithAuthentication` in `execute()`, or by keeping the declarative
`routing` properties as self-contained per-operation routing config that is somehow invoked. The cleanest
option may be to implement a thin execute() dispatcher that calls `customOperations` handlers for known
composite ops and leaves declarative routing intact for all others — but this requires n8n's internal
`executeDeclarative()` to be accessible. The simpler path: keep `customOperations` as a dispatch map,
add `execute()` that routes composite ops to it, and rely on n8n's built-in declarative routing for non-composite
ops by NOT returning early for them (which requires n8n to support a `null` return from `execute()` as "use
declarative" — this is NOT currently the case in v1.120.4).

**Alternative:** Add `routing` back to the `call` operation with expression-based URL, similar to Option A
in the PR #32 report. This avoids `execute()` entirely and stays fully declarative.

---

## Infrastructure Notes

- `customOperations` dispatch NOT implemented in n8n v1.120.4 runtime (confirmed via source search).
- `weclappApi` credential type IS recognized (`/api/v1/credentials/schema/weclappApi` returns valid schema).
- Node IS loaded at `/home/node/.n8n/nodes/node_modules/n8n-nodes-weclapp/` (confirmed — other QA2 workers'
  workflows using declarative ops succeed).
- n8n MCP `n8n_create_workflow` tool has a confirmed bug: reports workflow IDs that don't exist in the
  instance's database (IDs `mhEDqddLPYjcoYS6`, `nxldi7psteA1Hz57`, etc. were returned as "created" but
  don't appear in REST API or DB). Workflows must be created via `/api/v1/workflows` REST endpoint directly.

---

## Cleanup

All 5 test workflows deleted after testing:
- `n9THLIdOc4irW9X9` (QA2-U17-get-currency) — deleted
- `Z2KQP7psXGKpne4d` (QA2-U17-get-paymentMethod) — deleted
- `JbQjEQUDIpUo12mK` (QA2-U17-get-termOfPayment) — deleted
- `7yQawiwt6OanqBDv` (QA2-U17-post-comment) — deleted
- `X0kjZy92Tk5IZmSx` (QA2-U17-get-article-pageSize1) — deleted

5 phantom MCP-created IDs also deleted via MCP delete (they existed in MCP's view but not in the DB).

No entities created on testhandel (all executions failed before any weclapp API call completed).

---

## Execution IDs

All on wf `n9THLIdOc4irW9X9` through `X0kjZy92Tk5IZmSx`: exec IDs 431–436 (status: `error`).

## Files Inspected

- `/Users/markus/Projects/n8n-nodes-weclapp-qa2-u17/nodes/Weclapp/Weclapp.node.ts` — `customOperations` wired, no `execute()`
- `/Users/markus/Projects/n8n-nodes-weclapp-qa2-u17/nodes/Weclapp/descriptions/CustomApiDescription.ts` — `executeCustomApiCall` implemented, no `routing` on `call` option
- `/usr/local/lib/node_modules/n8n/node_modules/n8n-workflow/dist/cjs/interfaces.d.ts` — `customOperations` interface declared (v1.117.1)
- n8n runtime JS (v1.120.4) — zero invocations of `customOperations` found
