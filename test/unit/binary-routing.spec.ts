/**
 * Binary routing invariants — issue #65
 *
 * For every binary download / generate operation in every resource descriptor:
 *   1. encoding: 'arraybuffer' is present in the request block
 *   2. output.postReceive contains a handler of type 'binaryData'
 *   3. returnFullResponse: true is set in the request block
 *   4. POST binary ops do NOT have body: {} in the operation routing
 *      (body content is always sent via field-level routing instead)
 */

import { describe, it, expect } from 'vitest';

import { articleDescription } from '../../nodes/Weclapp/descriptions/ArticleDescription';
import { documentDescription } from '../../nodes/Weclapp/descriptions/DocumentDescription';
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
import {
	shipmentOperations,
	shipmentFields,
} from '../../nodes/Weclapp/descriptions/ShipmentDescription';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostReceiveEntry = { type: string; properties?: Record<string, unknown> };

interface OperationRouting {
	request?: {
		method?: string;
		encoding?: string;
		returnFullResponse?: boolean;
		body?: unknown;
		[key: string]: unknown;
	};
	output?: {
		postReceive?: PostReceiveEntry[];
	};
}

interface OperationOption {
	value: string;
	routing?: OperationRouting;
}

interface OperationField {
	type: string;
	options?: OperationOption[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all operation options that have encoding: 'arraybuffer' in their
 * request routing (i.e. declared binary download/generate operations).
 */
function getBinaryOps(descriptors: unknown[]): OperationOption[] {
	const result: OperationOption[] = [];
	for (const field of descriptors as OperationField[]) {
		if (field.type !== 'options' || !field.options) continue;
		for (const op of field.options) {
			if (op.routing?.request?.encoding === 'arraybuffer') {
				result.push(op);
			}
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Per-resource binary operation sets
// ---------------------------------------------------------------------------

const articleBinaryOps = getBinaryOps(articleDescription);
const documentBinaryOps = getBinaryOps(documentDescription);
const partyBinaryOps = getBinaryOps(partyDescription);
const productionOrderBinaryOps = getBinaryOps(productionOrderDescription);
const purchaseInvoiceBinaryOps = getBinaryOps([
	...purchaseInvoiceOperations,
	...purchaseInvoiceFields,
]);
const purchaseOrderBinaryOps = getBinaryOps([
	...purchaseOrderOperations,
	...purchaseOrderFields,
]);
const quotationBinaryOps = getBinaryOps([...quotationOperations, ...quotationFields]);
const salesInvoiceBinaryOps = getBinaryOps([...salesInvoiceOperations, ...salesInvoiceFields]);
const shipmentBinaryOps = getBinaryOps([...shipmentOperations, ...shipmentFields]);

// ---------------------------------------------------------------------------
// Invariant assertion helper
// ---------------------------------------------------------------------------

function assertBinaryOp(op: OperationOption): void {
	const { value, routing } = op;
	const req = routing?.request;
	const output = routing?.output;

	// 1. encoding must be arraybuffer (already confirmed by selection, but be explicit)
	expect(req?.encoding, `${value}: encoding must be 'arraybuffer'`).toBe('arraybuffer');

	// 2. returnFullResponse must be true — needed so postReceive sees headers
	expect(req?.returnFullResponse, `${value}: returnFullResponse must be true`).toBe(true);

	// 3. output.postReceive must contain a binaryData handler
	const postReceive = output?.postReceive ?? [];
	const hasBinaryData = postReceive.some((h) => h.type === 'binaryData');
	expect(hasBinaryData, `${value}: output.postReceive must contain a 'binaryData' handler`).toBe(
		true,
	);

	// 4. POST binary ops must NOT have body: {} in the operation routing
	//    (body content must come from field-level routing instead)
	if (req?.method === 'POST') {
		const hasEmptyBodyShorthand =
			req.body !== undefined &&
			typeof req.body === 'object' &&
			req.body !== null &&
			Object.keys(req.body as object).length === 0;
		expect(
			hasEmptyBodyShorthand,
			`${value}: POST binary op must not have body:{} in operation routing — causes Content-Type corruption`,
		).toBe(false);
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('article binary operations', () => {
	it('has binary ops for createDatasheetPdf, createLabelPdf, downloadArticleImage, downloadMainArticleImage', () => {
		const values = articleBinaryOps.map((o) => o.value);
		expect(values).toContain('createDatasheetPdf');
		expect(values).toContain('createLabelPdf');
		expect(values).toContain('downloadArticleImage');
		expect(values).toContain('downloadMainArticleImage');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of articleBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('document binary operations', () => {
	it('has binary ops for download, downloadDocumentVersion, downloadDocumentVersionsZipped', () => {
		const values = documentBinaryOps.map((o) => o.value);
		expect(values).toContain('download');
		expect(values).toContain('downloadDocumentVersion');
		expect(values).toContain('downloadDocumentVersionsZipped');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of documentBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('party binary operations', () => {
	it('has a binary op for downloadImage', () => {
		const values = partyBinaryOps.map((o) => o.value);
		expect(values).toContain('downloadImage');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of partyBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('productionOrder binary operations', () => {
	it('has binary ops for createPickingList and downloadLatestProductionOrderPdf', () => {
		const values = productionOrderBinaryOps.map((o) => o.value);
		expect(values).toContain('createPickingList');
		expect(values).toContain('downloadLatestProductionOrderPdf');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of productionOrderBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('purchaseInvoice binary operations', () => {
	it('has binary ops for downloadLatestPurchaseInvoiceDocument and printLabel', () => {
		const values = purchaseInvoiceBinaryOps.map((o) => o.value);
		expect(values).toContain('downloadLatestPurchaseInvoiceDocument');
		expect(values).toContain('printLabel');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of purchaseInvoiceBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('purchaseOrder binary operations', () => {
	it('has binary ops for createDropshippingDeliveryNotePdf, downloadLatestPurchaseOrderPdf, printLabel, and cancellation slip PDFs', () => {
		const values = purchaseOrderBinaryOps.map((o) => o.value);
		expect(values).toContain('createDropshippingDeliveryNotePdf');
		expect(values).toContain('downloadLatestPurchaseOrderPdf');
		expect(values).toContain('printLabel');
		expect(values).toContain('downloadLatestCancellationSlipPdf');
		expect(values).toContain('downloadLatestDropshippingDeliveryNotePdf');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of purchaseOrderBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('quotation binary operations', () => {
	it('has binary ops for createQuotationPdf, downloadLatestQuotationPdf, printLabel, printQuotationData', () => {
		const values = quotationBinaryOps.map((o) => o.value);
		expect(values).toContain('createQuotationPdf');
		expect(values).toContain('downloadLatestQuotationPdf');
		expect(values).toContain('printLabel');
		expect(values).toContain('printQuotationData');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of quotationBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('salesInvoice binary operations', () => {
	it('has binary ops for downloadLatestSalesInvoicePdf and printLabel', () => {
		const values = salesInvoiceBinaryOps.map((o) => o.value);
		expect(values).toContain('downloadLatestSalesInvoicePdf');
		expect(values).toContain('printLabel');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of salesInvoiceBinaryOps) {
			assertBinaryOp(op);
		}
	});
});

describe('shipment binary operations', () => {
	it('has binary ops for createPickingList, all download PDFs, and printLabel', () => {
		const values = shipmentBinaryOps.map((o) => o.value);
		expect(values).toContain('createPickingList');
		expect(values).toContain('downloadLatestDeliveryNotePdf');
		expect(values).toContain('downloadLatestPickingListPdf');
		expect(values).toContain('downloadLatestShippingLabelPdf');
		expect(values).toContain('printLabel');
	});

	it('satisfies all binary routing invariants', () => {
		for (const op of shipmentBinaryOps) {
			assertBinaryOp(op);
		}
	});
});
