# Changelog

All notable changes to `n8n-nodes-weclapp` are documented here.

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
