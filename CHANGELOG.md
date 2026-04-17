# Changelog

All notable changes to `n8n-nodes-weclapp` are documented here.

## [Unreleased] — v0.2.0 backlog

QA sprint (2026-04-17): 0/24 workers produced reports. All ops BLOCKED at infrastructure level.
See `qa-reports/SUMMARY.md` for full gap analysis.

### Confirmed working (static analysis + build — no live test coverage yet)
- All 17 resource families present and build cleanly: article, bank, customApiCall, document, party, productionOrder, purchaseInvoice, purchaseOrder, quotation, salesInvoice, salesOrder, shipment, tag/unit/user, ticket/comment, warehouse, webhook
- WeclappTrigger node builds and wires subscribe/unsubscribe hooks
- 14 load-options locators defined (UI-level verification pending)
- Credential connectivity test against `/currency` endpoint

### Known broken / missing (must fix before v0.2.0 release)
- **#30** Composite ops non-functional: `updatePrices`, `applyPayment`, `document.upload`, `customApiCall.call` — execute() removed in PR #28
- **#29** `limit`/`returnAll` fields have no routing — list ops always return up to pageSize=1000, pagination loop absent
- **#31** 5 unit tests fail on main: apply-payment mock setup, smoke operator prefix mismatch (`eq` vs `-eq`)
- Binary download paths (PDF, document blobs) have zero end-to-end test coverage
- WeclappTrigger lifecycle untested against live weclapp API

## 0.1.0 — 2026-04-17

### Infrastructure & Core
- **#1** feat(credential): WeclappApi credential with AuthenticationToken header and /currency connectivity test
- **#2** feat(shared-fields): returnAllOrLimit, filters with 13 validated operators, additionalFields, simplify helpers
- **#23** feat(generic-functions): weclappApiRequest, pagination, filter builder, RFC 7807 parser, binary helpers
- **#22** feat(codegen): OpenAPI + @weclapp/sdk metadata generators + drift detection workflow
- **#20** chore(tests-docs): Prism contract tests, usage examples, README polish, node icon
- **#25** fix(custom-api): type compatibility fix with merged GenericFunctions

### Resources
- **#4** feat(bank): bankAccount CRUD, bankTransaction read-only + delete
- **#5** feat(party): CRUD, 3 actions, partyType filter preset
- **#7** feat(custom-api): generic HTTP call escape hatch for all weclapp endpoints
- **#11** feat(document): CRUD, upload, download, versions, copy — full action coverage
- **#17** feat(purchase-invoice): CRUD, 6 actions, applyPayment composite
- **#21** feat(article): CRUD, 7 actions, updatePrices composite
- **#12** feat(purchase-order): CRUD and 11 actions
- **#9** feat(production-order): CRUD, createPickingList, PDF
- **#16** feat(quotation): CRUD, acceptQuotation, PDF actions
- **#19** feat(sales-invoice): CRUD and all OpenAPI actions
- **#14** feat(sales-order): CRUD and all OpenAPI actions
- **#13** feat(shipment): CRUD and actions for shipment resource
- **#6** feat(tag-unit-user): lightweight CRUD for tag, unit, user, customAttributeDefinition
- **#15** feat(ticket-comment): ticket CRUD + markRead, comment CRUD
- **#10** feat(warehouse): warehouse + warehouseStock + warehouseStockMovement
- **#3** feat(webhook): CRUD for webhook subscriptions

### Trigger & Load Options
- **#18** feat(trigger): WeclappTrigger node with auto webhook register/unregister
- **#8** feat(load-options): listSearch + loadOptions for 14 resource locators and dropdowns

### Branding
- **#24** docs(branding): Wals-pro attribution in README, nodes, and credential
