import type { INodeProperties } from 'n8n-workflow';

/** A single filter entry read from the fixedCollection at runtime. value is absent for null/notnull operators. */
export type WeclappFilterEntry = { field: string; operator: string; value?: string };

/**
 * Two-field pair used by every List operation.
 * Spread into a resource descriptor's `properties` array: `...returnAllOrLimit`.
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
	},
];

/**
 * Filters fixedCollection mapping to weclapp query-param suffixes.
 * Lists exactly the 13 valid suffixes — `-gte` and `-lte` are omitted because
 * weclapp silently ignores unknown suffixes, returning unfiltered results.
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
					description:
						'Operator value. For in/notin use JSON array. For null/notnull leave empty.',
					displayOptions: {
						hide: {
							operator: ['null', 'notnull'],
						},
					},
				},
			],
		},
	],
};

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
