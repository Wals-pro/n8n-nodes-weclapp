import { describe, it, expect, vi } from 'vitest';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	buildFilterParams,
	parseApiProblem,
	resolveWeclappUrl,
	simplifyEntity,
	weclappApiRequest,
	weclappApiRequestAllItems,
	type WeclappFilterItem,
} from '../../nodes/Weclapp/GenericFunctions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal INode stub so NodeOperationError / NodeApiError are constructible. */
const FAKE_NODE = {
	id: 'test-node',
	name: 'weclapp',
	type: 'n8n-nodes-weclapp.weclapp',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
};

const FAKE_BASE_URL = 'https://testhandel.weclapp.com/webapp/api/v2';

/** Build a WeclappFunctions-like context with a mock HTTP helper. */
function makeContext(responses: Record<string, unknown>[], baseUrl = FAKE_BASE_URL) {
	let callIndex = 0;

	const mockRequest = vi.fn(async () => {
		const res = responses[callIndex] ?? responses[responses.length - 1];
		callIndex++;
		return res;
	});

	return {
		getNode: () => FAKE_NODE,
		getCredentials: vi.fn().mockResolvedValue({ baseUrl }),
		helpers: {
			httpRequestWithAuthentication: {
				call: mockRequest,
			},
		},
		mockRequest,
	};
}

// ---------------------------------------------------------------------------
// resolveWeclappUrl
// ---------------------------------------------------------------------------

describe('resolveWeclappUrl', () => {
	it('prepends baseUrl to a relative path with leading slash', async () => {
		const ctx = makeContext([]);
		const url = await resolveWeclappUrl(ctx as never, '/salesOrder');
		expect(url).toBe('https://testhandel.weclapp.com/webapp/api/v2/salesOrder');
	});

	it('prepends baseUrl and adds leading slash to a path without one', async () => {
		const ctx = makeContext([]);
		const url = await resolveWeclappUrl(ctx as never, 'salesOrder');
		expect(url).toBe('https://testhandel.weclapp.com/webapp/api/v2/salesOrder');
	});

	it('returns an absolute https:// URL unchanged', async () => {
		const ctx = makeContext([]);
		const absolute = 'https://other.weclapp.com/webapp/api/v2/currency';
		const url = await resolveWeclappUrl(ctx as never, absolute);
		expect(url).toBe(absolute);
		// Should not have called getCredentials for an absolute URL.
		expect(ctx.getCredentials).not.toHaveBeenCalled();
	});

	it('returns an absolute http:// URL unchanged', async () => {
		const ctx = makeContext([]);
		const absolute = 'http://localhost:8080/webapp/api/v2/currency';
		const url = await resolveWeclappUrl(ctx as never, absolute);
		expect(url).toBe(absolute);
	});

	it('strips trailing slashes from baseUrl before prepending', async () => {
		const ctx = makeContext([], 'https://testhandel.weclapp.com/webapp/api/v2///');
		const url = await resolveWeclappUrl(ctx as never, '/currency');
		expect(url).toBe('https://testhandel.weclapp.com/webapp/api/v2/currency');
	});
});

// ---------------------------------------------------------------------------
// weclappApiRequest — URL resolution
// ---------------------------------------------------------------------------

describe('weclappApiRequest — baseURL resolution', () => {
	it('passes absolute URL to httpRequestWithAuthentication for a relative path with slash', async () => {
		const ctx = makeContext([{ id: '1' }]);
		await weclappApiRequest.call(ctx as never, 'GET', '/salesOrder');

		const callArgs = ctx.mockRequest.mock.calls[0];
		// callArgs[2] is the options object
		const opts = callArgs[2] as { url: string };
		expect(opts.url).toBe('https://testhandel.weclapp.com/webapp/api/v2/salesOrder');
	});

	it('passes absolute URL when endpoint has no leading slash', async () => {
		const ctx = makeContext([{ id: '1' }]);
		await weclappApiRequest.call(ctx as never, 'GET', 'salesOrder');

		const opts = ctx.mockRequest.mock.calls[0][2] as { url: string };
		expect(opts.url).toBe('https://testhandel.weclapp.com/webapp/api/v2/salesOrder');
	});

	it('passes absolute URL through unchanged when already absolute', async () => {
		const absolute = 'https://other.weclapp.com/webapp/api/v2/currency';
		const ctx = makeContext([{ result: [] }]);
		await weclappApiRequest.call(ctx as never, 'GET', absolute);

		const opts = ctx.mockRequest.mock.calls[0][2] as { url: string };
		expect(opts.url).toBe(absolute);
	});
});

