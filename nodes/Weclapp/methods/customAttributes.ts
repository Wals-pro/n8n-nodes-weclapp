import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
	ResourceMapperValue,
} from 'n8n-workflow';

import { weclappApiRequest } from '../GenericFunctions';

// ---------------------------------------------------------------------------
// weclapp customAttributeDefinition shape (subset we consume)
// ---------------------------------------------------------------------------

/** A single selectable value of a LIST / MULTISELECT_LIST attribute definition. */
export interface WeclappSelectableValue {
	id: string;
	value: string;
}

/** The subset of GET /customAttributeDefinition we rely on. */
export interface WeclappAttributeDefinition {
	id: string;
	attributeKey?: string;
	name?: string;
	label?: string;
	groupName?: string;
	attributeType: string;
	entities?: string[];
	attributeEntityType?: string;
	selectableValues?: WeclappSelectableValue[];
}

/** weclapp customAttributes[] entry (POST/PUT body form). */
export interface WeclappCustomAttribute {
	attributeDefinitionId: string;
	dateValue?: number;
	numberValue?: string;
	booleanValue?: boolean;
	selectedValueId?: string;
	selectedValues?: Array<{ id: string }>;
	stringValue?: string;
}

// ---------------------------------------------------------------------------
// Date handling — Berlin-local epoch-ms (DST-correct, no external deps)
// ---------------------------------------------------------------------------

/**
 * Convert an ISO date / datetime string to the epoch-ms of that wall-clock time
 * in Europe/Berlin. weclapp stores date fields as epoch-milliseconds that encode
 * Berlin LOCAL wall-clock, NOT UTC — a naive `new Date(v).getTime()` shifts pure
 * dates one day backward (and is off by the DST offset for datetimes).
 *
 * Strategy:
 *  - A pure date `YYYY-MM-DD` → epoch of Berlin midnight for that day.
 *  - A datetime `YYYY-MM-DDTHH:mm[:ss]` (no explicit zone) → epoch of that
 *    Berlin wall-clock instant.
 *  - A datetime carrying an explicit offset/Z → parsed as an absolute instant
 *    (`Date.parse`), because the caller already pinned the zone.
 *  - Anything unparseable → `NaN` (caller skips it).
 *
 * The Berlin offset for the specific day is resolved via Intl (using noon UTC of
 * that day to avoid the DST-changeover edge), so summer (+02:00 CEST) and winter
 * (+01:00 CET) are both correct without any hardcoded offset.
 */
export function toWeclappEpochMs(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value !== 'string') {
		return NaN;
	}
	const raw = value.trim();
	if (raw === '') {
		return NaN;
	}

	// Explicit zone (Z or ±HH:mm) → absolute instant, no Berlin reinterpretation.
	if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
		return Date.parse(raw);
	}

	const match = raw.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/,
	);
	if (!match) {
		// Fall back to a permissive parse; may still be NaN.
		return Date.parse(raw);
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = match[4] !== undefined ? Number(match[4]) : 0;
	const minute = match[5] !== undefined ? Number(match[5]) : 0;
	const second = match[6] !== undefined ? Number(match[6]) : 0;

	const offsetHours = berlinOffsetHoursForDay(year, month, day);
	// Wall-clock in Berlin → UTC epoch: subtract the Berlin offset.
	return Date.UTC(year, month - 1, day, hour, minute, second) - offsetHours * 3_600_000;
}

/**
 * Resolve the Europe/Berlin UTC offset (in hours, e.g. 1 or 2) that applies at
 * noon of the given calendar day. Noon avoids the ambiguous DST-changeover hours.
 */
function berlinOffsetHoursForDay(year: number, month: number, day: number): number {
	const noonUtc = Date.UTC(year, month - 1, day, 12);
	const tzPart = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Europe/Berlin',
		timeZoneName: 'shortOffset',
	})
		.formatToParts(noonUtc)
		.find((p) => p.type === 'timeZoneName')?.value; // e.g. "GMT+2"
	if (!tzPart) {
		return 0;
	}
	const parsed = Number(tzPart.replace(/GMT|UTC/, ''));
	return Number.isFinite(parsed) ? parsed : 0;
}

// ---------------------------------------------------------------------------
// Pure mappers (definition → resourceMapper field)
// ---------------------------------------------------------------------------

/** Human-readable label for a definition, prefixed with its group when present. */
function buildLabel(attr: WeclappAttributeDefinition): string {
	const base = attr.label ?? attr.name ?? attr.attributeKey ?? String(attr.id);
	return attr.groupName ? `${base} (${attr.groupName})` : base;
}

function buildOptions(attr: WeclappAttributeDefinition): INodePropertyOptions[] {
	return (attr.selectableValues ?? []).map((v) => ({ name: v.value, value: v.id }));
}

/**
 * The `|multiselect` suffix trick (ported from the Altruan dist): the n8n
 * `FieldType` union has no `multiOptions`, so a MULTISELECT_LIST is exposed as a
 * `string` field (comma-separated selectedValue IDs) and tagged in the field id
 * so the reverse-mapper can serialise it as `selectedValues`. Users never see the id.
 */
const MULTISELECT_SUFFIX = '|multiselect';

