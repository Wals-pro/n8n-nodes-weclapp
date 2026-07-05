import { describe, it, expect } from 'vitest';
import type { INodePropertyOptions } from 'n8n-workflow';
import {
	limitField,
	listPaginationRouting,
	paginationConfig,
	filtersCollection,
	additionalFields,
	ignoreMissingPropertiesField,
	simplifyField,
	type WeclappFilterEntry,
} from '../../nodes/Weclapp/SharedFields';

// ---------------------------------------------------------------------------
// Module-level derivations (static data — computed once at import)
// ---------------------------------------------------------------------------

const filterGroup = (
	filtersCollection.options as Array<{ name: string; values: Array<Record<string, unknown>> }>
)[0];
const operatorField = filterGroup.values.find((v) => v['name'] === 'operator');
const operatorOptions = operatorField?.['options'] as INodePropertyOptions[] | undefined;
const operatorValues = operatorOptions?.map((o) => o.value) ?? [];

// ---------------------------------------------------------------------------
// limitField + listPaginationRouting (single-Limit UX, replaces returnAllOrLimit)
// ---------------------------------------------------------------------------

describe('limitField', () => {
	it('is a single number field named limit defaulting to 0', () => {
		expect(limitField.name).toBe('limit');
		expect(limitField.type).toBe('number');
		expect(limitField.default).toBe(0);
	});

	it('has typeOptions.minValue = 0', () => {
		expect(limitField.typeOptions?.minValue).toBe(0);
	});

	it('routes send.type=query to pageSize with a fallback expression', () => {
		expect(limitField.routing?.send?.type).toBe('query');
		expect(limitField.routing?.send?.property).toBe('pageSize');
		expect(limitField.routing?.send?.value).toBe('={{ $value > 0 ? $value : 1000 }}');
	});
});

describe('listPaginationRouting', () => {
	it('operations.pagination is paginationConfig', () => {
		expect(listPaginationRouting.operations?.pagination).toBe(paginationConfig);
	});

	it('paginate gate is keyed on !$parameter.limit', () => {
		expect(listPaginationRouting.send?.paginate).toBe('={{ !$parameter.limit }}');
	});
});

// ---------------------------------------------------------------------------
// filtersCollection
// ---------------------------------------------------------------------------

describe('filtersCollection', () => {
	it('is a fixedCollection named filters', () => {
		expect(filtersCollection.type).toBe('fixedCollection');
		expect(filtersCollection.name).toBe('filters');
	});

	it('has multipleValues: true', () => {
		expect(filtersCollection.typeOptions?.multipleValues).toBe(true);
	});

	it('placeholder is "Add filter"', () => {
		expect(filtersCollection.placeholder).toBe('Add filter');
	});

	it('has two option groups: filter and rawFilter', () => {
		expect(filtersCollection.options).toHaveLength(2);
		expect(filterGroup.name).toBe('filter');
		const groups = filtersCollection.options as Array<{ name: string }>;
		expect(groups.map((g) => g.name)).toEqual(['filter', 'rawFilter']);
	});

	it('operator field has exactly 14 options', () => {
		expect(operatorOptions).toBeDefined();
		expect(operatorOptions!).toHaveLength(14);
	});

	it('no operator option has value "gte" or "lte" (silent no-op suffixes)', () => {
		expect(operatorValues).not.toContain('gte');
		expect(operatorValues).not.toContain('lte');
		expect(operatorValues).not.toContain('-gte');
		expect(operatorValues).not.toContain('-lte');
	});

	it('contains all 14 expected operator values', () => {
		const expected = [
			'eq', 'ne', 'lt', 'gt', 'le', 'ge',
			'null', 'notnull',
			'like', 'notlike', 'ilike', 'notilike',
			'in', 'notin',
		];
		for (const op of expected) {
			expect(operatorValues, `Missing operator: ${op}`).toContain(op);
		}
	});

	it('default operator is "eq"', () => {
		expect(operatorField?.['default']).toBe('eq');
	});

	it('field entry is required', () => {
		const fieldEntry = filterGroup.values.find((v) => v['name'] === 'field');
		expect(fieldEntry?.['required']).toBe(true);
	});

	it('value field has no displayOptions (#58: collection children with displayOptions crash n8n resolver)', () => {
		const valueField = filterGroup.values.find((v) => v['name'] === 'value');
		// displayOptions was intentionally removed — n8n crashes with "max iterations"
		// when fixedCollection/collection children have displayOptions. See issue #58.
		expect(valueField?.['displayOptions']).toBeUndefined();
	});

	it('all operator options have a non-empty description', () => {
		for (const opt of operatorOptions!) {
			expect(typeof opt.description, `${String(opt.value)} has no description`).toBe('string');
			expect((opt.description as string).length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// additionalFields
// ---------------------------------------------------------------------------

describe('additionalFields', () => {
	it('is a collection named additionalFields', () => {
		expect(additionalFields.type).toBe('collection');
		expect(additionalFields.name).toBe('additionalFields');
	});

	it('has placeholder "Add field"', () => {
		expect(additionalFields.placeholder).toBe('Add field');
	});

	it('has properties, includeReferencedEntities, and serializeNulls options', () => {
		const names = (additionalFields.options as Array<{ name: string }>).map((o) => o.name);
		expect(names).toContain('properties');
		expect(names).toContain('includeReferencedEntities');
		expect(names).toContain('serializeNulls');
	});

	it('serializeNulls defaults to false', () => {
		const serializeNulls = (
			additionalFields.options as Array<{ name: string; default: unknown }>
		).find((o) => o.name === 'serializeNulls');
		expect(serializeNulls?.default).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// ignoreMissingPropertiesField
// ---------------------------------------------------------------------------

describe('ignoreMissingPropertiesField', () => {
	it('is a boolean named ignoreMissingProperties defaulting to true', () => {
		expect(ignoreMissingPropertiesField.type).toBe('boolean');
		expect(ignoreMissingPropertiesField.name).toBe('ignoreMissingProperties');
		expect(ignoreMissingPropertiesField.default).toBe(true);
	});

	it('description mentions ignoreMissingProperties', () => {
		expect(ignoreMissingPropertiesField.description).toContain('ignoreMissingProperties');
	});
});

// ---------------------------------------------------------------------------
// simplifyField
// ---------------------------------------------------------------------------

describe('simplifyField', () => {
	it('is a boolean named simplify defaulting to true', () => {
		expect(simplifyField.type).toBe('boolean');
		expect(simplifyField.name).toBe('simplify');
		expect(simplifyField.default).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// WeclappFilterEntry type (compile-time shape, runtime smoke)
// ---------------------------------------------------------------------------

describe('WeclappFilterEntry type', () => {
	it('accepts field, operator, and optional value', () => {
		const entry: WeclappFilterEntry = { field: 'articleNumber', operator: 'eq', value: 'TEST' };
		expect(entry.field).toBe('articleNumber');
		expect(entry.operator).toBe('eq');
		expect(entry.value).toBe('TEST');
	});

	it('value is optional (absent for null/notnull operators)', () => {
		const entry: WeclappFilterEntry = { field: 'active', operator: 'null' };
		expect(entry.value).toBeUndefined();
	});
});
