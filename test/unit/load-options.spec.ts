import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

// Mock the GenericFunctions module so we control what the API returns.
// The mock must be declared before importing loadOptions/listSearch.
vi.mock('../../nodes/Weclapp/GenericFunctions', () => ({
	weclappApiRequest: vi.fn(),
	weclappApiRequestAllItems: vi.fn(),
}));

import { loadOptions, listSearch } from '../../nodes/Weclapp/methods/loadOptions';
import { weclappApiRequest, weclappApiRequestAllItems } from '../../nodes/Weclapp/GenericFunctions';

// Helper: build a minimal ILoadOptionsFunctions mock context.
function makeCtx(): ILoadOptionsFunctions {
	return {} as ILoadOptionsFunctions;
}

const mockApiRequest = vi.mocked(weclappApiRequest);
const mockApiRequestAllItems = vi.mocked(weclappApiRequestAllItems);

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listSearch tests
// ---------------------------------------------------------------------------

describe('listSearch.searchArticles', () => {
	it('requests correct endpoint and properties without filter', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [
				{ id: 'a1', articleNumber: 'ART-001', name: 'Widget' },
				{ id: 'a2', articleNumber: 'ART-002', name: 'Gadget' },
			],
		});

		const ctx = makeCtx();
		const result = await listSearch.searchArticles.call(ctx);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'GET',
			'/article',
			undefined,
			expect.objectContaining({
				properties: 'id,articleNumber,name',
				pageSize: 50,
				page: 1,
			}),
		);
		// No ilike filter when filter is undefined
		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['articleNumber-ilike']).toBeUndefined();

		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toEqual({ name: 'ART-001 — Widget', value: 'a1' });
		expect(result.results[1]).toEqual({ name: 'ART-002 — Gadget', value: 'a2' });
	});

	it('sends ilike filter when filter string provided', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [] });

		const ctx = makeCtx();
		await listSearch.searchArticles.call(ctx, 'bolt');

		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['articleNumber-ilike']).toBe('%bolt%');
	});

	it('encodes pagination token when result count equals page size', async () => {
		// Return exactly 50 items → there may be a next page
		mockApiRequest.mockResolvedValueOnce({
			result: Array.from({ length: 50 }, (_, i) => ({
				id: `id-${i}`,
				articleNumber: `ART-${i}`,
				name: `Item ${i}`,
			})),
		});

		const ctx = makeCtx();
		const result = await listSearch.searchArticles.call(ctx);

		expect(result.paginationToken).toBe('2');
	});

	it('returns undefined paginationToken when result count is below page size', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'x', articleNumber: 'A', name: 'B' }] });

		const ctx = makeCtx();
		const result = await listSearch.searchArticles.call(ctx);

		expect(result.paginationToken).toBeUndefined();
	});

	it('uses decoded paginationToken as page number', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [] });

		const ctx = makeCtx();
		await listSearch.searchArticles.call(ctx, undefined, '3');

		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['page']).toBe(3);
	});
});

describe('listSearch.searchParties', () => {
	it('requests correct endpoint and properties', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [{ id: 'p1', partyNumber: 'P-100', name: 'ACME GmbH', firstName: null, lastName: null }],
		});

		const ctx = makeCtx();
		const result = await listSearch.searchParties.call(ctx);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'GET',
			'/party',
			undefined,
			expect.objectContaining({
				properties: 'id,partyNumber,name,firstName,lastName',
			}),
		);
		expect(result.results[0]).toMatchObject({ value: 'p1' });
	});

	it('applies name-ilike filter', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [] });
		const ctx = makeCtx();
		await listSearch.searchParties.call(ctx, 'gmbh');

		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['name-ilike']).toBe('%gmbh%');
	});

	it('builds label from firstName + lastName when name is absent', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [
				{ id: 'p2', partyNumber: 'P-200', name: null, firstName: 'Hans', lastName: 'Müller' },
			],
		});
		const ctx = makeCtx();
		const result = await listSearch.searchParties.call(ctx);
		expect(result.results[0].name).toBe('P-200 — Hans Müller');
	});
});

