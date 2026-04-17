# TODO — v0.2.0 Final

Known issues that must be fixed before publishing `v0.2.0` to npm. `v0.2.0-rc1` is tagged but not released; the items below are the gate.

## Systemic (blocks multiple resources)

- [ ] **#100 — F4 regression: empty-body POST actions broken** — removing `body: {}` caused the same 400 the original had. weclapp requires the `{}` body + `Content-Type: application/json`; n8n appears to drop Content-Type when body is empty. Need to investigate whether to restore `body: {}` with explicit headers on each action, or use a preSend hook. Affects ~15 action ops across SalesOrder, SalesInvoice, PurchaseInvoice, Shipment, ProductionOrder, Party.
- [ ] **#29 — `limit` / `returnAll` not fully wired** — PR #77 added `paginationConfig` and routing on `limit`, but resource descriptors still need to spread `paginationConfig` into each list op's `routing.operations.pagination`. Without it, `returnAll=true` doesn't paginate, `limit=N` is ignored where routing override is missing.
- [ ] **#83 — `customApiCall` has no pagination** — hard-coded `page=1`; large responses silently truncate. Add pagination support to `executeCustomApiCall`.
- [ ] **#106 — Webhook resource broken `listSimplify`** — same `type:'filter'` pattern as party had (PR #70 fixed); remove from `WebhookDescription.ts`. Audit other descriptors for the same pattern: `grep -rn "type: .filter." nodes/Weclapp/descriptions/`.

## Resource-specific

- [ ] **#80 — warehouseStockMovement filter key** — change `movementType-eq` → `stockMovementType-eq` in descriptor (inline-fixed in PR #38, verify)
- [ ] **#81 — ticket.markRead returns 404** — endpoint may not exist in weclapp v2. Either remove from descriptor or document as conditional.
- [ ] **#82 — productionOrder.create with status: NEW rejected** — only `ENTRY_IN_PROGRESS` accepted as initial status. Fix default / remove NEW from enum.
- [ ] **#108 — article.createDatasheetPdf / createLabelPdf missing required body params** — add `commercialLanguageId`, `salesChannel` (+ `printCount`, `startPosition` for label) to routing body.
- [ ] **#109 — article.packagingUnitStructure missing rootProperty unwrap** — add `postReceive: [{type: 'rootProperty', properties: { property: 'result' }}]`.
- [ ] **#111 — applyPayment wrong body key** — code sends `bankTransactionId`, weclapp wants `moneyTransactionId`. Translate at the wire in `executeApplyPayment`.
- [ ] **#112 — update sends empty date fields** — `invoiceDate: ""` in body causes 400. Conditional-send via `value: '={{ $value || undefined }}'` or preSend to strip empty strings. Audit all date fields in update ops.

## After these fixes

1. Re-run targeted smoke tests against testhandel for each affected resource
2. Bump `package.json` version to `0.2.0`
3. `npm run release` → GitHub Actions publishes to npm with provenance
4. Submit to n8n Creator Portal for verified badge

## Post-v0.2.0 roadmap

- v0.3.0: add `opportunity` resource (currently requires `customApiCall`)
- v0.3.0: raw-filter-expression escape hatch for compound `filter=(A) and (B)` weclapp syntax — currently 42%+ of list ops in production workflows require `customApiCall` fallback
- Upstream n8n PR: fix `WebhookRequestHandler.sendStaticResponse` to check `Buffer.isBuffer` before `res.json` (currently serializes binary as `{"type":"Buffer","data":[...]}` JSON)
