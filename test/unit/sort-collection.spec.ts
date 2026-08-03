/**
 * sortCollection + sortPreSend — optional multi-field sorting on List ops.
 *
 * weclapp's list endpoints take `sort=prop1,-prop2` (comma-separated property
 * names, `-` prefix = descending). The preSend on the top-level fixedCollection
 * builds that expression; the wiring regression below guarantees every List
 * operation (identified by its Return All toggle) also carries a Sort field.
 */

import { describe, it, expect } from 'vitest';
import type { IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import { sortCollection, sortPreSend } from '../../nodes/Weclapp/SharedFields';
import { resources } from '../../nodes/Weclapp/descriptions/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(sortValue: {
	rule?: Array<{ field?: string; direction?: 'asc' | 'desc' }>;
}) {
	return {
		getNodeParameter(name: string, fallback?: unknown) {
			if (name === 'sort') return sortValue;
			return fallback;
		},
	};
}

function baseRequest(overrides: Partial<IHttpRequestOptions> = {}): IHttpRequestOptions {
	return { url: 'https://example.com/weclapp/api', qs: {}, ...overrides };
}

// ---------------------------------------------------------------------------
// sortPreSend
// ---------------------------------------------------------------------------

describe('sortPreSend', () => {
	it('returns request unchanged when sort.rule is empty', async () => {
		const req = baseRequest();
		const result = await sortPreSend.call(makeCtx({ rule: [] }), req);
		expect(result).toBe(req);
	});

	it('returns request unchanged when sort param is an empty object', async () => {
		const req = baseRequest();
		const result = await sortPreSend.call(makeCtx({}), req);
		expect(result).toBe(req);
	});

	it('sends a single ascending rule as sort=field', async () => {
		const ctx = makeCtx({ rule: [{ field: 'articleNumber', direction: 'asc' }] });
		const result = await sortPreSend.call(ctx, baseRequest());
		expect(result.qs?.sort).toBe('articleNumber');
	});

	it('prefixes descending rules with a minus', async () => {
		const ctx = makeCtx({ rule: [{ field: 'createdDate', direction: 'desc' }] });
		const result = await sortPreSend.call(ctx, baseRequest());
		expect(result.qs?.sort).toBe('-createdDate');
	});

	it('joins multiple rules with commas, preserving user order', async () => {
		const ctx = makeCtx({
			rule: [
				{ field: 'createdDate', direction: 'desc' },
				{ field: 'articleNumber', direction: 'asc' },
			],
		});
		const result = await sortPreSend.call(ctx, baseRequest());
		expect(result.qs?.sort).toBe('-createdDate,articleNumber');
	});

	it('skips blank field names and trims whitespace', async () => {
		const ctx = makeCtx({
			rule: [
				{ field: '  ', direction: 'asc' },
				{ field: ' name ', direction: 'desc' },
			],
		});
		const result = await sortPreSend.call(ctx, baseRequest());
		expect(result.qs?.sort).toBe('-name');
	});

	it('returns request unchanged when every rule is blank', async () => {
		const req = baseRequest();
		const result = await sortPreSend.call(makeCtx({ rule: [{ field: '' }] }), req);
		expect(result).toBe(req);
	});

	it('merges into existing qs without dropping other params', async () => {
		const ctx = makeCtx({ rule: [{ field: 'name', direction: 'asc' }] });
		const result = await sortPreSend.call(ctx, baseRequest({ qs: { pageSize: 50 } }));
		expect(result.qs?.pageSize).toBe(50);
		expect(result.qs?.sort).toBe('name');
	});
});

// ---------------------------------------------------------------------------
// sortCollection shape
// ---------------------------------------------------------------------------

describe('sortCollection', () => {
	it('is a fixedCollection named sort with multipleValues', () => {
		expect(sortCollection.type).toBe('fixedCollection');
		expect(sortCollection.name).toBe('sort');
		expect(sortCollection.typeOptions?.multipleValues).toBe(true);
	});

	it('carries the sortPreSend routing hook', () => {
		expect(sortCollection.routing?.send?.preSend).toContain(sortPreSend);
	});

	it('rule group has a required field and an asc/desc direction', () => {
		const groups = sortCollection.options as Array<{
			name: string;
			values: Array<Record<string, unknown>>;
		}>;
		expect(groups.map((g) => g.name)).toEqual(['rule']);
		const values = groups[0].values;
		const field = values.find((v) => v['name'] === 'field');
		const direction = values.find((v) => v['name'] === 'direction');
		expect(field?.['required']).toBe(true);
		const dirOptions = direction?.['options'] as Array<{ value: string }>;
		expect(dirOptions.map((o) => o.value)).toEqual(['asc', 'desc']);
		expect(direction?.['default']).toBe('asc');
	});
});

// ---------------------------------------------------------------------------
// Wiring regression — every List op carries a Sort field
// ---------------------------------------------------------------------------

type Show = { resource?: string[]; operation?: string[]; [key: string]: unknown };

function showOf(prop: INodeProperties): Show {
	return (prop.displayOptions?.show ?? {}) as Show;
}

describe('sort wiring', () => {
	// Every List op is identified by its Return All toggle (one per list op).
	const listOps = resources
		.filter((p) => p.name === 'returnAll')
		.map((p) => showOf(p))
		.map((show) => ({ resource: show.resource?.[0], operation: show.operation?.[0] }));

	const sortSites = resources.filter((p) => p.name === 'sort').map((p) => showOf(p));

	it('finds the expected number of List operations', () => {
		expect(listOps.length).toBeGreaterThanOrEqual(22);
	});

	it.each(listOps)('resource $resource has a Sort field on $operation', ({ resource, operation }) => {
		const match = sortSites.find(
			(show) => show.resource?.includes(resource!) && show.operation?.includes(operation!),
		);
		expect(match, `no sortCollection wired for ${resource}.${operation}`).toBeTruthy();
	});
});