describe('listSearch.searchSalesOrders', () => {
	it('uses orderNumber-ilike filter and correct endpoint', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [{ id: 'so1', orderNumber: 'SO-001', commission: 'Sommer 2025' }],
		});
		const ctx = makeCtx();
		const result = await listSearch.searchSalesOrders.call(ctx, 'SO');

		expect(mockApiRequest).toHaveBeenCalledWith('GET', '/salesOrder', undefined, expect.objectContaining({ 'orderNumber-ilike': '%SO%' }));
		expect(result.results[0]).toMatchObject({ name: 'SO-001 — Sommer 2025', value: 'so1' });
	});
});

describe('listSearch.searchPurchaseOrders', () => {
	it('hits /purchaseOrder and returns orderNumber as name', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'po1', orderNumber: 'PO-001' }] });
		const ctx = makeCtx();
		const result = await listSearch.searchPurchaseOrders.call(ctx);
		expect(mockApiRequest).toHaveBeenCalledWith('GET', '/purchaseOrder', undefined, expect.any(Object));
		expect(result.results[0]).toMatchObject({ name: 'PO-001', value: 'po1' });
	});
});

describe('listSearch.searchSalesInvoices', () => {
	it('hits /salesInvoice with invoiceNumber-ilike', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'si1', invoiceNumber: 'RE-001' }] });
		const ctx = makeCtx();
		await listSearch.searchSalesInvoices.call(ctx, 'RE');
		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['invoiceNumber-ilike']).toBe('%RE%');
		expect(mockApiRequest.mock.calls[0][1]).toBe('/salesInvoice');
	});
});

describe('listSearch.searchPurchaseInvoices', () => {
	it('hits /purchaseInvoice', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'pi1', invoiceNumber: 'ER-001' }] });
		const ctx = makeCtx();
		const result = await listSearch.searchPurchaseInvoices.call(ctx);
		expect(mockApiRequest.mock.calls[0][1]).toBe('/purchaseInvoice');
		expect(result.results[0].value).toBe('pi1');
	});
});

describe('listSearch.searchQuotations', () => {
	it('hits /quotation with quotationNumber-ilike', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'q1', quotationNumber: 'AN-001' }] });
		const ctx = makeCtx();
		await listSearch.searchQuotations.call(ctx, 'AN');
		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['quotationNumber-ilike']).toBe('%AN%');
	});
});

describe('listSearch.searchArticleCategories', () => {
	it('hits /articleCategory with name-ilike', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'c1', name: 'Electronics' }] });
		const ctx = makeCtx();
		await listSearch.searchArticleCategories.call(ctx, 'Elec');
		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['name-ilike']).toBe('%Elec%');
		expect(mockApiRequest.mock.calls[0][1]).toBe('/articleCategory');
	});
});

// ---------------------------------------------------------------------------
// loadOptions tests
// ---------------------------------------------------------------------------

describe('loadOptions.getWarehouses', () => {
	it('uses weclappApiRequestAllItems and maps name/value', async () => {
		mockApiRequestAllItems.mockResolvedValueOnce([
			{ id: 'w1', name: 'Main Warehouse' },
			{ id: 'w2', name: 'Secondary Warehouse' },
		]);

		const ctx = makeCtx();
		const result = await loadOptions.getWarehouses.call(ctx);

		expect(mockApiRequestAllItems).toHaveBeenCalledWith('GET', '/warehouse');
		expect(result).toEqual([
			{ name: 'Main Warehouse', value: 'w1' },
			{ name: 'Secondary Warehouse', value: 'w2' },
		]);
	});
});

