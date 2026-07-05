import { describe, it, expect } from 'vitest';
import type { IHttpRequestOptions, ResourceMapperField } from 'n8n-workflow';

import {
	attributeDefinitionToResourceField,
	buildWeclappCustomAttributes,
	toWeclappEpochMs,
	type WeclappAttributeDefinition,
} from '../../nodes/Weclapp/methods/customAttributes';
import { customAttributesPreSend } from '../../nodes/Weclapp/SharedFields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function def(overrides: Partial<WeclappAttributeDefinition>): WeclappAttributeDefinition {
	return {
		id: '100',
		attributeType: 'STRING',
		label: 'Attr',
		entities: ['party'],
		...overrides,
	};
}

/** Schema field lookup by field id, for the reverse mapper. */
function field(id: string, type: ResourceMapperField['type']): ResourceMapperField {
	return { id, displayName: id, defaultMatch: false, required: false, display: true, type };
}

// ---------------------------------------------------------------------------
// attributeDefinitionToResourceField — type mapping (definition → field)
// ---------------------------------------------------------------------------

describe('attributeDefinitionToResourceField', () => {
	it('maps DATE → dateTime', () => {
		const f = attributeDefinitionToResourceField(def({ id: '1', attributeType: 'DATE' }));
		expect(f.type).toBe('dateTime');
		expect(f.id).toBe('customAttribute1');
	});

	it('maps DECIMAL / INTEGER / ENTITY → number', () => {
		for (const t of ['DECIMAL', 'INTEGER', 'ENTITY']) {
			const f = attributeDefinitionToResourceField(def({ id: '2', attributeType: t }));
			expect(f.type, `for ${t}`).toBe('number');
		}
	});

	it('maps BOOLEAN → boolean', () => {
		const f = attributeDefinitionToResourceField(def({ id: '3', attributeType: 'BOOLEAN' }));
		expect(f.type).toBe('boolean');
	});

	it('maps LIST → options with selectableValues', () => {
		const f = attributeDefinitionToResourceField(
			def({
				id: '4',
				attributeType: 'LIST',
				selectableValues: [
					{ id: 'v1', value: 'Red' },
					{ id: 'v2', value: 'Green' },
				],
			}),
		);
		expect(f.type).toBe('options');
		expect(f.options).toEqual([
			{ name: 'Red', value: 'v1' },
			{ name: 'Green', value: 'v2' },
		]);
	});

	it('maps MULTISELECT_LIST → string with |multiselect id suffix', () => {
		const f = attributeDefinitionToResourceField(def({ id: '5', attributeType: 'MULTISELECT_LIST' }));
		expect(f.type).toBe('string');
		expect(f.id).toBe('customAttribute5|multiselect');
	});

	it('maps unknown / STRING → string', () => {
		expect(attributeDefinitionToResourceField(def({ id: '6', attributeType: 'STRING' })).type).toBe('string');
		expect(attributeDefinitionToResourceField(def({ id: '7', attributeType: 'URL' })).type).toBe('string');
	});

	it('labels with group name when present', () => {
		const f = attributeDefinitionToResourceField(def({ id: '8', label: 'Colour', groupName: 'Design' }));
		expect(f.displayName).toBe('Colour (Design)');
	});
});

// ---------------------------------------------------------------------------
// buildWeclappCustomAttributes — reverse mapping (field value → weclapp array)
// ---------------------------------------------------------------------------

describe('buildWeclappCustomAttributes', () => {
	it('returns [] when value is null', () => {
		expect(buildWeclappCustomAttributes({ value: null, schema: [] })).toEqual([]);
	});

	it('maps number → numberValue (as string)', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute10: 42 },
			schema: [field('customAttribute10', 'number')],
		});
		expect(out).toEqual([{ attributeDefinitionId: '10', numberValue: '42' }]);
	});

	it('maps boolean → booleanValue', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute11: true },
			schema: [field('customAttribute11', 'boolean')],
		});
		expect(out).toEqual([{ attributeDefinitionId: '11', booleanValue: true }]);
	});

	it('maps options → selectedValueId', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute12: 'v7' },
			schema: [field('customAttribute12', 'options')],
		});
		expect(out).toEqual([{ attributeDefinitionId: '12', selectedValueId: 'v7' }]);
	});

	it('maps plain string → stringValue', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute13: 'hello' },
			schema: [field('customAttribute13', 'string')],
		});
		expect(out).toEqual([{ attributeDefinitionId: '13', stringValue: 'hello' }]);
	});

	it('maps dateTime → dateValue (Berlin epoch-ms)', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute14: '2026-07-01' },
			schema: [field('customAttribute14', 'dateTime')],
		});
		expect(out).toHaveLength(1);
		expect(out[0].attributeDefinitionId).toBe('14');
		// 2026-07-01 Berlin midnight (CEST +02:00) = 2026-06-30T22:00:00Z
		expect(out[0].dateValue).toBe(Date.UTC(2026, 5, 30, 22, 0, 0));
	});

	it('skips null / undefined / empty-string values', () => {
		const out = buildWeclappCustomAttributes({
			value: { customAttribute15: null, customAttribute16: '', customAttribute17: 'keep' },
			schema: [
				field('customAttribute15', 'string'),
				field('customAttribute16', 'string'),
				field('customAttribute17', 'string'),
			],
		});
		expect(out).toEqual([{ attributeDefinitionId: '17', stringValue: 'keep' }]);
	});

	// --- |multiselect round-trip ------------------------------------------------

	it('maps |multiselect string → selectedValues array (round-trip with the field mapper)', () => {
		// Forward: definition → field id carries the |multiselect tag.
		const rf = attributeDefinitionToResourceField(def({ id: '20', attributeType: 'MULTISELECT_LIST' }));
		expect(rf.id).toBe('customAttribute20|multiselect');

		// Reverse: a comma-separated string on that field id → selectedValues[{id}].
		const out = buildWeclappCustomAttributes({
			value: { [rf.id]: 'a, b ,c' },
			schema: [rf],
		});
		expect(out).toEqual([
			{
				attributeDefinitionId: '20',
				selectedValues: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
			},
		]);
	});
});

