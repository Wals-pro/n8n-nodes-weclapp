# Usage Guide — @wals-pro/n8n-nodes-weclapp

> **Work in progress** — resources are being added incrementally.

## Table of Contents

- [Authentication](#authentication)
- [Resources Overview](#resources-overview)
- [Filters](#filters)
- [Pagination](#pagination)
- [Updating Records](#updating-records)
- [Binary Downloads (PDF / Images)](#binary-downloads-pdf--images)
- [Trigger Node (Webhooks)](#trigger-node-webhooks)
- [Custom API Call](#custom-api-call)
- [Examples](#examples)

---

## Authentication

1. In n8n, go to **Credentials** → **New** → search for `weclapp API`.
2. Enter your **Base URL** — the full API base including version path:
   ```
   https://yourcompany.weclapp.com/webapp/api/v2
   ```
3. Enter your **API Key**. Find it in weclapp under **Settings → User → API key**.
4. Click **Test credential** — the node performs `GET /currency?pageSize=1` to verify connectivity.

The credential injects `AuthenticationToken: <apiKey>` on every request. No OAuth flow is required.

---

## Resources Overview

| Resource | Available Operations |
|---|---|
| **Article** | Get, Get Many, Create, Update, Delete + 7 actions (createDatasheetPdf, createLabelPdf, downloadArticleImage, uploadArticleImage, …) |
| **Party** (Customer / Supplier / Prospect) | Get, Get Many, Create, Update, Delete |
| **Sales Order** | Get, Get Many, Create, Update, Delete + order actions |
| **Purchase Order** | Get, Get Many, Create, Update, Delete + 11 actions |
| **Sales Invoice** | Get, Get Many, Create, Update, Delete + PDF download |
| **Purchase Invoice** | Get, Get Many, Create, Update, Delete + Apply Payment |
| **Quotation** | Get, Get Many, Create, Update, Delete + acceptQuotation + PDF |
| **Shipment** | Get, Get Many, Create, Update, Delete + picking list + PDF |
| **Warehouse / Stock** | Get, Get Many + bookIncoming / bookOutgoing |
| **Bank Transaction** | Get, Get Many |
| **Bank Account** | Get, Get Many |
| **Document** | Get, Get Many, Upload, Download (all versions) |
| **Production Order** | Get, Get Many, Create, Update + PDF |
| **Ticket** | Full CRUD |
| **Comment** | Create, Get Many |
| **Tag** | Get, Get Many, Create, Delete |
| **Unit** | Get, Get Many |
| **User** | Get, Get Many |
| **Custom Attribute Definition** | Get, Get Many |
| **Webhook** | Get, Get Many, Create, Delete |
| **Custom API Call** | Any method / path — full escape hatch |

---

## Filters

All **Get Many** operations expose a **Filters** collection. Add one or more filters to narrow results.

Each filter has three fields:

| Field | Description |
|---|---|
| **Field** | The entity property name to filter on, e.g. `status`, `articleNumber`, `createdDate` |
| **Operator** | One of the 13 valid weclapp filter operators (see below) |
| **Value** | The comparison value. Use a JSON array string for `-in` / `-notin`, e.g. `["NEW","OPEN"]` |

### Valid filter operators

| Operator | Meaning |
|---|---|
| `-eq` | equals |
| `-ne` | not equals |
| `-lt` | less than (strict) |
| `-gt` | greater than (strict) |
| `-le` | less than or equal |
| `-ge` | greater than or equal |
| `-null` | property is null |
| `-notnull` | property is not null |
| `-like` | SQL-style LIKE (`%` wildcard, `_` single char) |
| `-notlike` | negated LIKE |
| `-ilike` | case-insensitive LIKE |
| `-notilike` | case-insensitive negated LIKE |
| `-in` | value in JSON array |
| `-notin` | value not in JSON array |

> **Important:** `-gte` and `-lte` do **not** exist in the weclapp API. weclapp silently ignores unknown suffixes, so using them returns unfiltered results. Always use `-ge` and `-le` instead.

### Example: Filter active articles

```
Field: status   Operator: -eq   Value: ACTIVE
```

### Example: Filter orders created after a date

```
Field: createdDate   Operator: -ge   Value: 1700000000000
```
(weclapp timestamps are milliseconds since epoch)

---

## Pagination

- **Return All** off (the default): one request fetches up to **Limit** records. Limit defaults to `50` and accepts `1`–`1000` (1000 is the weclapp per-page maximum).
- **Return All** on: the node paginates automatically until weclapp returns a short page (up to 100 pages × 1000 records = 100,000 records maximum). The **Limit** field is hidden.
- Page size is 1000 per page while returning all (the weclapp maximum).

---

## Sorting

Every **Get Many** operation has a **Sort** collection. Each rule names an entity property and a direction; rules apply in the order you add them.

Example — newest sales orders first, ties broken by order number:

| Field | Direction |
|---|---|
| `createdDate` | Descending |
| `orderNumber` | Ascending |

This is sent as weclapp's `sort` query parameter (`sort=-createdDate,orderNumber` — `-` prefix means descending). Sorting matters when you use a **Limit**: "the 50 newest orders" needs `createdDate` Descending, otherwise weclapp returns the 50 oldest.

---

## Updating Records

### Updates are version-free

The **Update** operation sends a `PUT` with `ignoreMissingProperties=true`. You do **not** need to fetch the entity's current `version` first, and you do **not** need to send a full body — only the properties you include are changed, and every other field is left untouched. A status-only update works on its own:

```json
{ "status": "DELIVERY_NOTE_PRINTED" }
```

Because the version is not required, you avoid optimistic-lock (`409`) errors from stale versions, and because missing properties are ignored, you never accidentally wipe fields you did not send.

### Guard downstream marker writes on create success

After a **Create** operation, verify success before any downstream step that writes a marker back (e.g. flagging a source row as "synced" in another system). A created record has a non-null `id` and no `error`, so gate the marker step with:

```
{{ $json.id != null && $json.error == null }}
```

For marker workflows, also prefer the node's **Stop On Error** setting (node **Settings → Stop On Error**): if the create fails, the item stops instead of falling through and marking a record as synced that was never created.

---

## Binary Downloads (PDF / Images)

Operations that download binary content (PDFs, article images, document files) return the file as n8n binary data attached to the item:

```json
{
  "binary": {
    "data": {
      "mimeType": "application/pdf",
      "fileName": "salesInvoice-INV-1234.pdf",
      "data": "<base64>"
    }
  }
}
```

Use a **Write Binary File** node or **Send Email** node downstream to save or send the file.

---

## Trigger Node (Webhooks)

The **weclapp Trigger** node enables event-driven workflows.

### Setup

1. Add a **weclapp Trigger** node to your workflow.
2. Select **Entity Type** (e.g. `Sales Order`, `Party`, `Article`).
3. Select one or more **Events** (Created, Updated, Deleted).
4. **Activate** the workflow — the node automatically calls `POST /webhook` on your weclapp tenant to register a subscription pointing to this workflow's webhook URL.
5. On **deactivation**, the subscription is removed via `DELETE /webhook/id/{id}`.

### Payload

weclapp sends a POST to n8n with a JSON body containing the changed entity. The trigger node passes this body as the first item's JSON output.

### Requirements

- Your weclapp tenant must have webhook permissions enabled (Settings → Integrations → Webhooks).
- The n8n instance must be reachable from the weclapp servers (public URL required).

---

## Custom API Call

The **Custom API Call** resource provides a full escape hatch to any of the 130+ weclapp entities not covered by a first-class resource.

| Parameter | Description |
|---|---|
| **Method** | GET, POST, PUT, DELETE |
| **Path** | Relative to the base URL, e.g. `/currency` or `/article/id/{id}/copyArticle` |
| **Query Parameters** | Key-value pairs appended to the URL |
| **Body** | JSON body for POST/PUT requests |
| **Return Binary** | Toggle to receive binary (PDF/image) responses as n8n binary data |

Example — fetch a specific currency:

- Method: `GET`
- Path: `/currency/id/EUR`

---

## Examples

See [`docs/examples/`](examples/) for ready-to-import n8n workflow JSONs:

| File | Demonstrates |
|---|---|
| `article-list.json` | List articles with a status filter |
| `party-create.json` | Create a new customer (party) |
| `sales-order-lifecycle.json` | Fetch a sales order and update its status |
| `webhook-trigger.json` | Receive weclapp webhook events in real time |
| `reconciliation-find.json` | Find reconciliation candidates (bank transactions + invoices) |

Import via **n8n UI → Workflows → Import from File**.