// ---------------------------------------------------------------------------
// buildFilterParams
// ---------------------------------------------------------------------------

describe('buildFilterParams', () => {
	// ---- valid operators produce correct keys ----

	const allValidOps: Array<[string, string, unknown, string | undefined]> = [
		['eq', 'status', 'NEW', 'NEW'],
		['ne', 'status', 'DONE', 'DONE'],
		['lt', 'amount', 100, '100'],
		['gt', 'amount', 50, '50'],
		['le', 'amount', 200, '200'],
		['ge', 'amount', 10, '10'],
		['like', 'name', '%Test%', '%Test%'],
		['notlike', 'name', '%Ignore%', '%Ignore%'],
		['ilike', 'email', '%example%', '%example%'],
		['notilike', 'email', '%spam%', '%spam%'],
		['null', 'endDate', '', undefined],
		['notnull', 'endDate', '', undefined],
		['in', 'status', ['NEW', 'OPEN'], '["NEW","OPEN"]'],
		['notin', 'status', ['DONE', 'CANCELLED'], '["DONE","CANCELLED"]'],
	];

	for (const [op, field, value, expectedValue] of allValidOps) {
		it(`produces key "${field}-${op}" for operator "${op}"`, () => {
			const filter: WeclappFilterItem = { field, operator: op, value };
			const params = buildFilterParams([filter]);

			const key = `${field}-${op}`;
			expect(key in params).toBe(true);

			if (op === 'null' || op === 'notnull') {
				// Value is omitted (empty string stored, but key must be present).
				expect(params[key]).toBe('');
			} else {
				expect(params[key]).toBe(expectedValue);
			}
		});
	}

	// ---- in / notin with array input ----

	it('wraps array value as JSON for "in"', () => {
		const params = buildFilterParams([{ field: 'id', operator: 'in', value: ['a', 'b', 'c'] }]);
		expect(params['id-in']).toBe('["a","b","c"]');
	});

	it('wraps array value as JSON for "notin"', () => {
		const params = buildFilterParams([{ field: 'id', operator: 'notin', value: [1, 2] }]);
		expect(params['id-notin']).toBe('[1,2]');
	});

	it('passes CSV string through unchanged for "in"', () => {
		const params = buildFilterParams([{ field: 'tag', operator: 'in', value: 'a,b,c' }]);
		expect(params['tag-in']).toBe('a,b,c');
	});

	// ---- null / notnull omit value ----

	it('sets empty string value for "null" operator (no value semantics)', () => {
		const params = buildFilterParams([{ field: 'closedDate', operator: 'null', value: 'ignored' }]);
		expect(params['closedDate-null']).toBe('');
	});

	it('sets empty string value for "notnull" operator (no value semantics)', () => {
		const params = buildFilterParams([{ field: 'closedDate', operator: 'notnull', value: '' }]);
		expect(params['closedDate-notnull']).toBe('');
	});

	// ---- leading dash stripped ----

	it('accepts operator with leading dash and strips it', () => {
		const params = buildFilterParams([{ field: 'name', operator: '-eq', value: 'Test' }]);
		expect(params['name-eq']).toBe('Test');
	});

	// ---- gte / lte throw with clear message ----

	it('throws a NodeOperationError for "gte" with message mentioning "use -ge / -le"', () => {
		expect(() =>
			buildFilterParams([{ field: 'amount', operator: 'gte', value: 100 }]),
		).toThrow(NodeOperationError);

		try {
			buildFilterParams([{ field: 'amount', operator: 'gte', value: 100 }]);
		} catch (e) {
			expect((e as NodeOperationError).message).toMatch(/use -ge \/ -le/i);
			expect((e as NodeOperationError).message).toMatch(/-ge/);
		}
	});

	it('throws a NodeOperationError for "lte" with message mentioning "use -ge / -le"', () => {
		expect(() =>
			buildFilterParams([{ field: 'amount', operator: 'lte', value: 50 }]),
		).toThrow(NodeOperationError);

		try {
			buildFilterParams([{ field: 'amount', operator: 'lte', value: 50 }]);
		} catch (e) {
			expect((e as NodeOperationError).message).toMatch(/use -ge \/ -le/i);
			expect((e as NodeOperationError).message).toMatch(/-le/);
		}
	});

	it('throws a NodeOperationError for "gte" with dash prefix', () => {
		expect(() =>
			buildFilterParams([{ field: 'amount', operator: '-gte', value: 100 }]),
		).toThrow(NodeOperationError);
	});

	// ---- unknown operator throws ----

	it('throws for an unknown operator not in the valid list', () => {
		expect(() =>
			buildFilterParams([{ field: 'x', operator: 'between', value: 1 }]),
		).toThrow(NodeOperationError);
	});

	// ---- multiple filters produce multiple keys ----

	it('produces one key per filter entry', () => {
		const filters: WeclappFilterItem[] = [
			{ field: 'status', operator: 'eq', value: 'NEW' },
			{ field: 'amount', operator: 'ge', value: 100 },
		];
		const params = buildFilterParams(filters);
		expect(Object.keys(params)).toHaveLength(2);
		expect(params['status-eq']).toBe('NEW');
		expect(params['amount-ge']).toBe('100');
	});

	it('returns empty object for empty filter array', () => {
		expect(buildFilterParams([])).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// parseApiProblem
// ---------------------------------------------------------------------------

describe('parseApiProblem', () => {
	it('extracts RFC 7807 title + detail into the error message', () => {
		const ctx = makeContext([]);
		const err = {
			body: {
				status: 400,
				title: 'Bad Request',
				detail: 'articleNumber is required',
			},
		};

		expect(() => parseApiProblem(ctx as never, err)).toThrow(NodeApiError);

		try {
			parseApiProblem(ctx as never, err);
		} catch (e) {
			const msg = (e as NodeApiError).message;
			expect(msg).toContain('400');
			expect(msg).toContain('Bad Request');
			expect(msg).toContain('articleNumber is required');
		}
	});

	it('flattens nested validationMessages descriptions joined by "; "', () => {
		const ctx = makeContext([]);
		const err = {
			body: {
				status: 422,
				title: 'Unprocessable Entity',
				items: [
					{
						validationMessages: [
							{ description: 'Field A is invalid' },
							{ description: 'Field B must be a number' },
						],
					},
					{
						validationMessages: [{ description: 'Field C is required' }],
					},
				],
			},
		};

		try {
			parseApiProblem(ctx as never, err);
		} catch (e) {
			const msg = (e as NodeApiError).message;
			expect(msg).toContain('Field A is invalid');
			expect(msg).toContain('Field B must be a number');
			expect(msg).toContain('Field C is required');
			// All three joined by "; "
			expect(msg).toMatch(/Field A is invalid; Field B must be a number; Field C is required/);
		}
	});

	it('prepends rate-limit hint for 429 status', () => {
		const ctx = makeContext([]);
		const err = {
			body: {
				status: 429,
				title: 'Too Many Requests',
				detail: 'Slow down',
			},
		};

		try {
			parseApiProblem(ctx as never, err);
		} catch (e) {
			const msg = (e as NodeApiError).message;
			expect(msg).toMatch(/Rate limited by weclapp — retry after a moment\./);
		}
	});

	it('falls back to raw error message when body is absent', () => {
		const ctx = makeContext([]);
		const err = new Error('Network timeout');

		try {
			parseApiProblem(ctx as never, err);
		} catch (e) {
			expect((e as NodeApiError).message).toContain('Network timeout');
		}
	});

	it('extracts body from err.cause.response.body path', () => {
		const ctx = makeContext([]);
		const err = {
			cause: {
				response: {
					body: {
						status: 404,
						title: 'Not Found',
						detail: 'Article not found',
					},
				},
			},
		};

		try {
			parseApiProblem(ctx as never, err);
		} catch (e) {
			const msg = (e as NodeApiError).message;
			expect(msg).toContain('404');
			expect(msg).toContain('Not Found');
		}
	});

	it('always throws NodeApiError', () => {
		const ctx = makeContext([]);
		expect(() => parseApiProblem(ctx as never, new Error('any'))).toThrow(NodeApiError);
	});
});

// ---------------------------------------------------------------------------
// simplifyEntity
// ---------------------------------------------------------------------------

describe('simplifyEntity', () => {
	it('returns whitelisted fields for "article"', () => {
		const entity = {
			id: '1',
			articleNumber: 'A001',
			name: 'Widget',
			articleType: 'STORABLE_ARTICLE',
			active: true,
			unitId: '42',
			version: '3',
			longDescription: 'Very long text that should be stripped',
			customAttribute1: 'noise',
		};

		const simplified = simplifyEntity(entity, 'article');
		expect(Object.keys(simplified)).toEqual([
			'id',
			'articleNumber',
			'name',
			'articleType',
			'active',
			'unitId',
			'version',
		]);
		expect(simplified.longDescription).toBeUndefined();
	});

	it('returns whitelisted fields for "party"', () => {
		const entity = {
			id: '2',
			partyNumber: 'P001',
			name: 'Acme Corp',
			firstName: 'John',
			lastName: 'Doe',
			partyType: 'ORGANIZATION',
			active: true,
			version: '1',
			taxId: 'DE123456789', // should be stripped
		};

		const simplified = simplifyEntity(entity, 'party');
		expect(simplified.taxId).toBeUndefined();
		expect(simplified.partyType).toBe('ORGANIZATION');
	});

	it('returns whitelisted fields for "salesOrder"', () => {
		const entity = {
			id: '3',
			orderNumber: 'SO001',
			commission: 'Summer sale',
			salesOrderPaymentType: 'INVOICE',
			orderDate: 1700000000000,
			status: 'ORDER_ENTRY_IN_PROGRESS',
			grossAmount: '1234.56',
			version: '2',
			notes: 'Internal note', // should be stripped
		};

		const simplified = simplifyEntity(entity, 'salesOrder');
		expect(simplified.notes).toBeUndefined();
		expect(simplified.orderNumber).toBe('SO001');
	});

	it('passes through unknown resource unchanged', () => {
		const entity = { id: '99', foo: 'bar', baz: 42 };
		const result = simplifyEntity(entity, 'unknownResource');
		expect(result).toEqual(entity);
	});

	it('handles missing fields gracefully (omits rather than setting undefined)', () => {
		// Entity only has `id` and `name`; missing fields should not appear.
		const entity = { id: '1', name: 'Widget' };
		const simplified = simplifyEntity(entity, 'article');
		expect(simplified.id).toBe('1');
		expect(simplified.name).toBe('Widget');
		// Fields not on the entity shouldn't appear as keys.
		expect(Object.prototype.hasOwnProperty.call(simplified, 'unitId')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// weclappApiRequestAllItems — pagination stops when result.length < pageSize
// ---------------------------------------------------------------------------

describe('weclappApiRequestAllItems', () => {
	it('returns all items concatenated across pages', async () => {
		// Page 1: full page (pageSize = 3), page 2: partial (stops).
		const ctx = makeContext([
			{ result: [{ id: '1' }, { id: '2' }, { id: '3' }] },
			{ result: [{ id: '4' }] },
		]);

		const items = await weclappApiRequestAllItems.call(
			ctx as never,
			'GET',
			'/article',
			{},
			3, // pageSize
		);

		expect(items).toHaveLength(4);
		expect(items[0]).toEqual({ id: '1' });
		expect(items[3]).toEqual({ id: '4' });
		// Should have made exactly 2 requests.
		expect(ctx.mockRequest).toHaveBeenCalledTimes(2);
	});

	it('stops after exactly one page when result is smaller than pageSize', async () => {
		const ctx = makeContext([{ result: [{ id: '1' }, { id: '2' }] }]);

		const items = await weclappApiRequestAllItems.call(
			ctx as never,
			'GET',
			'/party',
			{},
			10,
		);

		expect(items).toHaveLength(2);
		expect(ctx.mockRequest).toHaveBeenCalledTimes(1);
	});

	it('respects maxPages cap and stops without fetching beyond it', async () => {
		// Always return a full page (pageSize = 2) — would loop forever without cap.
		const ctx = makeContext([
			{ result: [{ id: '1' }, { id: '2' }] },
			{ result: [{ id: '3' }, { id: '4' }] },
			{ result: [{ id: '5' }, { id: '6' }] },
		]);

		const items = await weclappApiRequestAllItems.call(
			ctx as never,
			'GET',
			'/article',
			{},
			2,
			2, // maxPages = 2
		);

		expect(items).toHaveLength(4);
		expect(ctx.mockRequest).toHaveBeenCalledTimes(2);
	});

	it('returns empty array when first page has no results', async () => {
		const ctx = makeContext([{ result: [] }]);

		const items = await weclappApiRequestAllItems.call(
			ctx as never,
			'GET',
			'/article',
			{},
			100,
		);

		expect(items).toHaveLength(0);
		expect(ctx.mockRequest).toHaveBeenCalledTimes(1);
	});

	it('passes qs parameters to each page request', async () => {
		const ctx = makeContext([{ result: [{ id: '1' }] }]);

		await weclappApiRequestAllItems.call(
			ctx as never,
			'GET',
			'/article',
			{ 'status-eq': 'ACTIVE' },
			10,
		);

		// The first (and only) call should include the qs filter.
		const callArgs = ctx.mockRequest.mock.calls[0];
		// callArgs[2] is the options object passed to httpRequestWithAuthentication.call
		const options = callArgs[2] as { qs: Record<string, unknown> };
		expect(options.qs['status-eq']).toBe('ACTIVE');
		expect(options.qs.page).toBe(1);
		expect(options.qs.pageSize).toBe(10);
	});
});
