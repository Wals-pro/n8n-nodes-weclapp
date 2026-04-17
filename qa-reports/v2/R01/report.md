# Re-QA Report — R01v2 LIVE-weclapp-Autopilot vs v0.2.0-pre

Date: 2026-04-17
Tester: QA2-R01 agent
n8n: localhost:5678 | weclapp tenant: testhandel
Branch: qa2/r01-autopilot
Baseline: qa/r01-autopilot-rebuild → qa-reports/R01/rebuilt-autopilot.json (exec 274, 428ms, 100% pass)

---

## Baseline Recap (v0.1.0 R01)

| Metric | Value |
|--------|-------|
| Total nodes | 98 (+1 webhook trigger) |
| weclapp nodes | 33 |
| customApiCall (fallback) | 14 |
| Structured ops | 19/33 (58%) |
| Exec 274 status | success, 428ms |

---

## v0.2.0-pre Changes That Affect This Workflow

### Schema change: operation value + queryParameters field names

PR #30 (fix/30-composite-dispatcher) moved customApiCall.call from declarative routing to a
customOperations programmatic handler. As a side effect:

1. Operation value changed: operation: "customApiCall" -> operation: "call"
2. QueryParameters fixedCollection option name changed: queryParameters.parameters[].name -> queryParameters.parameter[].key

Migration applied to 13 nodes in this QA run.

### PR #77: filtersPreSend now sends structured filters

13 remaining customApiCall nodes use weclapp native filter= expressions (multi-condition boolean).
Not expressible via structured filter UI. 0 customApiCall nodes eliminable with v0.2.0.

---

## Workflow Node Counts (v2 rebuilt)

| Category | Count |
|----------|-------|
| Total nodes | 98 |
| n8n-nodes-weclapp.weclapp nodes | 33 |
| customApiCall (resource=customApiCall, op=call) | 13 |
| Structured ops | 20/33 (61%) |
| n8n-nodes-base.httpRequest | 0 |

---

## Deployment

Deployed ID: lL121pqhuK8AzBHN (localhost:5678)
Credential: weclapp testhandel (id 33W3qe5npskLyvjd on localhost)
Webhook path: /webhook/qa/r01-autopilot

---

## Execution Results

Execution ID: 376
Status: success (workflow-level; failing nodes use onError: continueRegularOutput)
Duration: 285ms
Nodes executed: 24 / 98

| Status | Count |
|--------|-------|
| OK | 14 |
| ERROR: Invalid URL | 10 |
| Not reached | remaining |

---

## Bugs Found

### [CRITICAL] BUG-v02-R01-001: customApiCall "Invalid URL" — relative URL not resolved in customOperations handler

Introduced by: PR #30 (fix/30-composite-dispatcher)
Affects: All 13 customApiCall nodes (and executeApplyPayment, executeUpdatePrices, document.upload)

Root cause: In v0.1.0, customApiCall used declarative routing. n8n's routing engine automatically
prepends requestDefaults.baseURL (={{$credentials.baseUrl}}) to relative paths before calling
httpRequestWithAuthentication. In v0.2.0, PR #30 moved customApiCall.call to a customOperations
handler (executeCustomApiCall). customOperations handlers do NOT inherit requestDefaults.baseURL.
weclappApiRequest passes /salesOrder to httpRequestWithAuthentication which throws TypeError: Invalid URL.

Fix in GenericFunctions.ts weclappApiRequest: detect relative path, resolve credential baseUrl, build absolute URL.

### [INFO] page=1 hardcoded on all customApiCall GET nodes (unchanged from R01)

No regression — reported in R01.

---

## Comparison: v0.1.0 R01 vs v0.2.0-pre R01v2

| Metric | v0.1.0 exec 274 | v0.2.0-pre exec 376 | Delta |
|--------|-----------------|---------------------|-------|
| Exec status | success | success* | |
| Duration | 428ms | 285ms | -143ms (no API calls) |
| Nodes executed | 33+ | 24 | downstream cutoff |
| customApiCall errors | 0 | 10 | REGRESSION |
| Structured op errors | 0 | 0 | |
| customApiCall count | 14 | 13 | count correction |

*Workflow-level success; all customApiCall nodes errored internally.

---

## Verdict

v0.2.0-pre introduces a CRITICAL regression via BUG-v02-R01-001. Required fix before v0.2.0 release:
resolve baseUrl from credential in weclappApiRequest when endpoint is a relative path.
