/**
 * typeVersion gating for the Tag/Unit/User/Custom Attribute Definition ID
 * fields (node v2 UX upgrade, backward compatible).
 *
 * Contract:
 *   - The node declares version [1, 2] with defaultVersion 2.
 *   - Each ID parameter exists twice under the same name: a plain string
 *     gated to '@version' [1] (workflows saved before 1.0.0) and a
 *     resourceLocator gated to '@version' [2] with ID / From List / URL modes.
 *   - Every locator's searchListMethod is registered in the listSearch map.
 */

import { describe, it, expect } from 'vitest';
import type { INodeProperties } from 'n8n-workflow';

import { Weclapp } from '../../nodes/Weclapp/Weclapp.node';
import { resources } from '../../nodes/Weclapp/descriptions/index';
import { listSearch } from '../../nodes/Weclapp/methods/loadOptions';

const VERSIONED_IDS = ['tagId', 'unitId', 'userId', 'customAttributeDefinitionId'];

function variantsOf(name: string): INodeProperties[] {
	return resources.filter((p) => p.name === name);
}

function versionGate(prop: INodeProperties): unknown {
	return (prop.displayOptions?.show as Record<string, unknown>)?.['@version'];
}

describe('node versioning', () => {
	const description = new Weclapp().description;

	it('declares version [1, 2] with defaultVersion 2', () => {
		expect(description.version).toEqual([1, 2]);
		expect(description.defaultVersion).toBe(2);
	});
});

describe.each(VERSIONED_IDS)('versioned ID field %s', (name) => {
	const variants = variantsOf(name);
	const v1 = variants.find((p) => p.type === 'string');
	const locator = variants.find((p) => p.type === 'resourceLocator');

	it('has exactly one string and one resourceLocator variant', () => {
		expect(variants).toHaveLength(2);
		expect(v1).toBeTruthy();
		expect(locator).toBeTruthy();
	});

	it('string variant is gated to typeVersion 1', () => {
		expect(versionGate(v1!)).toEqual([1]);
	});

	it('locator variant is gated to typeVersion 2', () => {
		expect(versionGate(locator!)).toEqual([2]);
	});

	it('variants share resource/operation scoping', () => {
		const show1 = { ...(v1!.displayOptions?.show as object) } as Record<string, unknown>;
		const show2 = { ...(locator!.displayOptions?.show as object) } as Record<string, unknown>;
		delete show1['@version'];
		delete show2['@version'];
		expect(show1).toEqual(show2);
	});

	it('locator offers id, list, and url modes, defaulting to From List', () => {
		expect(locator!.default).toEqual({ mode: 'list', value: '' });
		const modes = (locator!.modes ?? []).map((m) => m.name);
		expect(modes).toEqual(['id', 'list', 'url']);
	});

	it("locator's searchListMethod is registered in listSearch", () => {
		const listMode = (locator!.modes ?? []).find((m) => m.name === 'list');
		const method = listMode?.typeOptions?.searchListMethod as string;
		expect(method).toBeTruthy();
		expect(listSearch[method]).toBeTypeOf('function');
	});
});
