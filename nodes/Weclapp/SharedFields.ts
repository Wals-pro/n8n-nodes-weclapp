import type { IHttpRequestOptions, INodeProperties, IN8nRequestOperationPaginationOffset } from 'n8n-workflow';

import { buildFilterParams, type WeclappFilterItem } from './GenericFunctions';

/** A single filter entry read from the fixedCollection at runtime. value is absent for null/notnull operators. */
export type WeclappFilterEntry = { field: string; operator: string; value?: string };

// ---------------------------------------------------------------------------
// Pagination config
// ---------------------------------------------------------------------------

/**
 * Native n8n offset-pagination config for weclapp list operations.
 *
 * Resource descriptors can spread this into their list op's `routing.operations`
 * to get automatic multi-page fetching when returnAll = true.
 *
 * NOTE: Resource descriptors are NOT wired to this yet — that is a follow-up
 * task (see #29 partial). The constant is exported so follow-up workers can
 * consume it without touching SharedFields again.
 *
 * Shape verified against IN8nRequestOperationPaginationOffset from n8n-workflow.
 */
export const paginationConfig: IN8nRequestOperationPaginationOffset = {
	type: 'offset' as const,
	properties: {
		limitParameter: 'pageSize',
		offsetParameter: 'page',
		pageSize: 1000,
		rootProperty: 'result',
		type: 'query' as const,
	},
};

// ---------------------------------------------------------------------------
// preSend: filters
// ---------------------------------------------------------------------------

/**
 * PreSend action for filtersCollection.
 *
 * Reads the `filters` fixedCollection value from the current node parameter,
 * converts each entry to a `field-operator=value` weclapp query param via
 * buildFilterParams, and merges the result into requestOptions.qs.
 *
 * This is the routing hook that fixes #57: without it, UI-configured filters
 * are collected but never sent to the weclapp API.
 *
 * Attached on the top-level `filtersCollection` INodeProperties.routing because
 * INodePropertyCollection (inner option groups) does not carry a routing field.
 */
export async function filtersPreSend(
	this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// fixedCollection shape: { filter: Array<{ field, operator, value }> }
	const filtersParam = this.getNodeParameter('filters', {}) as {
		filter?: Array<{ field: string; operator: string; value?: string }>;
	};

	const entries = filtersParam?.filter ?? [];
	if (entries.length === 0) {
		return requestOptions;
	}

	// buildFilterParams validates operators and produces { 'field-op': 'value' }
	// Cast is safe: WeclappFilterItem.value is `unknown`; our entries have value?: string
	// which is compatible at runtime (undefined handled as empty string in buildFilterParams).
	const filterQs = buildFilterParams(entries as WeclappFilterItem[]);

	return {
		...requestOptions,
		qs: {
			...(requestOptions.qs ?? {}),
			...filterQs,
		},
	};
}

// ---------------------------------------------------------------------------
// returnAllOrLimit
// ---------------------------------------------------------------------------

/**
 * Two-field pair used by every List operation.
 * Spread into a resource descriptor's `properties` array: `...returnAllOrLimit`.
 *
 * - returnAll: boolean (no routing — triggers paginationConfig when wired in
 *   resource list op routing; see #29 follow-up)
 * - limit: routes as `pageSize` query param when returnAll = false (#29 fix)
 */
export const returnAllOrLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'pageSize',
				value: '={{$value}}',
			},
		},
	},
];

// ---------------------------------------------------------------------------
// filtersCollection
// ---------------------------------------------------------------------------

/**
 * Filters fixedCollection mapping to weclapp query-param suffixes.
 * Lists exactly the 14 valid suffixes — `-gte` and `-lte` are omitted because
 * weclapp silently ignores unknown suffixes, returning unfiltered results.
 *
 * Fix #57: `routing.send.preSend` on the top-level property calls
 * filtersPreSend which reads filters.filter, calls buildFilterParams, and
 * merges the result into qs. Without this hook, UI filters are silently dropped.
 *
 * Fix #58: the `value` child field no longer has `displayOptions` — n8n
 * crashes with "Could not resolve parameter dependencies / max iterations" when
 * a collection or fixedCollection child carries displayOptions. The description
 * still explains when to leave the field empty.
 */
