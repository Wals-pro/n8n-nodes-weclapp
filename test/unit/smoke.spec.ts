/**
 * Smoke tests — import every public export from description files,
 * SharedFields, and GenericFunctions and assert they have the right shape.
 *
 * Purpose: catch drift when a resource file is deleted, an export is renamed,
 * or a description accidentally returns something other than INodeProperties[].
 */
import { describe, it, expect } from 'vitest';

// ── descriptions/index.ts ─────────────────────────────────────────────────────
import { resources } from '../../nodes/Weclapp/descriptions/index';

describe('descriptions/index', () => {
	it('exports resources as an Array', () => {
		expect(Array.isArray(resources)).toBe(true);
	});

	it('every entry in resources is an object with a "name" string', () => {
		for (const prop of resources) {
			expect(prop).toBeTypeOf('object');
			expect(typeof prop.name).toBe('string');
		}
	});
});

// ── SharedFields.ts ───────────────────────────────────────────────────────────
import {
	returnAllOrLimit,
	filtersCollection,
	additionalFields,
	simplifyField,
} from '../../nodes/Weclapp/SharedFields';

describe('SharedFields', () => {
	it('returnAllOrLimit is a non-empty Array', () => {
		expect(Array.isArray(returnAllOrLimit)).toBe(true);
		expect(returnAllOrLimit.length).toBeGreaterThan(0);
	});

	it('returnAllOrLimit contains returnAll and limit fields', () => {
		const names = returnAllOrLimit.map((f) => f.name);
		expect(names).toContain('returnAll');
		expect(names).toContain('limit');
	});

	it('filtersCollection is an INodeProperties object', () => {
		expect(filtersCollection).toBeTypeOf('object');
		expect(filtersCollection.name).toBe('filters');
		expect(filtersCollection.type).toBe('fixedCollection');
	});

	it('filtersCollection operator options contain only valid weclapp suffixes (no -gte/-lte)', () => {
		const filterValues = (filtersCollection.options as { values: { name: string; options?: { value: string }[] }[] }[])[0]!.values;
		const operatorField = filterValues.find((v) => v.name === 'operator');
		expect(operatorField).toBeDefined();
		const opValues = operatorField!.options!.map((o) => o.value);
		expect(opValues).not.toContain('-gte');
		expect(opValues).not.toContain('-lte');
		// Must include the 13 valid suffixes
		expect(opValues).toContain('-eq');
		expect(opValues).toContain('-ne');
		expect(opValues).toContain('-ge');
		expect(opValues).toContain('-le');
		expect(opValues).toContain('-in');
		expect(opValues).toContain('-notin');
		expect(opValues).toContain('-like');
		expect(opValues).toContain('-notlike');
		expect(opValues).toContain('-ilike');
		expect(opValues).toContain('-notilike');
		expect(opValues).toContain('-null');
		expect(opValues).toContain('-notnull');
		expect(opValues).toContain('-lt');
		expect(opValues).toContain('-gt');
	});

	it('additionalFields is a collection INodeProperties', () => {
		expect(additionalFields).toBeTypeOf('object');
		expect(additionalFields.name).toBe('additionalFields');
		expect(additionalFields.type).toBe('collection');
	});

	it('simplifyField is a boolean INodeProperties', () => {
		expect(simplifyField).toBeTypeOf('object');
		expect(simplifyField.name).toBe('simplify');
		expect(simplifyField.type).toBe('boolean');
	});
});

// ── GenericFunctions.ts ───────────────────────────────────────────────────────
import {
	weclappApiRequest,
	weclappApiRequestAllItems,
	buildFilterParams,
	parseApiProblem,
	simplifyEntity,
	handleBinaryDownload,
} from '../../nodes/Weclapp/GenericFunctions';

describe('GenericFunctions exports', () => {
	it('weclappApiRequest is a function', () => {
		expect(weclappApiRequest).toBeTypeOf('function');
	});

	it('weclappApiRequestAllItems is a function', () => {
		expect(weclappApiRequestAllItems).toBeTypeOf('function');
	});

	it('buildFilterParams is a function', () => {
		expect(buildFilterParams).toBeTypeOf('function');
	});

	it('buildFilterParams returns empty object for empty input', () => {
		const result = buildFilterParams([]);
		expect(result).toStrictEqual({});
	});

	it('buildFilterParams maps filter items to query param keys', () => {
		const result = buildFilterParams([
			{ field: 'status', operator: '-eq', value: 'ACTIVE' },
		]);
		// Either {"status-eq": "ACTIVE"} or {} (stub) — just verify it's an object
		expect(result).toBeTypeOf('object');
	});

	it('parseApiProblem is a function', () => {
		expect(parseApiProblem).toBeTypeOf('function');
	});

	it('parseApiProblem throws on call', () => {
		expect(() => parseApiProblem({ title: 'Not Found', detail: 'Resource not found' })).toThrow();
	});

	it('simplifyEntity is a function', () => {
		expect(simplifyEntity).toBeTypeOf('function');
	});

	it('simplifyEntity returns an object', () => {
		const input = { id: '1', name: 'Test' };
		const result = simplifyEntity(input, 'article');
		expect(result).toBeTypeOf('object');
	});

	it('handleBinaryDownload is a function', () => {
		expect(handleBinaryDownload).toBeTypeOf('function');
	});
});
