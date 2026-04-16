import { describe, it, expect } from 'vitest';

import {
	salesInvoiceFields,
	salesInvoiceOperations,
} from '../../nodes/Weclapp/descriptions/SalesInvoiceDescription';

// ---------------------------------------------------------------------------
// Sanity tests for SalesInvoiceDescription
// ---------------------------------------------------------------------------

describe('salesInvoiceOperations', () => {
	it('exports a non-empty array', () => {
		expect(salesInvoiceOperations).toBeInstanceOf(Array);
		expect(salesInvoiceOperations.length).toBeGreaterThan(0);
	});

	it('defines the operation field with displayName "Operation"', () => {
		const opField = salesInvoiceOperations[0];
		expect(opField.displayName).toBe('Operation');
		expect(opField.name).toBe('operation');
		expect(opField.type).toBe('options');
	});

	it('includes all expected operations', () => {
		const opField = salesInvoiceOperations[0];
		const values = (opField.options as Array<{ value: string }>).map((o) => o.value);

		// CRUD
		expect(values).toContain('create');
		expect(values).toContain('get');
		expect(values).toContain('list');
		expect(values).toContain('update');
		expect(values).toContain('delete');

		// Actions from OpenAPI
		expect(values).toContain('addSalesOrders');
		expect(values).toContain('calculateSalesPrices');
		expect(values).toContain('createCreditNote');
		expect(values).toContain('createCreditNoteOpenItem');
		expect(values).toContain('downloadLatestSalesInvoicePdf');
		expect(values).toContain('printLabel');
		expect(values).toContain('recalculateCosts');
		expect(values).toContain('resetTaxes');
		expect(values).toContain('setCostsForItemsWithoutCost');
		expect(values).toContain('updatePrices');
	});

	it('has exactly 15 operations (5 CRUD + 10 actions)', () => {
		const opField = salesInvoiceOperations[0];
		expect((opField.options as unknown[]).length).toBe(15);
	});

	it('options are sorted alphabetically by name', () => {
		const opField = salesInvoiceOperations[0];
		const names = (opField.options as Array<{ name: string }>).map((o) => o.name);
		const sorted = [...names].sort((a, b) => a.localeCompare(b));
		expect(names).toEqual(sorted);
	});

	it('sets default operation to "list"', () => {
		expect(salesInvoiceOperations[0].default).toBe('list');
	});

	it('scopes operations to salesInvoice resource', () => {
		const opField = salesInvoiceOperations[0];
		expect(opField.displayOptions?.show?.resource).toContain('salesInvoice');
	});
});

