/**
 * Action Body Hygiene — fix for GitHub issue #60
 *
 * weclapp returns HTTP 400 "body is not a json object" when n8n sends
 * Content-Type: application/json with an empty body ({}).  n8n triggers
 * this whenever a routing directive contains a `body` key, even when the
 * value is an empty object.
 *
 * Rule: POST action operations that send no payload MUST NOT have a
 * `routing.request.body` that is an empty plain object `{}`.
 *
 * Exception: arraybuffer (binary) POST operations are exempt because they
 * are handled by a different mechanism (F3 worker) and the `body: {}`
 * there may be intentional while that branch is in progress.
 */

import { describe, it, expect } from 'vitest';
import type { INodeProperties } from 'n8n-workflow';

// ── import all operation descriptors ─────────────────────────────────────────

import { articleDescription } from '../../nodes/Weclapp/descriptions/ArticleDescription';
import { partyDescription } from '../../nodes/Weclapp/descriptions/PartyDescription';
import { productionOrderDescription } from '../../nodes/Weclapp/descriptions/ProductionOrderDescription';
import {
	purchaseInvoiceOperations,
	purchaseInvoiceFields,
} from '../../nodes/Weclapp/descriptions/PurchaseInvoiceDescription';
import {
	purchaseOrderOperations,
	purchaseOrderFields,
} from '../../nodes/Weclapp/descriptions/PurchaseOrderDescription';
import {
	quotationOperations,
	quotationFields,
} from '../../nodes/Weclapp/descriptions/QuotationDescription';
import {
	salesInvoiceOperations,
	salesInvoiceFields,
} from '../../nodes/Weclapp/descriptions/SalesInvoiceDescription';
import { salesOrderDescription } from '../../nodes/Weclapp/descriptions/SalesOrderDescription';
import {
	shipmentOperations,
	shipmentFields,
} from '../../nodes/Weclapp/descriptions/ShipmentDescription';

// ── helper types ──────────────────────────────────────────────────────────────

type RoutedOption = {
	value: string;
	name: string;
	routing?: {
		request?: {
			method?: string;
			body?: unknown;
			encoding?: string;
		};
	};
};

// ── helper: collect all operation options from a descriptor array ──────────────

function collectOperationOptions(descriptor: INodeProperties[]): RoutedOption[] {
	const results: RoutedOption[] = [];
	for (const prop of descriptor) {
		if (prop.type === 'options' && prop.name === 'operation' && Array.isArray(prop.options)) {
			for (const opt of prop.options as RoutedOption[]) {
				results.push(opt);
			}
		}
	}
	return results;
}

// ── helper: is the body an empty plain object? ────────────────────────────────

function isEmptyObject(val: unknown): boolean {
	return (
		val !== null &&
		typeof val === 'object' &&
		!Array.isArray(val) &&
		Object.keys(val as object).length === 0
	);
}

// ── build the full test matrix ────────────────────────────────────────────────

const allDescriptors: { resource: string; descriptor: INodeProperties[] }[] = [
	{ resource: 'article', descriptor: articleDescription },
	{ resource: 'party', descriptor: partyDescription },
	{ resource: 'productionOrder', descriptor: productionOrderDescription },
	{ resource: 'purchaseInvoice', descriptor: [...purchaseInvoiceOperations, ...purchaseInvoiceFields] },
	{ resource: 'purchaseOrder', descriptor: [...purchaseOrderOperations, ...purchaseOrderFields] },
	{ resource: 'quotation', descriptor: [...quotationOperations, ...quotationFields] },
	{ resource: 'salesInvoice', descriptor: [...salesInvoiceOperations, ...salesInvoiceFields] },
	{ resource: 'salesOrder', descriptor: salesOrderDescription },
	{ resource: 'shipment', descriptor: [...shipmentOperations, ...shipmentFields] },
];

// ── the actual tests ──────────────────────────────────────────────────────────

describe('action-body-hygiene: no empty body:{} on JSON POST operations', () => {
	for (const { resource, descriptor } of allDescriptors) {
		describe(`resource: ${resource}`, () => {
			const options = collectOperationOptions(descriptor);

			// Filter to POST operations only
			const postOptions = options.filter(
				(opt) => opt.routing?.request?.method === 'POST',
			);

			if (postOptions.length === 0) {
				it('(no POST operations — nothing to check)', () => {
					expect(true).toBe(true);
				});
				return;
			}

			for (const opt of postOptions) {
				const isArraybuffer = opt.routing?.request?.encoding === 'arraybuffer';

				if (isArraybuffer) {
					// Binary ops are F3's territory — we only assert they're still binary
					it(`${opt.value}: arraybuffer op is exempted from JSON body check`, () => {
						expect(opt.routing?.request?.encoding).toBe('arraybuffer');
					});
				} else {
					it(`${opt.value}: must NOT have body:{} (empty object)`, () => {
						const body = opt.routing?.request?.body;
						expect(
							isEmptyObject(body),
							`Operation "${opt.value}" on resource "${resource}" has body:{} — ` +
							`remove it so weclapp receives no body instead of an empty JSON object`,
						).toBe(false);
					});
				}
			}
		});
	}
});

describe('action-body-hygiene: operations WITH real body values are preserved', () => {
	it('salesOrder calculateSalesPrices has non-empty body fields via field routing', () => {
		// The body for calculateSalesPrices comes from field-level routing, not the operation.
		// The operation itself must NOT have body:{}.
		const ops = collectOperationOptions(salesOrderDescription);
		const calcOp = ops.find((o) => o.value === 'calculateSalesPrices');
		expect(calcOp).toBeDefined();
		// The operation-level routing must have no body key (body comes from field routing)
		expect(calcOp?.routing?.request?.body).toBeUndefined();
	});

	it('salesOrder createDropshipping has no operation-level body (body comes from field routing)', () => {
		const ops = collectOperationOptions(salesOrderDescription);
		const op = ops.find((o) => o.value === 'createDropshipping');
		expect(op).toBeDefined();
		expect(op?.routing?.request?.body).toBeUndefined();
	});
});
