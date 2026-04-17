/**
 * Unit tests for TagUnitUserDescription.
 *
 * Covers the fixes from GitHub issue #63:
 *  1. tag.create uses `name: 'tagName'` (not 'name') so n8n routing fires correctly
 *  2. unit.create uses `name: 'unitName'` (not 'name') for the same reason
 *  3. color field removed from tag (not in weclapp OpenAPI schema)
 *  4. customAttributeDefinition.create sends correct body fields:
 *       attributeType (not type), entities (not entityName), label (required)
 *
 * Covers the fixes from GitHub issue #58:
 *  5. No displayOptions on children of collection or fixedCollection parameters
 *     (n8n resolver crashes with "max iterations" if any child has displayOptions)
 */
import { describe, it, expect } from 'vitest';
import type { INodeProperties } from 'n8n-workflow';

import {
	tagFields,
	unitFields,
	userFields,
	customAttributeDefinitionFields,
} from '../../nodes/Weclapp/descriptions/TagUnitUserDescription';

// ── helpers ──────────────────────────────────────────────────────────────────

type FieldWithRouting = INodeProperties & {
	routing?: { send?: { type: string; property: string } };
	options?: Array<{ name: string; value?: unknown; routing?: { send?: { type: string; property: string } } }>;
};

function findField(fields: INodeProperties[], name: string): FieldWithRouting | undefined {
	return fields.find((f) => f.name === name) as FieldWithRouting | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG
// ─────────────────────────────────────────────────────────────────────────────

describe('tagFields — Bug #63 fix: name param conflict', () => {
	it('create Name field uses internal name "tagName" (not "name")', () => {
		const field = findField(tagFields, 'tagName');
		expect(field, 'tagName field must exist').toBeDefined();
		expect(field!.displayName).toBe('Name');
		expect(field!.required).toBe(true);
		expect(field!.displayOptions?.show?.operation).toContain('create');
	});

	it('create Name field routing.send.property is "name" (weclapp body key)', () => {
		const field = findField(tagFields, 'tagName');
		expect(field!.routing?.send?.property).toBe('name');
	});

	it('no field with internal name "name" exists in tagFields (reserved n8n param)', () => {
		const conflict = findField(tagFields, 'name');
		expect(conflict).toBeUndefined();
	});

	it('tagBody collection update option uses internal name "tagName" (not "name")', () => {
		const tagBodyField = findField(tagFields, 'tagBody') as INodeProperties & {
			options: FieldWithRouting[];
		};
		expect(tagBodyField).toBeDefined();
		const nameOpt = tagBodyField.options?.find((o) => o.name === 'tagName');
		expect(nameOpt, 'tagBody update option must have name "tagName"').toBeDefined();
		expect(nameOpt!.routing?.send?.property).toBe('name');
	});

	it('tagBody collection does NOT contain a "color" option (not in weclapp schema)', () => {
		const tagBodyField = findField(tagFields, 'tagBody') as INodeProperties & {
			options: FieldWithRouting[];
		};
		const colorOpt = tagBodyField?.options?.find((o) => o.name === 'color');
		expect(colorOpt).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIT
// ─────────────────────────────────────────────────────────────────────────────

describe('unitFields — Bug #63 fix: name param conflict', () => {
	it('create Name field uses internal name "unitName" (not "name")', () => {
		const field = findField(unitFields, 'unitName');
		expect(field, 'unitName field must exist').toBeDefined();
		expect(field!.displayName).toBe('Name');
		expect(field!.required).toBe(true);
		expect(field!.displayOptions?.show?.operation).toContain('create');
	});

	it('create Name field routing.send.property is "name" (weclapp body key)', () => {
		const field = findField(unitFields, 'unitName');
		expect(field!.routing?.send?.property).toBe('name');
	});

	it('no field with internal name "name" exists in unitFields (reserved n8n param)', () => {
		const conflict = findField(unitFields, 'name');
		expect(conflict).toBeUndefined();
	});

	it('unitBody collection update option uses internal name "unitName" (not "name")', () => {
		const unitBodyField = findField(unitFields, 'unitBody') as INodeProperties & {
			options: FieldWithRouting[];
		};
		expect(unitBodyField).toBeDefined();
		const nameOpt = unitBodyField.options?.find((o) => o.name === 'unitName');
		expect(nameOpt, 'unitBody update option must have name "unitName"').toBeDefined();
		expect(nameOpt!.routing?.send?.property).toBe('name');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ATTRIBUTE DEFINITION — create body shape
// ─────────────────────────────────────────────────────────────────────────────

describe('customAttributeDefinitionFields — Bug #63 fix: create body shape', () => {
	// Required create fields
	const createFields = customAttributeDefinitionFields.filter(
		(f) =>
			f.required === true &&
			f.displayOptions?.show?.operation &&
			(f.displayOptions.show.operation as string[]).includes('create'),
	);

	it('has required "attributeKey" create field routing to body property "attributeKey"', () => {
		const field = findField(customAttributeDefinitionFields, 'attributeKey');
		expect(field).toBeDefined();
		expect(field!.required).toBe(true);
		expect(field!.routing?.send?.property).toBe('attributeKey');
	});

	it('has required "attributeType" create field routing to body property "attributeType"', () => {
		const field = findField(customAttributeDefinitionFields, 'attributeType');
		expect(field).toBeDefined();
		expect(field!.required).toBe(true);
		expect(field!.routing?.send?.property).toBe('attributeType');
	});

	it('attributeType options match weclapp OpenAPI customAttributeType enum (11 values)', () => {
		const field = findField(customAttributeDefinitionFields, 'attributeType') as INodeProperties & {
			options: Array<{ value: string }>;
		};
		const values = field?.options?.map((o) => o.value) ?? [];
		expect(values).toContain('BOOLEAN');
		expect(values).toContain('DATE');
		expect(values).toContain('DECIMAL');
		expect(values).toContain('ENTITY');
		expect(values).toContain('INTEGER');
		expect(values).toContain('LARGE_TEXT');
		expect(values).toContain('LIST');
		expect(values).toContain('MULTISELECT_LIST');
		expect(values).toContain('REFERENCE');
		expect(values).toContain('STRING');
		expect(values).toContain('URL');
		expect(values.length).toBe(11);
	});

	it('has required "entities" create field of type multiOptions routing to body property "entities"', () => {
		const field = findField(customAttributeDefinitionFields, 'entities');
		expect(field).toBeDefined();
		expect(field!.type).toBe('multiOptions');
		expect(field!.required).toBe(true);
		expect(field!.routing?.send?.property).toBe('entities');
		expect(field!.displayOptions?.show?.operation).toContain('create');
	});

	it('entities options include article, ticket, salesOrder (spot-check OpenAPI values)', () => {
		const field = findField(customAttributeDefinitionFields, 'entities') as INodeProperties & {
			options: Array<{ value: string }>;
		};
		const values = field?.options?.map((o) => o.value) ?? [];
		expect(values).toContain('article');
		expect(values).toContain('ticket');
		expect(values).toContain('salesOrder');
		expect(values).toContain('purchaseOrder');
		expect(values).toContain('supplier');
	});

	it('has required "label" create field routing to body property "label"', () => {
		const field = findField(customAttributeDefinitionFields, 'label');
		expect(field).toBeDefined();
		expect(field!.required).toBe(true);
		expect(field!.routing?.send?.property).toBe('label');
		expect(field!.displayOptions?.show?.operation).toContain('create');
	});

	it('no field with internal name "entityName" exists (removed, was wrong body property)', () => {
		const bad = findField(customAttributeDefinitionFields, 'entityName');
		expect(bad).toBeUndefined();
	});

	it('no top-level field with internal name "type" exists (was wrong body property, renamed to attributeType)', () => {
		const bad = findField(customAttributeDefinitionFields, 'type');
		expect(bad).toBeUndefined();
	});

	it('all 4 required create fields are present', () => {
		const names = createFields.map((f) => f.name);
		expect(names).toContain('attributeKey');
		expect(names).toContain('attributeType');
		expect(names).toContain('entities');
		expect(names).toContain('label');
	});

	// Update collection shape
	it('customAttributeDefinitionBody collection update option sends "attributeType" (not "type")', () => {
		const bodyField = findField(
			customAttributeDefinitionFields,
			'customAttributeDefinitionBody',
		) as INodeProperties & { options: FieldWithRouting[] };
		expect(bodyField).toBeDefined();
		const attrTypeOpt = bodyField.options?.find((o) => o.name === 'attributeType');
		expect(attrTypeOpt, 'attributeType update option must exist in collection').toBeDefined();
		expect(attrTypeOpt!.routing?.send?.property).toBe('attributeType');
	});

	it('customAttributeDefinitionBody collection does NOT contain "entityName" or "type" options', () => {
		const bodyField = findField(
			customAttributeDefinitionFields,
			'customAttributeDefinitionBody',
		) as INodeProperties & { options: FieldWithRouting[] };
		const badEntityName = bodyField.options?.find((o) => o.name === 'entityName');
		const badType = bodyField.options?.find((o) => o.name === 'type');
		expect(badEntityName).toBeUndefined();
		expect(badType).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Issue #58 regression: no displayOptions inside collection/fixedCollection children
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk every INodeProperties in the given array. For any field whose type is
 * 'collection' or 'fixedCollection', assert that none of its children (options[]
 * or options[].values[]) has a displayOptions key.
 *
 * n8n's getNodeParameters() cannot resolve dependency order for such children
 * and throws "Could not resolve parameter dependencies. Max iterations reached!"
 * which silently breaks workflow activation.
 */
function assertNoDisplayOptionsInCollectionChildren(
	fields: INodeProperties[],
	context: string,
): void {
	for (const field of fields) {
		if (field.type === 'collection' || field.type === 'fixedCollection') {
			const children: INodeProperties[] = [];

			if (field.type === 'collection' && Array.isArray(field.options)) {
				children.push(...(field.options as INodeProperties[]));
			}

			if (field.type === 'fixedCollection' && Array.isArray(field.options)) {
				for (const group of field.options as Array<{ values?: INodeProperties[] }>) {
					if (Array.isArray(group.values)) {
						children.push(...group.values);
					}
				}
			}

			for (const child of children) {
				if ('displayOptions' in child) {
					throw new Error(
						`[${context}] Field "${field.name}" (${field.type}) has a child "${child.name}" ` +
							`with displayOptions — this crashes n8n's parameter resolver (issue #58).`,
					);
				}
			}
		}
	}
}

describe('Issue #58 regression — no displayOptions inside collection/fixedCollection children', () => {
	it('tagFields: no collection/fixedCollection child has displayOptions', () => {
		expect(() => assertNoDisplayOptionsInCollectionChildren(tagFields, 'tagFields')).not.toThrow();
	});

	it('unitFields: no collection/fixedCollection child has displayOptions', () => {
		expect(() =>
			assertNoDisplayOptionsInCollectionChildren(unitFields, 'unitFields'),
		).not.toThrow();
	});

	it('userFields: no collection/fixedCollection child has displayOptions', () => {
		expect(() =>
			assertNoDisplayOptionsInCollectionChildren(userFields, 'userFields'),
		).not.toThrow();
	});

	it('customAttributeDefinitionFields: no collection/fixedCollection child has displayOptions', () => {
		expect(() =>
			assertNoDisplayOptionsInCollectionChildren(
				customAttributeDefinitionFields,
				'customAttributeDefinitionFields',
			),
		).not.toThrow();
	});
});
