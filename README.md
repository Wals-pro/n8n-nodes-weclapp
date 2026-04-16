# n8n-nodes-weclapp

[![npm](https://img.shields.io/npm/v/n8n-nodes-weclapp?label=npm)](https://www.npmjs.com/package/n8n-nodes-weclapp)
[![Build](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wals-pro/n8n-nodes-weclapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![n8n community node](https://img.shields.io/badge/n8n-community--node-orange?logo=n8n)](https://www.npmjs.com/package/n8n-nodes-weclapp)

First-class n8n community node for the [weclapp ERP API](https://www.weclapp.com). Replaces a dozen hand-rolled HTTP Request nodes with a single, credential-aware node that handles authentication, pagination, filter validation, RFC 7807 error parsing, and binary (PDF/image) downloads — out of the box.

> **Work in progress — resources are being added incrementally via parallel PRs.**

---

## Installation

### n8n Cloud / n8n desktop

**Settings → Community nodes → Install**, then enter:

```
n8n-nodes-weclapp
```

### Self-hosted n8n (npm)

```bash
npm install n8n-nodes-weclapp
```

Restart n8n after installation.

### Self-hosted n8n (Docker)

```bash
docker exec -u node -it <container-name> \
  npm install -g n8n-nodes-weclapp
```

Then restart the container. For persistent installs, mount a volume at `/home/node/.n8n` and install into it:

```bash
docker exec -u node -it <container-name> \
  n8n-node install n8n-nodes-weclapp
```

---

## Authentication {#auth}

### Generating an API token

1. Log in to your weclapp instance.
2. Open **User Settings** (top-right menu → your name) → **API token**.
3. Click **Generate** (or copy the existing token).

### Configuring the credential in n8n

1. Go to **Credentials → New** → search for **weclapp API**.
2. Enter your **Base URL** in the format `https://<your-subdomain>.weclapp.com/webapp/api/v2`.  
   Replace `<your-subdomain>` with your company's weclapp subdomain.
3. Paste the **API token** from User Settings into the **API Key** field.
4. Click **Test credential** — n8n sends `GET /currency?pageSize=1` and expects a `200 OK` response to confirm the token and base URL are correct.

See [docs/usage.md — Authentication](docs/usage.md#authentication) for details.

---

## Quick Start: List Articles

1. Add a **weclapp** node to your workflow.
2. Set **Resource** → `Article`, **Operation** → `Get Many`.
3. Toggle **Return All** or set a **Limit**.
4. Optionally add a **Filter**: `status -eq ACTIVE`.
5. Connect to a downstream node (e.g. **Spreadsheet File**, **HTTP Request**).

Import the ready-made example: [docs/examples/article-list.json](docs/examples/article-list.json)

---

## Supported Resources

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
| Bank Transaction | Get, Get Many |
| Document | Get, Get Many, Upload, Download |
| Production Order | Get, Get Many, Create, Update + PDF |
| Ticket + Comment | Full CRUD |
| Tag / Unit / User | Get, Get Many |
| Webhook | CRUD |
| **Custom API Call** | Any method / path — escape hatch for all 130+ entities |

---

## Trigger Node

Use **weclapp Trigger** to start workflows on real-time weclapp events:

1. Add **weclapp Trigger** to a workflow.
2. Select **Entity Type** (e.g. `Sales Order`) and **Events** (Created, Updated, Deleted).
3. **Activate** the workflow — the node registers a webhook in weclapp automatically and removes it on deactivation.

Import the example: [docs/examples/webhook-trigger.json](docs/examples/webhook-trigger.json)

---

## Example Workflows

| Example | What it shows |
|---|---|
| [article-list.json](docs/examples/article-list.json) | List articles with a status filter |
| [party-create.json](docs/examples/party-create.json) | Create a new customer |
| [sales-order-lifecycle.json](docs/examples/sales-order-lifecycle.json) | Get and update a sales order |
| [webhook-trigger.json](docs/examples/webhook-trigger.json) | Receive weclapp events in real time |
| [reconciliation-find.json](docs/examples/reconciliation-find.json) | Fetch open bank transactions + invoices |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Start n8n with hot reload |
| `npm run lint` | Lint with n8n community node linter |
| `npm run test` | Run vitest unit + integration tests |
| `npm run codegen` | Regenerate entity metadata from `@weclapp/sdk` |
| `npm run release` | Bump version, tag, push → triggers npm publish |

---

## Contributing

PRs welcome. Each resource lives in its own `descriptions/*Description.ts` file — see existing resources for the pattern.

**Dev setup:**

```bash
git clone https://github.com/Wals-pro/n8n-nodes-weclapp.git
cd n8n-nodes-weclapp
npm install
npm run build
npm run dev   # launches n8n at http://localhost:5678 with hot reload
```

**Before submitting a PR:**

```bash
npm run lint
npm run build
npm run test
```

Open issues for new resources, bugs, or API endpoint gaps: [GitHub Issues](https://github.com/Wals-pro/n8n-nodes-weclapp/issues)

---

## License

MIT — Copyright (c) 2026 Markus Wals
