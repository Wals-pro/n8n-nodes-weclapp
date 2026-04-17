# QA Sprint v0.2.0 — Synthesis Report (S01)

**Date:** 2026-04-17
**Aggregated:** 0/24 reports (0 U-units, 0 R-units)

> **NOTE — 0/24 reports aggregated.** All 24 worker worktrees were created and branches pushed, but no worker committed any `qa-reports/` files. The `qa-reports/` directories in every worktree are empty. This synthesis is therefore based on: static codebase analysis, known open GitHub issues (#29, #30, #31), live `npm test` output, and source-workflow inspection.

---

## 1. Pass / Fail Matrix

All 17 smoke units and 7 rebuild units are BLOCKED — no test was executed.

| Resource / Family | Operation | Result | Unit |
|---|---|---|---|
| Article | list | BLOCKED | U01 |
| Article | get | BLOCKED | U01 |
| Article | create | BLOCKED | U01 |
| Article | update | BLOCKED | U01 |
| Article | delete | BLOCKED | U01 |
| Article | updatePrices (composite) | BLOCKED | U01 |
| Article | createDatasheetPdf (binary) | BLOCKED | U01 |
| Party | list | BLOCKED | U02 |
| Party | get | BLOCKED | U02 |
| Party | create | BLOCKED | U02 |
| Party | update | BLOCKED | U02 |
| Party | delete | BLOCKED | U02 |
| SalesOrder | list | BLOCKED | U03 |
| SalesOrder | get | BLOCKED | U03 |
| SalesOrder | create | BLOCKED | U03 |
| SalesOrder | update | BLOCKED | U03 |
| SalesOrder | delete | BLOCKED | U03 |
| PurchaseOrder | list | BLOCKED | U04 |
| PurchaseOrder | get | BLOCKED | U04 |
| PurchaseOrder | create | BLOCKED | U04 |
| PurchaseOrder | update | BLOCKED | U04 |
| PurchaseOrder | delete | BLOCKED | U04 |
| PurchaseOrder | downloadLatestPurchaseOrderPdf (binary) | BLOCKED | U04 |
| SalesInvoice | list | BLOCKED | U05 |
| SalesInvoice | get | BLOCKED | U05 |
| SalesInvoice | actions | BLOCKED | U05 |
| PurchaseInvoice | list | BLOCKED | U06 |
| PurchaseInvoice | get | BLOCKED | U06 |
| PurchaseInvoice | downloadLatestPurchaseInvoiceDocument (binary) | BLOCKED | U06 |
| PurchaseInvoice | applyPayment (composite) | BLOCKED | U06 |
| Quotation | list | BLOCKED | U07 |
| Quotation | create | BLOCKED | U07 |
| Quotation | acceptQuotation | BLOCKED | U07 |
| Quotation | createQuotationPdf (binary) | BLOCKED | U07 |
| Shipment | list | BLOCKED | U08 |
| Shipment | get | BLOCKED | U08 |
| Shipment | createPickingList | BLOCKED | U08 |
| Warehouse | list/get | BLOCKED | U09 |
| WarehouseStock | list | BLOCKED | U09 |
| WarehouseStockMovement | bookIncomingMovement | BLOCKED | U09 |
| WarehouseStockMovement | bookOutgoingMovement | BLOCKED | U09 |
| BankAccount | list/create/update/delete | BLOCKED | U10 |
| BankTransaction | list | BLOCKED | U10 |
| Document | upload (binary, multipart) | BLOCKED | U11 |
| Document | download (binary) | BLOCKED | U11 |
| Document | downloadDocumentVersion | BLOCKED | U11 |
| Document | copy | BLOCKED | U11 |
| ProductionOrder | list | BLOCKED | U12 |
| ProductionOrder | get | BLOCKED | U12 |
| ProductionOrder | createPickingList | BLOCKED | U12 |
| ProductionOrder | downloadLatestProductionOrderPdf | BLOCKED | U12 |
| Ticket | create/update/delete | BLOCKED | U13 |
| Comment | create (linked) | BLOCKED | U13 |
| Tag | list/create/delete | BLOCKED | U14 |
| Unit | list | BLOCKED | U14 |
| User | list | BLOCKED | U14 |
| CustomAttributeDefinition | list | BLOCKED | U14 |
| Webhook | list/create/delete | BLOCKED | U15 |
| WeclappTrigger | subscribe + end-to-end fire | BLOCKED | U16 |
| CustomApiCall | currency GET | BLOCKED | U17 |
| CustomApiCall | paymentMethod GET | BLOCKED | U17 |
| CustomApiCall | termOfPayment GET | BLOCKED | U17 |

**Root blocker:** Workers set up worktrees and branches but produced zero output. Known pre-conditions at sprint start: composite ops non-functional (issue #30), limit/returnAll routing absent (issue #29), 5 unit tests failing on main (issue #31).

---

## 2. Top 10 Gaps for v0.2.0

Prioritized by impact x frequency. Confirmed by static analysis and live `npm test` output.

| # | Severity | Description | Affected Resources | Fix Estimate | Issues |
|---|---|---|---|---|---|
| 1 | CRITICAL | `execute()` removed in PR #28 breaks all composite/programmatic ops: `updatePrices`, `applyPayment`, `document.upload`, `customApiCall.call` | Article, PurchaseInvoice, Document, CustomApiCall | 2-4 h | #30 |
| 2 | CRITICAL | `limit`/`returnAll` fields have no routing — all list ops ignore user-set limit, return up to pageSize=1000 unconditionally | All 17 resources | 2-3 h | #29 |
| 3 | HIGH | 5 unit tests fail on clean `main`: apply-payment.spec.ts mock setup; smoke.spec.ts operator prefix mismatch (`eq` vs `-eq`) | GenericFunctions, SharedFields | 1-2 h | #31 |
| 4 | HIGH | No pagination loop for list ops: even with `returnAll=true` only page 1 is returned. weclapp uses `page`+`pageSize`; node never advances | All list operations | 3-4 h | #29 (related) |
| 5 | HIGH | Binary download paths (PDF, document blobs) zero end-to-end coverage. Helper exists but no integration test confirms binary data arrives correctly | Article, PurchaseOrder, PurchaseInvoice, Quotation, ProductionOrder, Document | 1 h | — |
| 6 | MEDIUM | `updatePrices` composite: price overlap logic, startDate/endDate second-granularity rounding, and endDate immutability rules are critical correctness constraints with zero coverage | Article | 3 h | #30 |
| 7 | MEDIUM | WeclappTrigger subscribe/unsubscribe lifecycle completely untested against live weclapp | WeclappTrigger | 2 h | — |
| 8 | MEDIUM | Operator filter suffix format inconsistency: dropdown values are bare (`eq`, `ne`) but smoke.spec.ts expects `-eq`, `-ne`. Runtime behavior unknown | SharedFields / GenericFunctions | 1 h | #31 |
| 9 | LOW | Many resource locators require raw weclapp IDs — no `loadOptions` search dropdown for articleId, partyId, etc. in several ops | Multiple resources | 4 h | — |
| 10 | LOW | Zero rebuild coverage: 7 production workflows (R01-R07, 69-97 nodes, 2-33 HTTP Request nodes each) not ported — no measured reduction % or gap discovery from real usage | All rebuild targets | 8 h | — |

---

## 3. Rebuild Summary

No rebuild was executed. Source node counts from static analysis of production JSON files.

| Unit | Source Workflow | Source Nodes | HTTP Req (weclapp) | Rebuilt Nodes | Reduction % | Coverage % | Blockers |
|---|---|---|---|---|---|---|---|
| R01 | LIVE-weclapp-Autopilot (neudorff) | 97 | 33 | not run | — | — | #30 composite ops |
| R02 | LIVE-weclapp-Price-SalesChannel-Sync (alango) | 26 | 6 | not run | — | — | #30 updatePrices |
| R03 | CRON-Purchase-Invoice-Processor (walspro) | 47 | 17 | not run | — | — | #30 applyPayment + upload |
| R04 | LIVE-weclapp-Dispo-Tool (neudorff) | 15 | 5 | not run | — | — | #29 list limits; otherwise low-risk |
| R05 | LIVE-quotation-accepted-slack (get) | 15 | 3 | not run | — | — | WeclappTrigger untested |
| R06 | weclapp-Auftragsworkflow (nunc) | 51 | 26 | not run | — | — | #29 list limits; largest footprint |
| R07 | DEMO-Pulpo-Zone-Tag-Sync (localhost) | 8 | 2 | not run | — | — | Low blocker risk; tag + warehouseStock |

Estimated potential node reduction once blockers fixed: R01 ~34%, R03 ~36%, R06 ~51%.

---

## 4. UX Friction Observations

Based on static description analysis (no UI testing performed):

1. **Filter field UX** — The `filters` collection has no autocomplete for weclapp property names. A `loadOptions` per resource for filterable fields would significantly reduce trial-and-error.

2. **`additionalFields` catch-all** — For resources with 30+ optional fields (article, party, salesOrder) this produces an enormous uncategorized dropdown. Grouping by category (Address, Accounting, Dates) would help.

3. **Operator dropdown labels** — Values appear to be bare strings (`eq`, `ilike`) while test assertions expect `-eq`, `-ilike`. Label-to-value mapping is inconsistent with surrounding code.

4. **Composite op discoverability** — `updatePrices` and `applyPayment` appear in the operation dropdown but silently produce no output post-PR #28. No runtime error message indicates they are disabled.

5. **Resource locators** — Where `listSearch` is wired the UX is good. Where it is missing, users must find raw weclapp IDs externally and paste them in.

---

## 5. weclapp API Quirks Discovered

From existing CLAUDE.md rules, open issues, and OpenAPI inspection (no live API calls from this sprint):

1. **Price overlap at second granularity** — weclapp validates startDate/endDate overlap at second precision despite millisecond storage. A 1 ms gap is rejected. Fix: `Math.floor(ms/1000)*1000` / `Math.ceil(ms/1000)*1000` at all boundaries.

2. **`endDate` immutability on existing price rows** — weclapp rejects any PUT that changes an already-set endDate. Composite must skip setting endDate on rows that already have one.

3. **PUT article requires full `articlePrices` array** — Omitting any existing price row from the PUT body deletes it permanently.

4. **Filter operators silently ignored for unknown suffixes** — `postingDate-gte=...` applies no filter at all (weclapp discards unknown suffix), returning the full unfiltered result set. The valid suffix is `-ge`. Can cause unexpected data volumes or OOM.

5. **Pagination uses `page` + `pageSize` integer params** — Not cursor-based. Stop condition: `result.length < pageSize`. Differs from most modern APIs.

6. **`createPaymentApplication` no partial allocation** — Exact amount match required between payment and open item. No FX, no partial payments. The `applyPayment` composite must enforce this.

---

## 6. Recommendations for v0.2.0 Release Gating

### MUST Fix (blocking release)

| # | Item | Issues |
|---|---|---|
| M1 | Restore `execute()` dispatcher for composite ops (updatePrices, applyPayment, document.upload, customApiCall) | #30 |
| M2 | Attach query-string routing to `limit` field; implement declarative pagination for returnAll=true | #29 |
| M3 | Fix failing unit tests on main (apply-payment.spec.ts, smoke.spec.ts operator prefix) | #31 |
| M4 | Re-run full 24-unit QA sprint after M1-M3 merged. No release without actual pass/fail data. | — |

### SHOULD Fix (v0.2.0 quality bar)

| # | Item |
|---|---|
| S1 | Confirm binary download paths work end-to-end — at minimum one integration test per binary op |
| S2 | Validate WeclappTrigger subscribe/unsubscribe against testhandel |
| S3 | Add missing loadOptions for resource locators that currently require raw ID entry |
| S4 | Fix operator value format inconsistency (bare `eq` vs `-eq`) |

### CAN Fix (v0.3.0 or later)

| # | Item |
|---|---|
| C1 | Group additionalFields by category for large resources |
| C2 | Add loadOptions for filterable field names per resource |
| C3 | Complete R01-R07 workflow rebuilds and publish as usage examples |
| C4 | Verify drift detection workflow runs cleanly against current OpenAPI |

---

*0/24 QA worker reports aggregated. All results inferred from static analysis, `npm test` output, and known GitHub issues — not from live test execution.*
