# @wals-pro/n8n-nodes-weclapp

[![npm](https://img.shields.io/npm/v/@wals-pro/n8n-nodes-weclapp?label=npm)](https://www.npmjs.com/package/@wals-pro/n8n-nodes-weclapp)
[![Build](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

n8n community node for the [weclapp](https://www.weclapp.com) ERP REST API (v2). Covers 16 resources with CRUD and entity actions, a generic Custom API Call operation for everything else, and a webhook trigger node. Maintained by [Wals-pro](https://wals.pro), a weclapp implementation partner — we build and run weclapp automations for customers, and this node is what our own workflows use.

**Status: stable.** The node is in productive use at Wals-pro and follows [semantic versioning](https://semver.org): breaking changes only land in major releases, each documented with migration notes in the [CHANGELOG](CHANGELOG.md). Known gaps are tracked in [GitHub Issues](https://github.com/Wals-pro/n8n-nodes-weclapp/issues). This is a community project — issues, pull requests, and first-time contributors are very welcome, see [Contributing](#contributing).

**Package name:** install **`@wals-pro/n8n-nodes-weclapp`**. The unscoped `n8n-nodes-weclapp` on npm is an unrelated package by a different author — that name was taken before this project existed, so this node is published under the `@wals-pro` scope.

---

## Requirements

- n8n with community nodes enabled — self-hosted (`N8N_COMMUNITY_PACKAGES_ENABLED=true`), or n8n Cloud once the node is available there.
- A weclapp API v2 token.
- Node.js ≥ 20.15 (only for manual npm installs).
- To use the node as a tool for AI Agents on self-hosted n8n, additionally set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Installation

**n8n GUI (self-hosted):** Settings → Community nodes → Install →

```
@wals-pro/n8n-nodes-weclapp
```

**npm:**

```bash
npm install @wals-pro/n8n-nodes-weclapp
```

**Docker:**

```bash
docker exec -u node -it <container-name> \
  npm install -g @wals-pro/n8n-nodes-weclapp
```

Restart n8n after installation.

---

## Authentication

1. In weclapp: **User Settings** (top-right menu → your name) → **API token** → Generate/copy.
2. In n8n: **Credentials → New** → search for **weclapp API**.
3. **Base URL**: `https://<your-subdomain>.weclapp.com/webapp/api/v2`
4. **API Key**: the token from step 1.
5. **Test credential** — n8n sends `GET /currency?pageSize=1` and expects `200 OK`.

Details: [docs/usage.md — Authentication](docs/usage.md#authentication)

---

## Quick start

1. Add a **weclapp** node.
2. **Resource** → `Article`, **Operation** → `Get Many`.
3. Enable **Return All** to fetch every page, or leave it off and set a **Limit**.
4. Optionally add a **Filter**, e.g. `status` / `Equals` / `ACTIVE`.

Importable example: [docs/examples/article-list.json](docs/examples/article-list.json)

---

## Supported resources

| Resource | Operations |
|---|---|
| Article | Get, Get Many, Create, Update, Delete + 7 actions |
| Party (Customer / Supplier) | Get, Get Many, Create, Update, Delete |
| Sales Order | Get, Get Many, Create, Update, Delete + order actions |
| Purchase Order | Get, Get Many, Create, Update, Delete + 11 actions |
| Sales Invoice | Get, Get Many, Create, Update, Delete + PDF |
| Purchase Invoice | Get, Get Many, Create, Update, Delete + Apply Payment |
| Quotation | Get, Get Many, Create, Update, Delete + PDF |
| Shipment | Get, Get Many, Create, Update, Delete + PDF |
| Warehouse / Stock | Get, Get Many + bookIncoming / bookOutgoing |
| Bank Account / Transaction | Get, Get Many |
| Document | Get, Get Many, Upload, Download |
| Production Order | Get, Get Many, Create, Update + PDF |
| Ticket + Comment | Full CRUD |
| Tag / Unit / User | Get, Get Many |
| Webhook | CRUD |
| Custom API Call | Any method / path — covers the remaining 130+ entities |

---

## Behavior notes

Things this node does that are worth knowing before you build on it:

- **Limit / pagination.** Every Get Many has the standard **Return All** toggle plus **Limit** (default `50`, max `1000` — weclapp's per-page ceiling). Return All paginates automatically at 1000 records per request.
- **Sort.** Every Get Many has a **Sort** collection — multiple field/direction rules, applied in order, sent as weclapp's `sort` parameter (`-` prefix for descending).
- **AI Agents.** Both nodes are usable as AI-Agent tools. Record pickers (`From List`), resource and operation descriptions are written to be model-readable. Self-hosted n8n needs `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.
- **Filters.** Field / operator / value rows support all 14 weclapp filter suffixes (`-eq`, `-ne`, `-in`, `-null`, …). `in`/`notin` accept comma lists (`A,B,C`). For OR and parenthesized logic, use **Raw Filter Expression** — it passes a verbatim weclapp `filter=` string.
- **Projection.** *Additional Fields* → `properties`, `includeReferencedEntities`, `additionalProperties`, `serializeNulls` are sent as query parameters. `additionalProperties` results (e.g. shipment `availability`) are merged onto each row under `json.additionalProperties`.
- **Updates are partial.** Update sends `PUT` with `ignoreMissingProperties=true`. No prior `version` fetch needed; only the fields you send change. A body of `{ "status": "DELIVERY_NOTE_PRINTED" }` is a valid, complete update.
- **Custom attributes.** On Create/Update (party, sales order, sales invoice, article) the tenant's custom-attribute definitions load as typed fields. Date values are converted to weclapp's Berlin-local epoch milliseconds.
- **Create guard.** With *Continue On Fail*, failed items emit `{ error }` into the main output. Gate downstream marker writes with `{{ $json.id != null && $json.error == null }}`, or use *Stop On Error* for marker workflows.
- **Errors.** weclapp RFC 7807 problem responses are parsed into readable n8n errors, including field-level validation messages.

More in [docs/usage.md](docs/usage.md).

---

## Trigger node

**weclapp Trigger** starts workflows on weclapp entity events:

1. Add **weclapp Trigger**, select **Entity Type** and **Events** (Created / Updated / Deleted).
2. Activate the workflow — the webhook is registered in weclapp automatically and removed on deactivation.

Example: [docs/examples/webhook-trigger.json](docs/examples/webhook-trigger.json)

---

## Examples

| Example | What it shows |
|---|---|
| [article-list.json](docs/examples/article-list.json) | List articles with a status filter |
| [party-create.json](docs/examples/party-create.json) | Create a customer |
| [sales-order-lifecycle.json](docs/examples/sales-order-lifecycle.json) | Get and update a sales order |
| [webhook-trigger.json](docs/examples/webhook-trigger.json) | Receive weclapp events |
| [reconciliation-find.json](docs/examples/reconciliation-find.json) | Fetch open bank transactions + invoices |

---

## Contributing

This is a community project. We use the node for our own customer automations, but it only covers the weclapp API well if people bring their real-world use cases — so contributions of every size are genuinely welcome, and **issues are actively triaged and worked**.

- **Issues** — bug reports, missing endpoints or resources, confusing parameters, docs gaps: [open an issue](https://github.com/Wals-pro/n8n-nodes-weclapp/issues). No template needed; a failing request/response or an exported workflow snippet helps a lot.
- **Pull requests** — from typo fixes to whole new resources. Each resource lives in its own `descriptions/*Description.ts`; copy an existing one as the pattern.
- **First contribution?** Open a draft PR or an issue describing what you want to build — we're happy to point you at the right files and review early.

### Dev setup

```bash
git clone https://github.com/Wals-pro/n8n-nodes-weclapp.git
cd n8n-nodes-weclapp
npm install
npm run dev   # n8n at http://localhost:5678 with hot reload
```

| Script | Description |
|---|---|
| `npm run build` | Compile to `dist/` |
| `npm run lint` | n8n community node linter |
| `npm run test` | vitest unit + integration tests |
| `npm run codegen` | Regenerate entity metadata from `@weclapp/sdk` |

Before submitting a PR: `npm run lint && npm run build && npm run test`.

---

## Related

- **weclapp MCP server** — connect AI assistants (Claude, Cursor, Copilot, …) to weclapp via the Model Context Protocol: [weclapp-mcp.wals.pro](https://weclapp-mcp.wals.pro)

## License

MIT — Copyright (c) 2026 [Wals-pro](https://wals.pro)