describe('salesInvoiceFields', () => {
	it('exports a non-empty array', () => {
		expect(salesInvoiceFields).toBeInstanceOf(Array);
		expect(salesInvoiceFields.length).toBeGreaterThan(0);
	});

	it('includes salesInvoiceId field', () => {
		const idField = salesInvoiceFields.find((f) => f.name === 'salesInvoiceId');
		expect(idField).toBeDefined();
		expect(idField?.required).toBe(true);
		expect(idField?.type).toBe('string');
	});

	it('salesInvoiceId is shown for all non-list operations', () => {
		const idField = salesInvoiceFields.find((f) => f.name === 'salesInvoiceId');
		const ops = idField?.displayOptions?.show?.operation as string[];
		expect(ops).toBeDefined();
		// Should not include list or create
		expect(ops).not.toContain('list');
		expect(ops).not.toContain('create');
		// Should include get, update, delete and all actions
		expect(ops).toContain('get');
		expect(ops).toContain('update');
		expect(ops).toContain('delete');
		expect(ops).toContain('addSalesOrders');
		expect(ops).toContain('downloadLatestSalesInvoicePdf');
		expect(ops).toContain('printLabel');
	});

	it('includes all 6 filterable fields for list operation', () => {
		const listFields = salesInvoiceFields.filter(
			(f) => f.displayOptions?.show?.operation?.includes('list') && f.name !== 'salesInvoiceId',
		);
		const names = listFields.map((f) => f.name);
		expect(names).toContain('invoiceNumber');
		expect(names).toContain('status');
		expect(names).toContain('customerId');
		expect(names).toContain('invoiceDateFrom');
		expect(names).toContain('recordCurrencyId');
		expect(names).toContain('dueDateFrom');
	});

	it('status field has options sorted alphabetically', () => {
		const statusField = salesInvoiceFields.find((f) => f.name === 'status');
		expect(statusField).toBeDefined();
		const opts = statusField?.options as Array<{ name: string }>;
		const names = opts.map((o) => o.name);
		// First option is the catch-all "(All)", rest should be alphabetical
		expect(names[0]).toBe('(All)');
		const rest = names.slice(1);
		const sorted = [...rest].sort((a, b) => a.localeCompare(b));
		expect(rest).toEqual(sorted);
	});

	it('create operation has required customerId and invoiceDate fields', () => {
		const customerField = salesInvoiceFields.find(
			(f) =>
				f.name === 'customerId' && f.displayOptions?.show?.operation?.includes('create'),
		);
		const dateField = salesInvoiceFields.find(
			(f) =>
				f.name === 'invoiceDate' && f.displayOptions?.show?.operation?.includes('create'),
		);
		expect(customerField?.required).toBe(true);
		expect(dateField?.required).toBe(true);
	});

	it('update operation has updateBody JSON field', () => {
		const updateField = salesInvoiceFields.find((f) => f.name === 'updateBody');
		expect(updateField).toBeDefined();
		expect(updateField?.type).toBe('json');
		expect(updateField?.displayOptions?.show?.operation).toContain('update');
	});

	it('calculateSalesPrices action has required calculationMode and percentage fields', () => {
		const modeField = salesInvoiceFields.find((f) => f.name === 'calculationMode');
		const pctField = salesInvoiceFields.find((f) => f.name === 'percentage');
		expect(modeField?.required).toBe(true);
		expect(pctField?.required).toBe(true);
		expect(modeField?.displayOptions?.show?.operation).toContain('calculateSalesPrices');
	});

	it('printLabel action has required itemLabelQuantityPrintSetting field', () => {
		const field = salesInvoiceFields.find((f) => f.name === 'itemLabelQuantityPrintSetting');
		expect(field?.required).toBe(true);
		expect(field?.displayOptions?.show?.operation).toContain('printLabel');
	});

	it('setCostsForItemsWithoutCost action has required costUpdateMode field', () => {
		const field = salesInvoiceFields.find((f) => f.name === 'costUpdateMode');
		expect(field?.required).toBe(true);
		expect(field?.displayOptions?.show?.operation).toContain('setCostsForItemsWithoutCost');
	});

	it('addSalesOrders action has required salesOrderIds field', () => {
		const field = salesInvoiceFields.find((f) => f.name === 'salesOrderIds');
		expect(field?.required).toBe(true);
		expect(field?.displayOptions?.show?.operation).toContain('addSalesOrders');
	});
});

describe('routing configuration', () => {
	it('list operation routes to GET /salesInvoice', () => {
		const ops = salesInvoiceOperations[0].options as Array<{
			value: string;
			routing: { request: { method: string; url: string } };
		}>;
		const listOp = ops.find((o) => o.value === 'list');
		expect(listOp?.routing.request.method).toBe('GET');
		expect(listOp?.routing.request.url).toBe('/salesInvoice');
	});

	it('delete operation routes to DELETE with id in URL', () => {
		const ops = salesInvoiceOperations[0].options as Array<{
			value: string;
			routing: { request: { method: string; url: string } };
		}>;
		const deleteOp = ops.find((o) => o.value === 'delete');
		expect(deleteOp?.routing.request.method).toBe('DELETE');
		expect(deleteOp?.routing.request.url).toContain('salesInvoiceId');
	});

	it('update operation uses PUT with ignoreMissingProperties=true', () => {
		const ops = salesInvoiceOperations[0].options as Array<{
			value: string;
			routing: { request: { method: string; qs?: { ignoreMissingProperties?: boolean } } };
		}>;
		const updateOp = ops.find((o) => o.value === 'update');
		expect(updateOp?.routing.request.method).toBe('PUT');
		expect(updateOp?.routing.request.qs?.ignoreMissingProperties).toBe(true);
	});

	it('downloadLatestSalesInvoicePdf uses GET with arraybuffer encoding', () => {
		const ops = salesInvoiceOperations[0].options as Array<{
			value: string;
			routing: { request: { method: string; encoding?: string } };
		}>;
		const pdfOp = ops.find((o) => o.value === 'downloadLatestSalesInvoicePdf');
		expect(pdfOp?.routing.request.method).toBe('GET');
		expect(pdfOp?.routing.request.encoding).toBe('arraybuffer');
	});

	it('printLabel uses POST with arraybuffer encoding', () => {
		const ops = salesInvoiceOperations[0].options as Array<{
			value: string;
			routing: { request: { method: string; encoding?: string } };
		}>;
		const labelOp = ops.find((o) => o.value === 'printLabel');
		expect(labelOp?.routing.request.method).toBe('POST');
		expect(labelOp?.routing.request.encoding).toBe('arraybuffer');
	});
});
