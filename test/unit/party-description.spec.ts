import { describe, it, expect } from 'vitest';

import {
	PARTY_TYPE_OPTIONS,
	PARTY_BODY_OPTIONS,
	partyDescription,
} from '../../nodes/Weclapp/descriptions/PartyDescription';

// ---------------------------------------------------------------------------
// Bug #61 regression tests for PartyDescription
// ---------------------------------------------------------------------------

describe('PARTY_TYPE_OPTIONS', () => {
	it('contains ORGANIZATION and PERSON', () => {
		const values = PARTY_TYPE_OPTIONS.map((o) => o.value);
		expect(values).toContain('ORGANIZATION');
		expect(values).toContain('PERSON');
	});

	it('does not contain the rejected weclapp v2 values', () => {
		const values = PARTY_TYPE_OPTIONS.map((o) => o.value);
		expect(values).not.toContain('CUSTOMER');
		expect(values).not.toContain('SUPPLIER');
		expect(values).not.toContain('PROSPECT');
	});

	it('has exactly two options', () => {
		expect(PARTY_TYPE_OPTIONS).toHaveLength(2);
	});
});

describe('PARTY_BODY_OPTIONS', () => {
	it('contains a field that sends "company" to the request body', () => {
		const companyField = PARTY_BODY_OPTIONS.find(
			(f) => f.routing?.send?.property === 'company',
		);
		expect(companyField).toBeDefined();
		expect(companyField?.name).toBe('company');
	});

	it('does not contain a field that sends "name" to the request body', () => {
		const nameField = PARTY_BODY_OPTIONS.find(
			(f) => f.routing?.send?.property === 'name',
		);
		expect(nameField).toBeUndefined();
	});

	it('contains customer boolean field', () => {
		const field = PARTY_BODY_OPTIONS.find((f) => f.name === 'customer');
		expect(field).toBeDefined();
		expect(field?.type).toBe('boolean');
		expect(field?.routing?.send?.property).toBe('customer');
	});

	it('contains supplier boolean field', () => {
		const field = PARTY_BODY_OPTIONS.find((f) => f.name === 'supplier');
		expect(field).toBeDefined();
		expect(field?.type).toBe('boolean');
		expect(field?.routing?.send?.property).toBe('supplier');
	});

	it('contains prospect boolean field', () => {
		const field = PARTY_BODY_OPTIONS.find((f) => f.name === 'prospect');
		expect(field).toBeDefined();
		expect(field?.type).toBe('boolean');
		expect(field?.routing?.send?.property).toBe('prospect');
	});

	it('partyType default is ORGANIZATION', () => {
		const field = PARTY_BODY_OPTIONS.find((f) => f.name === 'partyType');
		expect(field).toBeDefined();
		expect(field?.default).toBe('ORGANIZATION');
	});
});

describe('partyTypeFilterField', () => {
	it('filter field options include ORGANIZATION and PERSON but not CUSTOMER', () => {
		const filterField = partyDescription.find((f) => f.name === 'partyTypeFilter');
		expect(filterField).toBeDefined();
		const values = (filterField?.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain('ORGANIZATION');
		expect(values).toContain('PERSON');
		expect(values).toContain('ANY');
		expect(values).not.toContain('CUSTOMER');
	});
});

describe('list operation postReceive', () => {
	it('does not use type:"filter" postReceive on any field (broken simplify removed)', () => {
		// Walk all properties in partyDescription and check routing.output.postReceive
		// for any type:'filter' entry — the bug that caused 0 items returned.
		const allPostReceives = partyDescription.flatMap((field) => {
			const fieldLevel = field.routing?.output?.postReceive ?? [];
			// Also check inside operation options (e.g., list operation)
			const opLevel = (field.options as Array<{ routing?: { output?: { postReceive?: unknown[] } } }> ?? [])
				.flatMap((op) => op.routing?.output?.postReceive ?? []);
			return [...fieldLevel, ...opLevel];
		});

		const filterReceives = allPostReceives.filter(
			(pr): pr is { type: string } => typeof pr === 'object' && pr !== null && (pr as { type: string }).type === 'filter',
		);

		expect(filterReceives).toHaveLength(0);
	});

	it('simplify field has no routing.output defined', () => {
		const simplifyF = partyDescription.find((f) => f.name === 'simplify');
		expect(simplifyF).toBeDefined();
		// No postReceive routing — the broken filter has been removed
		expect(simplifyF?.routing).toBeUndefined();
	});
});
