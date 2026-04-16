# n8n-nodes-weclapp

[![npm](https://img.shields.io/npm/v/n8n-nodes-weclapp?label=npm)](https://www.npmjs.com/package/n8n-nodes-weclapp)
[![Build](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

World-class n8n community node for the [weclapp ERP API](https://www.weclapp.com). Covers 20+ resources with CRUD, actions, binary (PDF/image) downloads, and a Trigger node for real-time webhook events.

> **Work in progress — resources are being added incrementally. See [GitHub issues](https://github.com/Wals-pro/n8n-nodes-weclapp/issues) for status.**

## Installation

In your n8n instance: **Settings → Community nodes → Install** and enter:

```
n8n-nodes-weclapp
```

Or for self-hosted n8n:

```bash
npm install n8n-nodes-weclapp
```

## Authentication

1. Go to **Credentials → New** → search for `weclapp API`.
2. Enter your **Base URL**: `https://yourcompany.weclapp.com/webapp/api/v2`
3. Enter your **API Key** (weclapp → Settings → User → API key).
4. Click **Test credential** — it performs `GET /currency?pageSize=1` to verify.

## Quick Example: List Articles

1. Add a **weclapp** node.
2. Resource: `Article`, Operation: `Get Many`.
3. Enable `Return All` or set a Limit.
4. Optionally add Filters (e.g. `status -eq ACTIVE`).

## Trigger (Real-time Webhooks)

Use the **weclapp Trigger** node to start workflows on weclapp events:

1. Add **weclapp Trigger** to your workflow.
2. Select an **Entity Type** (e.g. `Sales Order`) and **Events** (Created, Updated, Deleted).
3. Activate the workflow — the node automatically registers a webhook subscription in weclapp and removes it on deactivation.

## Resources

| Resource | Operations |
|---|---|
| Article | Get, Get Many, Create, Update, Delete + 7 actions |
| Party (Customer/Supplier) | Get, Get Many, Create, Update, Delete |
| Sales Order | Get, Get Many, Create, Update, Delete + actions |
| Purchase Order | Get, Get Many, Create, Update, Delete + 11 actions |
| Sales Invoice | Get, Get Many, Create, Update, Delete + PDF |
| Purchase Invoice | Get, Get Many, Create, Update, Delete + Apply Payment |
| Quotation | Get, Get Many, Create, Update, Delete + PDF |
| Shipment | Get, Get Many, Create, Update, Delete + PDF |
| Warehouse / Stock | Get, Get Many + bookIncoming/bookOutgoing |
| Bank Transaction | Get, Get Many |
| Document | Get, Get Many, Upload, Download |
| Production Order | Get, Get Many, Create, Update + PDF |
| Ticket + Comment | Full CRUD |
| Tag / Unit / User | Get, Get Many |
| Webhook | CRUD |
| **Custom API Call** | Any method/path — escape hatch for all 130+ entities |

See [docs/usage.md](docs/usage.md) for detailed documentation.

## Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Start n8n with hot reload |
| `npm run lint` | Lint with n8n node linter |
| `npm run test` | Run vitest unit tests |
| `npm run codegen` | Regenerate entity metadata from `@weclapp/sdk` |
| `npm run release` | Bump version, tag, push → triggers npm publish |

## Contributing

PRs welcome. See [GitHub issues](https://github.com/Wals-pro/n8n-nodes-weclapp/issues) for open units.

## License

MIT — Copyright (c) 2026 Markus Wals