export const filtersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'fixedCollection',
	placeholder: 'Add filter',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	// #57 fix: preSend attached here (top-level INodeProperties.routing) because
	// INodePropertyCollection (fixedCollection option groups) does not carry routing.
	routing: {
		send: {
			preSend: [filtersPreSend],
		},
	},
	options: [
		{
			displayName: 'Filter',
			name: 'filter',
			values: [
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
					required: true,
					default: '',
					description: 'Entity property name (e.g., articleNumber, partyType)',
					placeholder: 'e.g. articleNumber',
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					default: 'eq',
					options: [
						{
							name: 'Case-Insensitive Like',
							value: 'ilike',
							description: 'Case-insensitive LIKE pattern matching',
						},
						{
							name: 'Case-Insensitive Not Like',
							value: 'notilike',
							description: 'Case-insensitive negated LIKE pattern matching',
						},
						{
							name: 'Equals',
							value: 'eq',
							description: 'Field value equals the given value',
						},
						{
							name: 'Greater Than',
							value: 'gt',
							description: 'Field value is strictly greater than the given value',
						},
						{
							name: 'Greater Than or Equal',
							value: 'ge',
							description: 'Field value is greater than or equal to the given value',
						},
						{
							name: 'In (JSON Array)',
							value: 'in',
							description: 'Field value is one of the values in a JSON array (e.g., ["a","b"])',
						},
						{
							name: 'Is Not Null',
							value: 'notnull',
							description: 'Field value is not null (leave Value empty)',
						},
						{
							name: 'Is Null',
							value: 'null',
							description: 'Field value is null (leave Value empty)',
						},
						{
							name: 'Less Than',
							value: 'lt',
							description: 'Field value is strictly less than the given value',
						},
						{
							name: 'Less Than or Equal',
							value: 'le',
							description: 'Field value is less than or equal to the given value',
						},
						{
							name: 'Like',
							value: 'like',
							description: 'SQL-style LIKE pattern matching (use % and _ wildcards)',
						},
						{
							name: 'Not Equals',
							value: 'ne',
							description: 'Field value does not equal the given value',
						},
						{
							name: 'Not In (JSON Array)',
							value: 'notin',
							description:
								'Field value is not one of the values in a JSON array (e.g., ["a","b"])',
						},
						{
							name: 'Not Like',
							value: 'notlike',
							description: 'Negated SQL-style LIKE pattern matching',
						},
					],
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					// displayOptions intentionally removed — fix #58: n8n crashes with
					// "Could not resolve parameter dependencies / max iterations" when
					// a fixedCollection/collection child has displayOptions. The description
					// below explains when to leave this empty instead.
					description:
						'Filter value. For in/notin use a JSON array (e.g. ["a","b"]). For null/notnull operators leave this empty — the value is ignored by weclapp.',
				},
			],
		},
	],
};

// ---------------------------------------------------------------------------
// additionalFields
// ---------------------------------------------------------------------------

/** Optional query-level modifiers available on most List and Get operations. */
export const additionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add field',
	default: {},
	options: [
		{
			displayName: 'Properties',
			name: 'properties',
			type: 'string',
			default: '',
			description: 'Comma-separated list of fields to include in the response',
			placeholder: 'e.g. ID,articleNumber,name',
		},
		{
			displayName: 'Include Referenced Entities',
			name: 'includeReferencedEntities',
			type: 'string',
			default: '',
			description: 'Comma-separated list of referenced entity IDs to expand',
			placeholder: 'e.g. article,party',
		},
		{
			displayName: 'Serialize Nulls',
			name: 'serializeNulls',
			type: 'boolean',
			default: false,
			description: 'Whether to include null-valued fields in the response',
		},
	],
};

// ---------------------------------------------------------------------------
// Misc shared fields
// ---------------------------------------------------------------------------

/** When true, weclapp ignores fields absent from the PUT body instead of clearing them. Attach to Update operations only. */
export const ignoreMissingPropertiesField: INodeProperties = {
	displayName: 'Ignore Missing Properties',
	name: 'ignoreMissingProperties',
	type: 'boolean',
	default: true,
	description:
		'Whether to ignore fields missing from the body on update (weclapp PUT with ignoreMissingProperties=true)',
};

export const simplifyField: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
};
