# Changelog

All notable changes to `n8n-nodes-weclapp` are documented here.

## [0.2.0-rc1] - 2026-04-17

### Summary

Release candidate combining all QA sprint fixes (47 PRs merged) plus post-QA descriptor
corrections confirmed against testhandel. This RC is deployed to local Docker n8n for
final validation before v0.2.0 final.

### Fixed in RC1 (PRs #70–#114, on top of v0.2.0 base)

- **filter routing** (#57/#77): `filtersCollection` wired via preSend hook; all list filters now reach the weclapp API correctly
- **binary download wiring** (#65/#74): `prepareBinaryData` postReceive + `encoding: arraybuffer` + `returnFullResponse: true` on all download operations; Buffer no longer leaks into json output
- **body:{} action handling** (#60/#75): removed empty `body: {}` from all non-body POST actions (31 operations across 6 resources) — weclapp was returning 400
- **party descriptor** (#61/#70): correct `partyType` enum (ORGANIZATION/PERSON), `name`→`company` body field, `simplify` postReceive fixed
- **ticket descriptor** (#62/#72): `title`→`subject`, `status`→`ticketStatusId` FK; comment `entityName` body field corrected
- **tag/unit/customAttributeDefinition** (#63/#73): `name` param conflict resolved; `tagName`/`unitName` body mapping; `cad.create` field names corrected
- **status enums** (#64/#76): salesInvoice status set fully replaced; purchaseOrder invalid values removed; `recipientId`→`supplierId`
- **filter + pagination routing** (#29 partial/#77): `limit` routes as `pageSize`; `paginationConfig` exported
- **composite dispatcher** (#30/#79): `customOperations` programmatic dispatcher routes article.updatePrices, purchaseInvoice.applyPayment, document.upload/uploadNewVersion, customApiCall
- **WeclappTrigger** (#59/#78): corrected POST /webhook schema (atCreate/atUpdate/atDelete + entityName + requestMethod)
- **displayOptions regression** (#58/#90): removed `displayOptions` from fixedCollection children in TagUnitUserDescription — fixes "Max iterations reached" crash on workflow activation
- **baseURL regression** (#91/#101): `resolveWeclappUrl` centralizes credential baseURL resolution; fixes Invalid URL in customOperations (document upload)
- **warehouse descriptor** (#38/#114): removed redundant `warehouseId` body field; fixed filter property `movementType-eq`→`stockMovementType-eq`; preSend hooks strip empty filter values; removed `displayOptions` from warehouse collection child (same crash as #58)
- **tag/unit/user update** (#113): added `?ignoreMissingProperties=true` to PUT routes for tag, unit, user — partial updates previously returned 400
- **test suite** (#31/#71): all pre-existing test failures fixed; 472 tests pass

### Known open issues (deferred to v0.2.0 final)

- **#100**: F4 regression — salesInvoice v2 re-QA found a routing edge case (see qa2/u05-sales-invoice report)
- **#106**: WeclappTrigger webhook simplification — atCreate/atUpdate/atDelete can be simplified to a single boolean flag
- **#108**: article PDF operations not yet covered by QA
- **#109**: purchaseInvoice.applyPayment has partial dispatch gap (no test for payment body shape)
- **#110/#111**: empty date fields on some resources send `null` instead of omitting
- **#112**: productionOrder json output has cosmetic buffer leak on PDF download (separate from binary data which is correct)
- **customApiCall** (BUG-v02-U17-001): `customOperations` dispatcher works but `customApiCall` still does not surface output items in the n8n canvas — deferred investigation

### QA Verification (v0.2.0-rc1 sprint)

47 PRs merged from QA sprint workers (U01–U17, R01–R07, two synthesis rounds).
All 472 unit + integration tests pass. No regressions introduced.

---

## [0.2.0] - 2026-04-16

### Highlights

- All list filters now work: `filtersCollection` wired via preSend hook (#57, PR #77)
- Composite operations enabled: `article.updatePrices`, `purchaseInvoice.applyPayment`, `document.upload` + `uploadNewVersion`, `customApiCall` (#30, PR #79)
- `customApiCall` fully functional via programmatic dispatcher (#30, PR #79)
- `WeclappTrigger` register/deregister corrected for weclapp v2 webhook schema (#59, PR #78)
- All empty-body POST actions fixed: 31 operations across 6 resources (#60, PR #75)
- All binary download operations fixed: binaryData postReceive + returnFullResponse (#65, PR #74)
- Party resource: correct partyType enum (ORGANIZATION/PERSON), company field, simplify fixed (#61, PR #70)
- Ticket resource: title→subject, status→ticketStatusId FK, comment entityName body (#62, PR #72)
- Tag/unit/user resource: name param conflict resolved; customAttributeDefinition body corrected (#63, PR #73)
- SalesInvoice and PurchaseOrder status enums corrected; recipientId→supplierId (#64, PR #76)
- `limit` field now routes as `pageSize` query param; `paginationConfig` exported (#29 partial, PR #77)
- Pre-existing test failures fixed; all 460 tests pass (#31, PR #71)
- Theme-aware node icons (transparent background, dark/light variants) (PR #69)

### Fixed Issues

#29 (partial), #30, #31, #57, #59, #60, #61, #62, #63, #64, #65

### Known Limitations

- `tag.create`, `tag.update`, `unit.create`, `unit.update`, `user.create`, `user.update` crash n8n's parameter resolver (issue #58 — displayOptions inside fixedCollection children). Workaround: use `customApiCall` for these operations.
- `returnAll` on list operations does not yet paginate beyond `pageSize=1000` (issue #29 follow-up — paginationConfig not yet wired into resource descriptors).

### Breaking Changes

- **party**: `partyType` values changed from `CUSTOMER/SUPPLIER/PROSPECT` to `ORGANIZATION/PERSON`. Existing workflows using the old values must be updated.
- **party.create**: `name` body field renamed to `company`. Existing mappings must be updated.
- **ticket**: `title` field renamed to `subject`. Existing workflows must update field references.
- **ticket**: `status` filter replaced with `ticketStatusId` (FK to ticketStatus entity). Existing filter values must be replaced with weclapp ticketStatus entity IDs.
- **salesInvoice**: status enum values fully replaced (e.g. OPEN → OPEN_ITEM_CREATED). Update any hardcoded values.
- **purchaseOrder**: invalid status values removed (IN_PROCESS, NEW, ORDER_CONFIRMATION_PRINTED, PARTLY_RECEIVED, RECEIVED); CLOSED and ORDER_DOCUMENTS_PRINTED added.
- **tag**: internal parameter renamed `name` → `tagName` (weclapp body key `name` unchanged).
- **unit**: internal parameter renamed `name` → `unitName` (weclapp body key `name` unchanged).
- **customAttributeDefinition.create**: `entityName` → `entities[]` (multiOptions), `type` → `attributeType`, `label` now required.
- **WeclappTrigger**: static data key `weclappWebhookIds[]` renamed to `weclappWebhookId` (single string). Existing trigger nodes must be re-configured after upgrading.

---

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
