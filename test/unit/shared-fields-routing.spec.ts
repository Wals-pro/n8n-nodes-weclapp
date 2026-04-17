/**
 * Tests for SharedFields routing fixes:
 *   #57 — filtersCollection preSend builds correct weclapp query params
 *   #58 — no displayOptions inside collection/fixedCollection children
 *   #29 — limit routes as pageSize query param
 */

import { describe, it, expect } from 'vitest';
import type { IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import {
	filtersCollection,
	filtersPreSend,
	returnAllOrLimit,
	additionalFields,
	paginationConfig,
} from '../../nodes/Weclapp/SharedFields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal IExecuteSingleFunctions-like context for preSend calls.
 * getNodeParameter returns the fixed `filters` value provided.
 */
function makeCtx(filtersValue: {
	filter?: Array<{ field: string; operator: string; value?: string }>;
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

	it('returnAll (returnAllOrLimit[0]) has no child displayOptions — it is a top-level boolean', () => {
		// returnAll is a boolean, not a collection — no children to check
		expect(returnAllOrLimit[0].type).toBe('boolean');
	});

	it('limit (returnAllOrLimit[1]) displayOptions.show.returnAll is top-level, not in a collection', () => {
		// limit is a top-level INodeProperties — displayOptions here is safe
		// (only displayOptions on children of collection/fixedCollection cause crashes)
		const limitField = returnAllOrLimit[1];
		expect(limitField.type).toBe('number');
		expect(limitField.displayOptions?.show?.['returnAll']).toEqual([false]);
	});
});

// ---------------------------------------------------------------------------
// #29 — limit routes as pageSize query param
// ---------------------------------------------------------------------------

describe('limit routing (#29)', () => {
	it('limit field has routing.send.type = query', () => {
		const limitField = returnAllOrLimit[1];
		expect(limitField.routing?.send?.type).toBe('query');
	});

	it('limit field routes to pageSize property', () => {
		const limitField = returnAllOrLimit[1];
		expect(limitField.routing?.send?.property).toBe('pageSize');
	});

	it('limit field routing value is ={{$value}}', () => {
		const limitField = returnAllOrLimit[1];
		expect(limitField.routing?.send?.value).toBe('={{$value}}');
	});

	it('returnAll field has no routing (pagination handled by paginationConfig on list ops)', () => {
		const returnAllField = returnAllOrLimit[0];
		expect(returnAllField.routing).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// paginationConfig shape
// ---------------------------------------------------------------------------

describe('paginationConfig (#29)', () => {
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
