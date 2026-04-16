# Usage

> **Work in progress** — resources are being added incrementally. See [GitHub issues](https://github.com/Wals-pro/n8n-nodes-weclapp/issues) for status.

## Authentication

1. In n8n, go to **Credentials** → **New** → search for `weclapp API`.
2. Enter your **Base URL** (e.g. `https://yourcompany.weclapp.com/webapp/api/v2`).
3. Enter your **API Key** (weclapp → Settings → User → API key).
4. Click **Test** to verify connectivity (performs a `GET /currency?pageSize=1`).

## Basic Usage

Drag the **weclapp** node into your workflow. Select a **Resource** and **Operation**.

## Trigger

Use the **weclapp Trigger** node to receive real-time webhook events from weclapp.
It automatically registers a webhook subscription when activated and removes it on deactivation.

## Examples

See `docs/examples/` for sample workflow JSONs (added in unit 22).