// ---------------------------------------------------------------------------
// toWeclappEpochMs — Berlin wall-clock, DST-correct
// ---------------------------------------------------------------------------

describe('toWeclappEpochMs', () => {
	it('passes numbers through unchanged', () => {
		expect(toWeclappEpochMs(1_700_000_000_000)).toBe(1_700_000_000_000);
	});

	it('converts a pure summer date to Berlin midnight (+02:00 CEST)', () => {
		// 2026-07-01 00:00 Berlin = 2026-06-30T22:00:00Z
		expect(toWeclappEpochMs('2026-07-01')).toBe(Date.UTC(2026, 5, 30, 22, 0, 0));
	});

	it('converts a pure winter date to Berlin midnight (+01:00 CET)', () => {
		// 2026-01-01 00:00 Berlin = 2025-12-31T23:00:00Z
		expect(toWeclappEpochMs('2026-01-01')).toBe(Date.UTC(2025, 11, 31, 23, 0, 0));
	});

	it('applies the correct DST offset: summer date is +02:00, winter date is +01:00', () => {
		const summer = toWeclappEpochMs('2026-07-01'); // CEST +2
		const winter = toWeclappEpochMs('2026-01-01'); // CET +1

		// Reconstruct the UTC hour each Berlin-midnight lands on.
		const summerUtcHour = new Date(summer).getUTCHours();
		const winterUtcHour = new Date(winter).getUTCHours();
		expect(summerUtcHour).toBe(22); // 24 - 2
		expect(winterUtcHour).toBe(23); // 24 - 1
		// And they must differ by exactly the one-hour DST shift.
		expect(winterUtcHour - summerUtcHour).toBe(1);
	});

	it('converts a naive summer datetime to the Berlin wall-clock instant', () => {
		// 2026-07-01T09:30 Berlin (+02:00) = 2026-07-01T07:30:00Z
		expect(toWeclappEpochMs('2026-07-01T09:30')).toBe(Date.UTC(2026, 6, 1, 7, 30, 0));
	});

	it('treats an explicit-zone datetime as an absolute instant (no Berlin reinterpretation)', () => {
		expect(toWeclappEpochMs('2026-07-01T00:00:00Z')).toBe(Date.UTC(2026, 6, 1, 0, 0, 0));
	});

	it('does NOT use naive UTC (would be one day too early for a pure date)', () => {
		const naiveUtcMidnight = Date.UTC(2026, 6, 1, 0, 0, 0);
		// The Berlin value is 2 hours earlier than UTC midnight in summer.
		expect(toWeclappEpochMs('2026-07-01')).toBeLessThan(naiveUtcMidnight);
		expect(naiveUtcMidnight - (toWeclappEpochMs('2026-07-01') as number)).toBe(2 * 3_600_000);
	});
});

// ---------------------------------------------------------------------------
// customAttributesPreSend — body merge
// ---------------------------------------------------------------------------

function ctxWith(rmv: unknown) {
	return {
		getNodeParameter(name: string, fallback?: unknown) {
			return name === 'customAttributes' ? rmv : fallback;
		},
	};
}

function baseRequest(overrides: Partial<IHttpRequestOptions> = {}): IHttpRequestOptions {
	return { url: '/party', method: 'POST', ...overrides };
}

describe('customAttributesPreSend', () => {
	it('merges built attributes into requestOptions.body without clobbering other keys', async () => {
		const ctx = ctxWith({
			value: { customAttribute30: 'x' },
			schema: [field('customAttribute30', 'string')],
		});
		const req = baseRequest({ body: { name: 'Acme' } });

		const result = await customAttributesPreSend.call(ctx, req);
		expect(result.body).toEqual({
			name: 'Acme',
			customAttributes: [{ attributeDefinitionId: '30', stringValue: 'x' }],
		});
	});

	it('leaves the request untouched when the resourceMapper is empty', async () => {
		const ctx = ctxWith({ value: null, schema: [] });
		const req = baseRequest({ body: { name: 'Acme' } });

		const result = await customAttributesPreSend.call(ctx, req);
		expect(result.body).toEqual({ name: 'Acme' });
	});

	it('leaves the request untouched when the parameter is absent', async () => {
		const ctx = ctxWith(undefined);
		const req = baseRequest({ body: { name: 'Acme' } });

		const result = await customAttributesPreSend.call(ctx, req);
		expect(result).toEqual(req);
	});

	it('adds attributes on a fresh object base when body is a JSON string (empty-JSON-body ops)', async () => {
		const ctx = ctxWith({
			value: { customAttribute31: 'y' },
			schema: [field('customAttribute31', 'string')],
		});
		const req = baseRequest({ body: '{}' });

		const result = await customAttributesPreSend.call(ctx, req);
		// String body stays a string; attributes land on a fresh object base.
		expect(result.body).toEqual({
			customAttributes: [{ attributeDefinitionId: '31', stringValue: 'y' }],
		});
	});
});
