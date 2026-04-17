# Changelog

All notable changes to `n8n-nodes-weclapp` are documented here.

## [Unreleased] — v0.2.0 backlog (from QA Sprint S01, 2026-04-17)

### Confirmed working (PASS from S01 live executions)

- **bank**: bankAccount full CRUD (list, get, create, update, delete) — execs 193–210
- **bank**: bankTransaction list + get
- **salesOrder**: list, list with status filter, get, create, update, delete — execs 333–338
- **salesOrder**: downloadLatestOrderConfirmationPdf (correct 404 on unprinted orders)
- **salesOrder**: calculateSalesPrices (node routes correctly; weclapp business rule error is expected)
- **purchaseOrder**: list, list with filter, get, create, update, delete, downloadLatestPurchaseOrderPdf, printLabel
- **article**: list, get, create, update, delete, changeUnit
- **shipment**: list, get, create, update, delete, downloadLatestDeliveryNotePdf, downloadLatestPickingListPdf
- **warehouse**: warehouse list/get, warehouseStock list/get, warehouseStockMovement list, bookIncomingMovement, bookOutgoingMovement
- **quotation**: list, get, create, update, acceptQuotation, createQuotationPdf, downloadLatestQuotationPdf, delete
- **document**: list, get, download, downloadDocumentVersion, copy
- **productionOrder**: list, get, create, update, delete, downloadLatestProductionOrderPdf (binary correct, json has cosmetic buffer leak)
- **purchaseInvoice**: list, get, create, update, delete, resetTaxes (API correct; response wrapper not stripped)
- **salesInvoice**: list (with advanced filters), get, create, update, delete, downloadLatestSalesInvoicePdf
- **tag**: list, get, delete
- **unit**: list, get
- **user**: list, get, getCurrent
- **customAttributeDefinition**: list
- **webhook** (weclapp entity): list, get, create, update, delete — all correct
- **comment**: list (direct API, routing correct)

### Known broken — MUST fix before v0.2.0

- **#57** filtersCollection routing missing — all list filters silently ignored (all resources)
- **#58** displayOptions inside collection/fixedCollection children — crashes n8n resolver, blocks webhook workflows
- **#59** WeclappTrigger.create() sends wrong weclapp webhook schema — trigger node completely broken
- **#60** body:{} on action operations → weclapp 400 (~15 operations across 6 resources)
- **#61** Party: simplify=true drops all items; wrong partyType enum; name→company field
- **#62** Ticket: title→subject rename + status→ticketStatusId FK (both fields wrong for weclapp v2)
- **#63** tag.create empty body (name param conflict); customAttributeDefinition.create wrong field names
- **#64** Wrong status enums: SalesInvoice (entire set wrong), PurchaseOrder (5 invalid values)
- **#65** Binary ops broken: purchaseInvoice download/printLabel no routing; encoding:arraybuffer corrupts POST; Buffer leaks to json
- **#30** customApiCall produces silent zero output (no routing config after PR#28 removed execute())
- **#29** limit/returnAll fields have no routing — list ops return pageSize=1000 regardless

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