describe('loadOptions.getCurrencies', () => {
	it('hits /currency with pageSize 1000 and maps name/value', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [
				{ id: 'c1', name: 'EUR' },
				{ id: 'c2', name: 'USD' },
			],
		});

		const ctx = makeCtx();
		const result = await loadOptions.getCurrencies.call(ctx);

		expect(mockApiRequest).toHaveBeenCalledWith('GET', '/currency', undefined, { pageSize: 1000 });
		expect(result).toEqual([
			{ name: 'EUR', value: 'c1' },
			{ name: 'USD', value: 'c2' },
		]);
	});
});

describe('loadOptions.getPaymentMethods', () => {
	it('hits /paymentMethod', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'pm1', name: 'Bank Transfer' }] });
		const ctx = makeCtx();
		const result = await loadOptions.getPaymentMethods.call(ctx);
		expect(mockApiRequest.mock.calls[0][1]).toBe('/paymentMethod');
		expect(result[0]).toEqual({ name: 'Bank Transfer', value: 'pm1' });
	});
});

describe('loadOptions.getTermsOfPayment', () => {
	it('hits /termOfPayment', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'tp1', name: '30 days net' }] });
		const ctx = makeCtx();
		const result = await loadOptions.getTermsOfPayment.call(ctx);
		expect(mockApiRequest.mock.calls[0][1]).toBe('/termOfPayment');
		expect(result[0]).toEqual({ name: '30 days net', value: 'tp1' });
	});
});

describe('loadOptions.getTags', () => {
	it('hits /tag with pageSize 1000', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 't1', name: 'VIP' }] });
		const ctx = makeCtx();
		const result = await loadOptions.getTags.call(ctx);
		expect(mockApiRequest.mock.calls[0][1]).toBe('/tag');
		expect(result[0]).toEqual({ name: 'VIP', value: 't1' });
	});
});

describe('loadOptions.getUsers', () => {
	it('hits /user with active-eq=true filter', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [
				{ id: 'u1', firstName: 'Max', lastName: 'Mustermann', username: 'max' },
			],
		});

		const ctx = makeCtx();
		const result = await loadOptions.getUsers.call(ctx);

		const qs = mockApiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs['active-eq']).toBe('true');
		expect(mockApiRequest.mock.calls[0][1]).toBe('/user');
		expect(result[0]).toEqual({ name: 'Max Mustermann', value: 'u1' });
	});

	it('falls back to username when firstName/lastName absent', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [{ id: 'u2', firstName: null, lastName: null, username: 'admin' }],
		});
		const ctx = makeCtx();
		const result = await loadOptions.getUsers.call(ctx);
		expect(result[0].name).toBe('admin');
	});
});

describe('loadOptions.getUnits', () => {
	it('hits /unit with pageSize 1000', async () => {
		mockApiRequest.mockResolvedValueOnce({ result: [{ id: 'un1', name: 'Stück' }] });
		const ctx = makeCtx();
		const result = await loadOptions.getUnits.call(ctx);
		expect(mockApiRequest.mock.calls[0][1]).toBe('/unit');
		expect(result[0]).toEqual({ name: 'Stück', value: 'un1' });
	});
});

describe('loadOptions.getTicketStatuses', () => {
	it('hits /ticketStatus with pageSize 1000 and maps name/value', async () => {
		mockApiRequest.mockResolvedValueOnce({
			result: [
				{ id: 'ts1', name: 'Open' },
				{ id: 'ts2', name: 'In Progress' },
				{ id: 'ts3', name: 'Closed' },
			],
		});

		const ctx = makeCtx();
		const result = await loadOptions.getTicketStatuses.call(ctx);

		expect(mockApiRequest).toHaveBeenCalledWith('GET', '/ticketStatus', undefined, { pageSize: 1000 });
		expect(result).toEqual([
			{ name: 'Open', value: 'ts1' },
			{ name: 'In Progress', value: 'ts2' },
			{ name: 'Closed', value: 'ts3' },
		]);
	});
});
