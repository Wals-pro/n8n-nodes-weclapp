/**
 * Tests for SharedFields / GenericFunctions routing contract:
 *   #57 — filtersCollection preSend builds correct weclapp query params
 *   #58 — no displayOptions inside collection/fixedCollection children
 *   limit UX — single limitField routes as pageSize; listPaginationRouting gates auto-pagination
 *   B5    — additionalFieldsPreSend sends query projection to the API
 *   merge — mergeAdditionalProperties folds index-aligned response block onto rows
 *   in/notin CSV convenience — buildFilterParams normalises value forms
 */

import { describe, it, expect } from 'vitest';
import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	filtersCollection,
	filtersPreSend,
	additionalFields,
	additionalFieldsPreSend,
	limitField,
	listPaginationRouting,
	paginationConfig,
} from '../../nodes/Weclapp/SharedFields';

import {
	buildFilterParams,
	mergeAdditionalProperties,
} from '../../nodes/Weclapp/GenericFunctions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal IExecuteSingleFunctions-like context for preSend calls.
 * getNodeParameter returns the fixed `filters` value provided.
 */
function makeCtx(filtersValue: {
	filter?: Array<{ field: string; operator: string; value?: string }>;
	rawFilter?: Array<{ expression?: string }>;
}) {
	return {
		getNodeParameter(name: string, fallback?: unknown) {
			if (name === 'filters') return filtersValue;
			return fallback;
		},
	};
}

function baseRequest(overrides: Partial<IHttpRequestOptions> = {}): IHttpRequestOptions {
	return { url: 'https://example.com/weclapp/api', qs: {}, ...overrides };
}

// ---------------------------------------------------------------------------
// #57 — filtersPreSend
// ---------------------------------------------------------------------------

