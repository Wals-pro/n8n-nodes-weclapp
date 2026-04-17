/**
 * Status enum correctness tests for SalesInvoice, PurchaseOrder, and SalesOrder.
 * Values are verified against docs/weclapp-openapi.yaml.
 *
 * SalesInvoice → salesInvoiceStatusType enum
 * PurchaseOrder → supplierOrderStatusType enum
 * SalesOrder → orderStatusType enum (no hardcoded dropdown; confirmed via audit)
 */
import { describe, it, expect } from 'vitest';

import { salesInvoiceFields } from '../../nodes/Weclapp/descriptions/SalesInvoiceDescription';
import { purchaseOrderFields } from '../../nodes/Weclapp/descriptions/PurchaseOrderDescription';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusOptions(
	fields: { name: string; options?: Array<{ value: string; name: string }> }[],
	fieldName: string,
): Array<{ value: string; name: string }> {
	const field = fields.find((f) => f.name === fieldName);
	if (!field) throw new Error(`Field "${fieldName}" not found`);
	if (!field.options) throw new Error(`Field "${fieldName}" has no options`);
	return field.options;
}

// ---------------------------------------------------------------------------
// SalesInvoice status — salesInvoiceStatusType
// ---------------------------------------------------------------------------

describe('SalesInvoice status enum', () => {
	const options = getStatusOptions(salesInvoiceFields as never[], 'status');
	const values = options.map((o) => o.value).filter((v) => v !== '');

	it('contains all valid weclapp salesInvoiceStatusType values', () => {
		expect(values).toContain('CANCELLED');
		expect(values).toContain('DOCUMENT_CREATED');
		expect(values).toContain('ENTRY_COMPLETED');
		expect(values).toContain('NEW');
		expect(values).toContain('OPEN_ITEM_CREATED');
	});

	it('does not contain any invalid values', () => {
		// Values that existed before the fix and caused HTTP 400
		expect(values).not.toContain('DEBIT_ADVICE');
		expect(values).not.toContain('DISPUTE');
		expect(values).not.toContain('DUNNING');
		expect(values).not.toContain('OPEN');
		expect(values).not.toContain('PAID');
	});

	it('has exactly 5 non-empty status values', () => {
		expect(values).toHaveLength(5);
	});

	it('options include the (All) catch-all as first entry with empty value', () => {
		expect(options[0]?.name).toBe('(All)');
		expect(options[0]?.value).toBe('');
	});

	it('non-empty options are sorted alphabetically by name', () => {
		const rest = options.slice(1).map((o) => o.name);
		expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
	});
});

// ---------------------------------------------------------------------------
// PurchaseOrder status — supplierOrderStatusType
// ---------------------------------------------------------------------------

describe('PurchaseOrder status enum', () => {
	const options = getStatusOptions(purchaseOrderFields as never[], 'statusFilter');
	const values = options.map((o) => o.value).filter((v) => v !== '');

	it('contains all valid weclapp supplierOrderStatusType values', () => {
		expect(values).toContain('CANCELLED');
		expect(values).toContain('CLOSED');
		expect(values).toContain('CONFIRMED');
		expect(values).toContain('ORDER_DOCUMENTS_PRINTED');
		expect(values).toContain('ORDER_ENTRY_COMPLETED');
		expect(values).toContain('ORDER_ENTRY_IN_PROGRESS');
	});

	it('does not contain any invalid values', () => {
		// Values removed because they do not exist in weclapp
		expect(values).not.toContain('IN_PROCESS');
		expect(values).not.toContain('NEW');
		expect(values).not.toContain('ORDER_CONFIRMATION_PRINTED');
		expect(values).not.toContain('PARTLY_RECEIVED');
		expect(values).not.toContain('RECEIVED');
	});

	it('has exactly 6 non-empty status values', () => {
		expect(values).toHaveLength(6);
	});

	it('options include the (All) catch-all as first entry with empty value', () => {
		expect(options[0]?.name).toBe('(All)');
		expect(options[0]?.value).toBe('');
	});

	it('non-empty options are sorted alphabetically by name', () => {
		const rest = options.slice(1).map((o) => o.name);
		expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
	});
});

// ---------------------------------------------------------------------------
// PurchaseOrder supplierId fix
// ---------------------------------------------------------------------------

describe('PurchaseOrder supplierId fix', () => {
	it('create placeholder uses supplierId, not recipientId', () => {
		const createField = (purchaseOrderFields as Array<{ name: string; placeholder?: string }>).find(
			(f) => f.name === 'purchaseOrderData',
		);
		expect(createField).toBeDefined();
		expect(createField?.placeholder).toContain('supplierId');
		expect(createField?.placeholder).not.toContain('recipientId');
	});

	it('create description uses supplierId, not recipientId', () => {
		const createField = (purchaseOrderFields as Array<{ name: string; description?: string }>).find(
			(f) => f.name === 'purchaseOrderData',
		);
		expect(createField?.description).toContain('supplierId');
		expect(createField?.description).not.toContain('recipientId');
	});

	it('list filter uses supplierId-eq query param', () => {
		const filterField = (
			purchaseOrderFields as Array<{
				name: string;
				routing?: { request?: { qs?: Record<string, string> } };
			}>
		).find((f) => f.name === 'supplierIdFilter');
		expect(filterField).toBeDefined();
		expect(filterField?.routing?.request?.qs?.['supplierId-eq']).toBeDefined();
		// recipientIdFilter field should no longer exist
		const oldField = (purchaseOrderFields as Array<{ name: string }>).find(
			(f) => f.name === 'recipientIdFilter',
		);
		expect(oldField).toBeUndefined();
	});

	it('simplify mapping uses supplierId, not recipientId', () => {
		// The simplify field has postReceive with setKeyValue; check it maps supplierId
		const simplifyField = (
			purchaseOrderFields as Array<{
				name: string;
				routing?: {
					output?: {
						postReceive?: Array<{ properties?: Record<string, string> }>;
					};
				};
			}>
		).find((f) => f.name === 'simplify');
		expect(simplifyField).toBeDefined();
		const props = simplifyField?.routing?.output?.postReceive?.[0]?.properties;
		expect(props).toBeDefined();
		expect(props?.['supplierId']).toBeDefined();
		expect(props?.['recipientId']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// SalesOrder status — audit only (no hardcoded status dropdown)
// ---------------------------------------------------------------------------

describe('SalesOrder status audit', () => {
	it('SalesOrderDescription has no hardcoded status options dropdown', async () => {
		// The SalesOrder description uses a generic filtersCollection, not a hardcoded
		// status dropdown, so there is no risk of wrong enum values being presented.
		// This test imports the fields and confirms no field named "status" with
		// hardcoded options exists.
		const { salesOrderFields } = await import(
			'../../nodes/Weclapp/descriptions/SalesOrderDescription'
		);
		const statusDropdown = (salesOrderFields as Array<{ name: string; options?: unknown }>).find(
			(f) => f.name === 'status' && Array.isArray(f.options),
		);
		expect(statusDropdown).toBeUndefined();
	});
});
