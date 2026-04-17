# QA Report: U15 — Webhook Resource (v2)

**Date:** 2026-04-17  
**Branch:** `qa2/u15-webhook`  
**Node version:** v0.2.0-pre  
**n8n version:** 1.120.4 (Docker `n8n-local`, `docker.n8n.io/n8nio/n8n:latest`)  
**Tenant:** testhandel (`testhandel.weclapp.com`)  
**Credential used:** `jebRfSixFZZxu8qH` (weclappApi, "weclapp testhandel")  
**Test prefix:** `QA2-U15-`

---

## Test Setup

Five n8n test workflows were created via REST API:

| Workflow ID | Name | Trigger |
|---|---|---|
| `YYBnbWsO2ChTVRne` | QA2-U15-webhook-list | GET `/webhook/qa2/u15/list` |
| `SHXbTJT1tgVEiVCk` | QA2-U15-webhook-get | GET `/webhook/qa2/u15/get` |
| `K3zKN4v1ti1bdqxu` | QA2-U15-webhook-create | POST `/webhook/qa2/u15/create` |
| `XWqbaEXaXwwofYsB` | QA2-U15-webhook-update | POST `/webhook/qa2/u15/update` |
| `tD5bvSIcV6ctMI87` | QA2-U15-webhook-delete | POST `/webhook/qa2/u15/delete` |

Seed webhooks pre-created on testhandel:
- `6423510` — entity: article, url: `https://example.com/qa2-u15-seed` (used for get + update)
- `6424093` — entity: article, url: `https://example.com/qa2-u15-delete-seed` (used for delete)

**Infrastructure note:** `N8N_COMMUNITY_PACKAGES_ENABLED=true` was added to `docker-compose.yml` during this session. Community node workflows require startup activation (SQLite `active=1` + container restart) rather than runtime API activation; both methods ultimately result in activated webhooks.

---

## Results

| # | Operation | Exec ID | Status | Outcome |
|---|---|---|---|---|
| T1 | list (returnAll=false, limit=10) | 626 | success | 10 webhook items returned |
| T2 | get (webhookId=6423510) | 628 | success | 1 item: id=6423510, entityName=article |
| T3 | create (article/POST/atCreate=true) | 630 | success | 1 item: id=6424162, url/method/triggers correct |
| T4 | update (webhookId=6423510, atCreate=false, atUpdate=true) | 633 | success | 1 item: id=6423510, url/atCreate/atUpdate confirmed |
| T5 | delete (webhookId=6424093) | 634 | success | `{"deleted": true}` |

All 5 operations **PASS**.

---

## Findings

### BUG: `simplify=true` (default) returns 0 items — list and get broken by default

**Severity:** High — affects list and get operations silently  
**Affected operations:** list, get  
**Root cause:**

`listSimplify` in `WebhookDescription.ts` uses `type: 'filter'` postReceive:

```typescript
routing: {
    output: {
        postReceive: [{
            type: 'filter',
            enabled: '={{ $parameter["simplify"] }}',
            properties: {
                pass: '={{ ["id","url","entityName","atCreate","atUpdate","atDelete","requestMethod","version"].includes($key) }}'
            }
        }]
    }
}
```

n8n's `type: 'filter'` is an **item filter** — it evaluates `pass` against each item and drops items where `pass === false`. The expression uses `$key` which is not defined in the item-filter execution context. `$key` evaluates to `undefined`, and `[...].includes(undefined)` returns `false` for every item. Result: all items are dropped.

**Impact:** When `simplify` defaults to `true` (which it does via `simplifyField`), list and get return 0 items. This is a silent failure — n8n reports `executionStatus: success` with an empty output.

**Workaround applied in tests:** Set `simplify: false` explicitly in the test workflow parameters to bypass the filter.

**Fix required:** The `type: 'filter'` postReceive is not the correct mechanism for field key filtering. Options:
1. Remove the simplify routing entirely (field becomes UI-only, no filtering — consistent with how other resources like Article, SalesOrder implement simplify)
2. Use a `set` postReceive or a custom `preSend`/`postReceive` function to project only the desired keys

**Regression check:** Other resources (Article, SalesOrder, Warehouse, etc.) use `simplifyField` WITHOUT the routing override, so this bug is isolated to `WebhookDescription.ts` only.

---

## Comparison vs PR #33 (Direct-curl baseline)

PR #33 tested all 5 operations via direct `curl` against the weclapp REST API (not through the n8n node engine). This session re-verified the same operations **through the n8n node execution engine**.

| Operation | PR #33 (direct curl) | U15v2 (via n8n node) |
|---|---|---|
| list | PASS | PASS (with simplify=false) |
| get | PASS | PASS (with simplify=false) |
| create | PASS | PASS |
| update | PASS | PASS |
| delete | PASS | PASS |

**New finding in v2 (not detectable by direct-curl):** The `simplify=true` default silently drops all items in list/get operations.

---

## Infrastructure Issues Encountered (Not Node Bugs)

1. **`N8N_COMMUNITY_PACKAGES_ENABLED` missing from docker-compose.yml** — Fixed: added to compose file. Community node workflows were not loading without this flag.
2. **Runtime workflow activation fails for community node workflows** — n8n raises "Unrecognized node type" when activating via API PATCH/POST at runtime. Workaround: activate via SQLite `active=1` + `n8n_ctl.py push` startup, or use dedicated `/activate` API endpoint after initial startup.
3. **Credential type mismatch** — The remote n8n instance credential `jebRfSixFZZxu8qH` is `httpHeaderAuth` type there but `weclappApi` type in local n8n. Local testing requires a local `weclappApi` credential with correct field names (`baseUrl` + `apiKey`).

---

## Cleanup

- Deleted weclapp test webhooks: 6423510, 6424093, 6424162
- Deleted all 5 QA2-U15-* n8n workflows from local n8n instance
- No residual test data on testhandel tenant