describe('filtersPreSend (#57)', () => {
	it('returns request unchanged when filters.filter is empty', async () => {
		const ctx = makeCtx({ filter: [] });
		const req = baseRequest();
		const result = await filtersPreSend.call(ctx, req);
		expect(result).toBe(req);
	});

	it('returns request unchanged when filters param is empty object', async () => {
		const ctx = makeCtx({});
		const req = baseRequest();
		const result = await filtersPreSend.call(ctx, req);
		expect(result).toBe(req);
	});

	it('adds eq filter as status-eq=SHIPPED query param', async () => {
		const ctx = makeCtx({ filter: [{ field: 'status', operator: 'eq', value: 'SHIPPED' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-eq']).toBe('SHIPPED');
	});

	it('adds ne filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'active', operator: 'ne', value: 'false' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['active-ne']).toBe('false');
	});

	it('adds lt filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'createdDate', operator: 'lt', value: '1700000000000' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['createdDate-lt']).toBe('1700000000000');
	});

	it('adds gt filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'createdDate', operator: 'gt', value: '1600000000000' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['createdDate-gt']).toBe('1600000000000');
	});

	it('adds le filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'amount', operator: 'le', value: '100' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['amount-le']).toBe('100');
	});

	it('adds ge filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'amount', operator: 'ge', value: '50' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['amount-ge']).toBe('50');
	});

	it('adds null filter with empty string value', async () => {
		const ctx = makeCtx({ filter: [{ field: 'customerId', operator: 'null' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['customerId-null']).toBe('');
	});

	it('adds notnull filter with empty string value', async () => {
		const ctx = makeCtx({ filter: [{ field: 'customerId', operator: 'notnull' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['customerId-notnull']).toBe('');
	});

	it('adds like filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'articleNumber', operator: 'like', value: 'ART%' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['articleNumber-like']).toBe('ART%');
	});

	it('adds notlike filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'name', operator: 'notlike', value: 'Test%' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['name-notlike']).toBe('Test%');
	});

	it('adds ilike filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'name', operator: 'ilike', value: '%test%' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['name-ilike']).toBe('%test%');
	});

	it('adds notilike filter', async () => {
		const ctx = makeCtx({ filter: [{ field: 'name', operator: 'notilike', value: '%draft%' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['name-notilike']).toBe('%draft%');
	});

	it('adds in filter with JSON-stringified string value (already a JSON string)', async () => {
		const ctx = makeCtx({
			filter: [{ field: 'status', operator: 'in', value: '["SHIPPED","CANCELLED"]' }],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-in']).toBe('["SHIPPED","CANCELLED"]');
	});

	it('adds notin filter', async () => {
		const ctx = makeCtx({
			filter: [{ field: 'status', operator: 'notin', value: '["DRAFT"]' }],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-notin']).toBe('["DRAFT"]');
	});

	it('merges multiple filters into qs', async () => {
		const ctx = makeCtx({
			filter: [
				{ field: 'status', operator: 'eq', value: 'SHIPPED' },
				{ field: 'partyType', operator: 'eq', value: 'PERSON' },
			],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-eq']).toBe('SHIPPED');
		expect(result.qs?.['partyType-eq']).toBe('PERSON');
	});

	it('preserves existing qs entries when merging filters', async () => {
		const ctx = makeCtx({ filter: [{ field: 'status', operator: 'eq', value: 'SHIPPED' }] });
		const result = await filtersPreSend.call(ctx, baseRequest({ qs: { pageSize: 50 } }));
		expect(result.qs?.['pageSize']).toBe(50);
		expect(result.qs?.['status-eq']).toBe('SHIPPED');
	});

	it('throws on invalid operator "gte" (common typo for ge)', async () => {
		const ctx = makeCtx({ filter: [{ field: 'amount', operator: 'gte', value: '100' }] });
		await expect(filtersPreSend.call(ctx, baseRequest())).rejects.toThrow(/gte/);
	});

	it('throws on invalid operator "lte" (common typo for le)', async () => {
		const ctx = makeCtx({ filter: [{ field: 'amount', operator: 'lte', value: '100' }] });
		await expect(filtersPreSend.call(ctx, baseRequest())).rejects.toThrow(/lte/);
	});

	it('throws on completely unknown operator', async () => {
		const ctx = makeCtx({ filter: [{ field: 'status', operator: 'contains', value: 'foo' }] });
		await expect(filtersPreSend.call(ctx, baseRequest())).rejects.toThrow();
	});

	it('filtersCollection.routing.send.preSend includes filtersPreSend', () => {
		// Confirm the preSend is wired on the top-level filtersCollection property
		const preSends = filtersCollection.routing?.send?.preSend ?? [];
		expect(preSends).toContain(filtersPreSend);
	});
});

// ---------------------------------------------------------------------------
// B3 — rawFilter escape hatch (verbatim weclapp filter= expression)
// ---------------------------------------------------------------------------

describe('rawFilter escape hatch (B3)', () => {
	it('sends the raw expression verbatim as qs.filter', async () => {
		const expr = '((shipped = true) or (fulfillmentProviderId null))';
		const ctx = makeCtx({ rawFilter: [{ expression: expr }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['filter']).toBe(expr);
	});

	it('trims surrounding whitespace from the raw expression', async () => {
		const ctx = makeCtx({ rawFilter: [{ expression: '  status-eq-OPEN  ' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['filter']).toBe('status-eq-OPEN');
	});

	it('uses the first non-empty expression when multiple entries exist', async () => {
		const ctx = makeCtx({
			rawFilter: [{ expression: '  ' }, { expression: 'a or b' }, { expression: 'c' }],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['filter']).toBe('a or b');
	});

	it('does NOT set a filter key when the expression is whitespace-only', async () => {
		const ctx = makeCtx({ rawFilter: [{ expression: '   ' }] });
		const req = baseRequest();
		const result = await filtersPreSend.call(ctx, req);
		expect(result.qs && 'filter' in result.qs).toBe(false);
		// no filters at all → request returned unchanged
		expect(result).toBe(req);
	});

	it('does NOT set a filter key when rawFilter is empty', async () => {
		const ctx = makeCtx({ rawFilter: [] });
		const req = baseRequest();
		const result = await filtersPreSend.call(ctx, req);
		expect(result).toBe(req);
	});

	it('regression guard: field-op filters only → no filter key, still sends field-op params', async () => {
		const ctx = makeCtx({ filter: [{ field: 'status', operator: 'eq', value: 'OPEN' }] });
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-eq']).toBe('OPEN');
		expect(result.qs && 'filter' in result.qs).toBe(false);
	});

	it('both present → field-op params AND raw filter both land in qs', async () => {
		const ctx = makeCtx({
			filter: [{ field: 'status', operator: 'eq', value: 'OPEN' }],
			rawFilter: [{ expression: 'or(a,b)' }],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['status-eq']).toBe('OPEN');
		expect(result.qs?.['filter']).toBe('or(a,b)');
	});
});

// ---------------------------------------------------------------------------
// B9 — credit-note guard (salesInvoiceType ne CREDIT_NOTE)
// ---------------------------------------------------------------------------

describe('B9 credit-note guard', () => {
	it('salesInvoiceType ne CREDIT_NOTE → qs["salesInvoiceType-ne"] === "CREDIT_NOTE"', async () => {
		const ctx = makeCtx({
			filter: [{ field: 'salesInvoiceType', operator: 'ne', value: 'CREDIT_NOTE' }],
		});
		const result = await filtersPreSend.call(ctx, baseRequest());
		expect(result.qs?.['salesInvoiceType-ne']).toBe('CREDIT_NOTE');
	});
});

// ---------------------------------------------------------------------------
// in/notin CSV convenience (buildFilterParams)
// ---------------------------------------------------------------------------

describe('buildFilterParams in/notin CSV convenience', () => {
	it('wraps a CSV string into a JSON array for in', () => {
		const params = buildFilterParams([{ field: 'status', operator: 'in', value: 'A,B' }]);
		expect(params['status-in']).toBe('["A","B"]');
	});

	it('wraps a CSV string into a JSON array for notin', () => {
		const params = buildFilterParams([{ field: 'status', operator: 'notin', value: 'A,B' }]);
		expect(params['status-notin']).toBe('["A","B"]');
	});

	it('passes an existing JSON array literal through unchanged', () => {
		const params = buildFilterParams([{ field: 'status', operator: 'in', value: '["X"]' }]);
		expect(params['status-in']).toBe('["X"]');
	});

	it('JSON.stringifies a real array value', () => {
		const params = buildFilterParams([{ field: 'status', operator: 'in', value: ['X', 'Y'] }]);
		expect(params['status-in']).toBe('["X","Y"]');
	});

	it('trims whitespace around CSV tokens', () => {
		const params = buildFilterParams([{ field: 'status', operator: 'in', value: ' A , B ' }]);
		expect(params['status-in']).toBe('["A","B"]');
	});
});

// ---------------------------------------------------------------------------
// B5 — additionalFieldsPreSend (query projection reaches the API)
// ---------------------------------------------------------------------------

/**
 * Build a context whose getNodeParameter('additionalFields') returns the given
 * projection value. Mirrors makeCtx but for the additionalFields collection.
 */
function makeAddCtx(additionalFieldsValue: {
	properties?: string;
	includeReferencedEntities?: string;
	additionalProperties?: string;
	serializeNulls?: boolean;
}) {
	return {
		getNodeParameter(name: string, fallback?: unknown) {
			if (name === 'additionalFields') return additionalFieldsValue;
			return fallback;
		},
	};
}

describe('additionalFieldsPreSend (B5 projection)', () => {
	it('returns request unchanged when additionalFields is empty', async () => {
		const ctx = makeAddCtx({});
		const req = baseRequest();
		const result = await additionalFieldsPreSend.call(ctx, req);
		expect(result).toBe(req);
	});

	it('sends properties projection as the `properties` query param', async () => {
		const ctx = makeAddCtx({ properties: 'id,shipmentNumber,status' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['properties']).toBe('id,shipmentNumber,status');
	});

	it('preserves colon syntax for referenced-entity projections', async () => {
		const ctx = makeAddCtx({ properties: 'id,salesOrder:id' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['properties']).toBe('id,salesOrder:id');
	});

	it('normalizes stray whitespace in the comma list', async () => {
		const ctx = makeAddCtx({ properties: ' id , salesOrder:id ,  orderNumber ' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['properties']).toBe('id,salesOrder:id,orderNumber');
	});

	it('sends includeReferencedEntities', async () => {
		const ctx = makeAddCtx({ includeReferencedEntities: 'salesOrder,party' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['includeReferencedEntities']).toBe('salesOrder,party');
	});

	it('sends additionalProperties CSV-normalized (colons preserved)', async () => {
		const ctx = makeAddCtx({ additionalProperties: 'availability , salesOrder:id' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['additionalProperties']).toBe('availability,salesOrder:id');
	});

	it('sends serializeNulls=true only when explicitly enabled', async () => {
		const ctx = makeAddCtx({ serializeNulls: true });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs?.['serializeNulls']).toBe(true);
	});

	it('omits serializeNulls when false (weclapp default)', async () => {
		const ctx = makeAddCtx({ serializeNulls: false, properties: 'id' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest());
		expect(result.qs && 'serializeNulls' in result.qs).toBe(false);
		expect(result.qs?.['properties']).toBe('id');
	});

	it('preserves existing qs entries (e.g. pageSize) when merging', async () => {
		const ctx = makeAddCtx({ properties: 'id' });
		const result = await additionalFieldsPreSend.call(ctx, baseRequest({ qs: { pageSize: 1000 } }));
		expect(result.qs?.['pageSize']).toBe(1000);
		expect(result.qs?.['properties']).toBe('id');
	});

	it('additionalFields.routing.send.preSend includes additionalFieldsPreSend', () => {
		const preSends = additionalFields.routing?.send?.preSend ?? [];
		expect(preSends).toContain(additionalFieldsPreSend);
	});
});

// ---------------------------------------------------------------------------
// mergeAdditionalProperties (postReceive)
// ---------------------------------------------------------------------------

function makeResponse(body: unknown): IN8nHttpFullResponse {
	return { body, headers: {}, statusCode: 200 } as IN8nHttpFullResponse;
}

describe('mergeAdditionalProperties (postReceive)', () => {
	const ctx = {} as IExecuteSingleFunctions;

	it('folds index-aligned additionalProperties onto each row', async () => {
		const items: INodeExecutionData[] = [{ json: { id: '1' } }, { json: { id: '2' } }];
		const response = makeResponse({
			result: [{ id: '1' }, { id: '2' }],
			additionalProperties: { availability: [{ stock: 5 }, { stock: 0 }] },
		});

		const merged = await mergeAdditionalProperties.call(ctx, items, response);

		expect((merged[0].json.additionalProperties as any).availability.stock).toBe(5);
		expect((merged[1].json.additionalProperties as any).availability.stock).toBe(0);
		// original id preserved
		expect(merged[0].json.id).toBe('1');
		expect(merged[1].json.id).toBe('2');
	});

	it('is a no-op when the response has no additionalProperties block', async () => {
		const items: INodeExecutionData[] = [{ json: { id: '1' } }, { json: { id: '2' } }];
		const response = makeResponse({ result: [{ id: '1' }, { id: '2' }] });

		const merged = await mergeAdditionalProperties.call(ctx, items, response);

		expect(merged).toBe(items);
		expect('additionalProperties' in merged[0].json).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// #58 — no displayOptions inside collection / fixedCollection children
// ---------------------------------------------------------------------------

describe('no displayOptions in collection/fixedCollection children (#58)', () => {
	/**
	 * Recursively walk a property's options/values arrays and collect any child
	 * field that carries a displayOptions key. Top-level INodeProperties are
	 * allowed to have displayOptions — only children inside collection or
	 * fixedCollection options[] are problematic.
	 */
	function findChildDisplayOptions(
		prop: INodeProperties,
		path: string = prop.name,
	): string[] {
		const violations: string[] = [];

		if (prop.type === 'collection' || prop.type === 'fixedCollection') {
			const optionGroups = prop.options as
				| Array<{ name: string; values?: INodeProperties[]; routing?: unknown } | INodeProperties>
				| undefined;

			if (!optionGroups) return violations;

			for (const group of optionGroups) {
				// fixedCollection: group has .values[]
				const children: INodeProperties[] =
					('values' in group && Array.isArray(group.values)
						? group.values
						: 'options' in group && Array.isArray((group as INodeProperties).options)
							? ((group as INodeProperties).options as INodeProperties[])
							: []);

				for (const child of children) {
					if ('displayOptions' in child && child.displayOptions !== undefined) {
						violations.push(`${path} > ${(group as { name: string }).name} > ${child.name}`);
					}
					// Recurse into nested collections
					if (child.type === 'collection' || child.type === 'fixedCollection') {
						violations.push(...findChildDisplayOptions(child, `${path} > ${child.name}`));
					}
				}
			}
		}

		return violations;
	}

	it('filtersCollection has no child displayOptions', () => {
		const violations = findChildDisplayOptions(filtersCollection);
		expect(violations, `displayOptions found in children: ${violations.join(', ')}`).toHaveLength(0);
	});

	it('additionalFields has no child displayOptions', () => {
		const violations = findChildDisplayOptions(additionalFields);
		expect(violations, `displayOptions found in children: ${violations.join(', ')}`).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// limit UX — single limitField routes as pageSize
// ---------------------------------------------------------------------------

describe('limitField routing', () => {
	it('routes send.type = query', () => {
		expect(limitField.routing?.send?.type).toBe('query');
	});

	it('routes to the pageSize property', () => {
		expect(limitField.routing?.send?.property).toBe('pageSize');
	});

	it('routing value expression falls back to 1000 when limit is 0/empty', () => {
		expect(limitField.routing?.send?.value).toBe('={{ $value > 0 ? $value : 1000 }}');
	});

	it('defaults to 0 (return all)', () => {
		expect(limitField.default).toBe(0);
	});

	it('has minValue 0', () => {
		expect(limitField.typeOptions?.minValue).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// listPaginationRouting — auto-pagination gate
// ---------------------------------------------------------------------------

describe('listPaginationRouting', () => {
	it('operations.pagination is paginationConfig', () => {
		expect(listPaginationRouting.operations?.pagination).toBe(paginationConfig);
	});

	it('paginate runs only when limit is empty/0', () => {
		expect(listPaginationRouting.send?.paginate).toBe('={{ !$parameter.limit }}');
	});
});

// ---------------------------------------------------------------------------
// paginationConfig shape
// ---------------------------------------------------------------------------

describe('paginationConfig', () => {
	it('type is offset', () => {
		expect(paginationConfig.type).toBe('offset');
	});

	it('limitParameter is pageSize', () => {
		expect(paginationConfig.properties.limitParameter).toBe('pageSize');
	});

	it('offsetParameter is page', () => {
		expect(paginationConfig.properties.offsetParameter).toBe('page');
	});

	it('pageSize is 1000', () => {
		expect(paginationConfig.properties.pageSize).toBe(1000);
	});

	it('rootProperty is result', () => {
		expect(paginationConfig.properties.rootProperty).toBe('result');
	});

	it('type is query', () => {
		expect(paginationConfig.properties.type).toBe('query');
	});
});