/**
 * Convert a weclapp customAttributeDefinition into an n8n ResourceMapperField.
 *
 * Type map:
 *   DATE                          → dateTime
 *   DECIMAL / INTEGER / ENTITY    → number
 *   BOOLEAN                       → boolean
 *   LIST                          → options (from selectableValues)
 *   MULTISELECT_LIST              → string, id suffixed with '|multiselect'
 *   else (STRING/LARGE_TEXT/URL…) → string
 */
export function attributeDefinitionToResourceField(
	attr: WeclappAttributeDefinition,
): ResourceMapperField {
	const isMultiselect = attr.attributeType === 'MULTISELECT_LIST';
	const id = isMultiselect
		? `customAttribute${attr.id}${MULTISELECT_SUFFIX}`
		: `customAttribute${attr.id}`;

	const base: ResourceMapperField = {
		id,
		displayName: buildLabel(attr),
		defaultMatch: false,
		required: false,
		display: true,
		type: 'string',
	};

	switch (attr.attributeType) {
		case 'DATE':
			return { ...base, type: 'dateTime' };
		case 'DECIMAL':
		case 'INTEGER':
		case 'ENTITY':
			return { ...base, type: 'number' };
		case 'BOOLEAN':
			return { ...base, type: 'boolean' };
		case 'LIST':
			return { ...base, type: 'options', options: buildOptions(attr) };
		case 'MULTISELECT_LIST':
			// Comma-separated string of selectedValue IDs (see MULTISELECT_SUFFIX).
			return { ...base, type: 'string' };
		default:
			return { ...base, type: 'string' };
	}
}

// ---------------------------------------------------------------------------
// Definitions loader + per-entity filter
// ---------------------------------------------------------------------------

/**
 * Load ALL custom-attribute definitions and return those attached to `entityName`.
 * Never throws — a missing endpoint / permission simply yields an empty list so
 * the resourceMapper renders an empty (but valid) field set.
 */
export async function getCustomAttributesForEntity(
	context: ILoadOptionsFunctions,
	entityName: string,
): Promise<WeclappAttributeDefinition[]> {
	try {
		const response = await weclappApiRequest.call(context, 'GET', '/customAttributeDefinition', undefined, {
			pageSize: 1000,
		});
		const attrs = ((response?.result as WeclappAttributeDefinition[] | undefined) ?? []);
		return attrs.filter(
			(a) => Array.isArray(a.entities) && a.entities.includes(entityName),
		);
	} catch {
		return [];
	}
}

/**
 * resourceMapping method registered on the node. Resolves the target entity from
 * the current `resource` parameter, loads its custom-attribute definitions, and
 * maps them to ResourceMapperFields.
 */
export async function getCustomAttributeFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const entityName = this.getNodeParameter('resource', 0) as string;
	const attrs = await getCustomAttributesForEntity(this, entityName);
	return {
		fields: attrs.map(attributeDefinitionToResourceField),
		emptyFieldsNotice: `No custom attributes are defined for "${entityName}" in this weclapp tenant.`,
	};
}

// ---------------------------------------------------------------------------
// Reverse mapper (resourceMapper value → weclapp customAttributes[])
// ---------------------------------------------------------------------------

/**
 * Convert a resourceMapper value (as returned by getNodeParameter for a
 * `type: 'resourceMapper'` field) into weclapp's `customAttributes` array.
 *
 * Field-type dispatch (mirrors attributeDefinitionToResourceField):
 *   dateTime → dateValue (Berlin epoch-ms via toWeclappEpochMs)
 *   number   → numberValue (string, as weclapp expects)
 *   boolean  → booleanValue
 *   options  → selectedValueId
 *   '|multiselect' string → selectedValues:[{id}]
 *   else     → stringValue
 *
 * null / undefined / empty values are skipped so the resulting body never clears
 * unrelated attributes.
 */
export function buildWeclappCustomAttributes(
	rmv: Pick<ResourceMapperValue, 'value' | 'schema'>,
): WeclappCustomAttribute[] {
	if (!rmv || !rmv.value) {
		return [];
	}
	const schema = Array.isArray(rmv.schema) ? rmv.schema : [];

	return Object.entries(rmv.value).flatMap(([fieldId, fieldValue]) => {
		if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
			return [];
		}

		const isMultiselect = fieldId.endsWith(MULTISELECT_SUFFIX);
		const cleanId = fieldId
			.replace(MULTISELECT_SUFFIX, '')
			.replace(/^customAttribute/, '');
		const field = schema.find((f) => f.id === fieldId);
		const attr: WeclappCustomAttribute = { attributeDefinitionId: cleanId };

		if (field?.type === 'dateTime') {
			const epoch = toWeclappEpochMs(fieldValue);
			if (Number.isNaN(epoch)) {
				return [];
			}
			attr.dateValue = epoch;
		} else if (field?.type === 'number') {
			attr.numberValue = String(fieldValue);
		} else if (field?.type === 'boolean') {
			attr.booleanValue = Boolean(fieldValue);
		} else if (field?.type === 'options') {
			attr.selectedValueId = String(fieldValue);
		} else if (isMultiselect) {
			attr.selectedValues = String(fieldValue)
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0)
				.map((id) => ({ id }));
		} else {
			attr.stringValue = String(fieldValue);
		}

		return [attr];
	});
}
