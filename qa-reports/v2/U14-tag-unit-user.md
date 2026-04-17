# QA Report: U14 — Tag / Unit / User / CustomAttributeDefinition

**Branch:** `qa2/u14-tag-unit-user`  
**Date:** 2026-04-17  
**n8n version:** 1.120.4 (local Docker)  
**Node version under test:** n8n-nodes-weclapp v0.1.0-pre (commit `a478da6` rebased on main)  
**weclapp tenant:** testhandel  
**Result:** 16/16 PASS

---

## Fixes Verified

### F7 — Body parameter rename (create sends correct payload)

**Before (PR #54 / main):** tag:create, unit:create sent empty body because the top-level parameter was named `name` (shadowed by resource-level naming). weclapp returned 400.

**After:** Parameters renamed:
- `tag.tagName` → sends `name` in body ✓
- `unit.unitName` → sends `name` in body ✓
- `cad.entities` / `cad.attributeType` / `cad.label` → correct body keys ✓

### F1 — `displayOptions` removed from collection children

**Before (PR #54 / main):** `tagBody.options[0]` (tagName), `unitBody.options[1]` (unitName), and equivalents had `displayOptions: { show: { operation: ['update'] } }` inside the collection `options` array. n8n's `getParameterResolveOrder` detected the collection child `displayOptions` and threw "Max iterations reached" at workflow activation time, preventing any workflow containing tag:create, tag:update, unit:create, or unit:update from activating.

**After (PR #58):** `displayOptions` removed from all 6 collection child parameters. Workflows activate cleanly.

**Additional fix (this QA):** `WarehouseDescription.ts` had the same bug (`warehouseBodyFields.name` child had `displayOptions: { show: { operation: ['update'] } }`). This was also present in the node binary and caused startup errors in workflows using warehouse:update. Fixed in the same build.

### F8 — `ignoreMissingProperties` on PUT endpoints (new fix, this QA)

**Root cause discovered during QA:** `PUT /tag/id/{id}` without `?ignoreMissingProperties=true` rejected partial updates with HTTP 400. Added `qs: { ignoreMissingProperties: true }` to `tag.update`, `unit.update`, and `user.update` routing. Same pattern already used by `salesOrder.update` and other entities.

---

## Test Matrix

| Test | Operation | Status | Notes |
|------|-----------|--------|-------|
| tag:list | GET /tag | PASS | Returns last tag |
| tag:get | GET /tag/id/{id} | PASS | |
| tag:create | POST /tag | PASS | F7 fix verified |
| tag:delete | DELETE /tag/id/{id} | PASS | |
| tag:update | PUT /tag/id/{id} | PASS | F1 + F8 fixes verified |
| unit:list | GET /unit | PASS | |
| unit:get | GET /unit/id/{id} | PASS | |
| unit:create | POST /unit | PASS | F7 fix verified |
| unit:delete | DELETE /unit/id/{id} | PASS | |
| user:list | GET /user | PASS | |
| user:get | GET /user/id/{id} | PASS | |
| user:getCurrent | GET /user/currentUser | PASS | |
| cad:list | GET /customAttributeDefinition | PASS | |
| cad:create | POST /customAttributeDefinition | PASS | F7 fix verified |
| cad:get | GET /customAttributeDefinition/id/{id} | PASS | |
| cad:delete | DELETE /customAttributeDefinition/id/{id} | PASS | |

---

## Before vs After (PR #54)

| Operation | PR #54 | This branch |
|-----------|--------|-------------|
| tag:create | FAIL — body `{}`, weclapp 400 | PASS |
| tag:update | FAIL — "Max iterations reached" at activation | PASS |
| unit:create | FAIL — body `{}`, weclapp 400 | PASS |
| unit:update | FAIL — "Max iterations reached" at activation | PASS |
| cad:create | FAIL — wrong body field names | PASS |
| All others | PASS | PASS |

---

## Deployment Notes

**Critical discovery during QA:** The n8n Docker container had two separate `node_modules` directories:
1. `/home/node/.n8n/nodes/` — bind-mounted BUT NOT used by n8n (wrong path)
2. `/home/node/.n8n/.n8n/nodes/` — the actual path n8n uses (`N8N_USER_FOLDER=/home/node/.n8n` → `n8nFolder = userHome + '/.n8n'`)

The package.json at `n8n_data/.n8n/nodes/package.json` uses `file:../../n8n-nodes-weclapp-0.1.0.tgz` which resolves to `n8n_data/n8n-nodes-weclapp-0.1.0.tgz` (the bind-mount root). **This tgz must be kept updated when deploying new node versions.**

---

## Cleanup

- Orphaned `QA2-U14-update-before` tag (ID 6424406) created during earlier test run — HTTP 405 on DELETE (likely already cleaned up by weclapp or does not exist).
- All `QA2-U14-upd-before` / `QA2-U14-upd-after` test tags created during final run: auto-deleted by test workflow.
- No orphaned customAttributeDefinitions remain.
