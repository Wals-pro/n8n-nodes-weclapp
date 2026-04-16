import { describe, it, expect } from 'vitest';
import type { INodePropertyOptions } from 'n8n-workflow';
import {
	returnAllOrLimit,
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
// returnAllOrLimit
// ---------------------------------------------------------------------------

describe('returnAllOrLimit', () => {
	it('has exactly 2 entries', () => {
		expect(returnAllOrLimit).toHaveLength(2);
	});

	it('first entry is returnAll boolean defaulting to false', () => {
		const field = returnAllOrLimit[0];
		expect(field.name).toBe('returnAll');
		expect(field.type).toBe('boolean');
		expect(field.default).toBe(false);
	});

	it('second entry is limit number defaulting to 50', () => {
		const field = returnAllOrLimit[1];
		expect(field.name).toBe('limit');
		expect(field.type).toBe('number');
		expect(field.default).toBe(50);
	});

	it('limit has typeOptions.minValue = 1', () => {
		const field = returnAllOrLimit[1];
		expect(field.typeOptions?.minValue).toBe(1);
	});

	it('limit displayOptions.show.returnAll equals [false]', () => {
		const field = returnAllOrLimit[1];
		expect(field.displayOptions?.show?.['returnAll']).toEqual([false]);
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

	it('has exactly one option group named filter', () => {
		expect(filtersCollection.options).toHaveLength(1);
		expect(filterGroup.name).toBe('filter');
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

	it('value field is hidden when operator is null or notnull', () => {
		const valueField = filterGroup.values.find((v) => v['name'] === 'value');
		expect(
			(valueField?.['displayOptions'] as Record<string, unknown> | undefined)?.[
				'hide'
			] as Record<string, unknown>,
		).toEqual({ operator: ['null', 'notnull'] });
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
