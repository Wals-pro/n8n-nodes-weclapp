import type { INodeProperties } from 'n8n-workflow';

/**
 * Return All / Limit toggle shared across list operations.
 * Full implementation in unit 3.
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
 * Filters collection for weclapp query params.
 * Uses only the 13 valid weclapp filter operator suffixes.
 * Full implementation in unit 3.
 */
export const filtersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'fixedCollection',
	placeholder: 'Add Filter',
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
					default: '',
					description: 'The entity field to filter on',
					placeholder: 'e.g. status',
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					default: '-eq',
					options: [
						{ name: 'Equals', value: '-eq' },
						{ name: 'Greater Than', value: '-gt' },
						{ name: 'Greater than or Equal', value: '-ge' },
						{ name: 'Ilike (Case-Insensitive)', value: '-ilike' },
						{ name: 'In (JSON Array)', value: '-in' },
						{ name: 'Is Not Null', value: '-notnull' },
						{ name: 'Is Null', value: '-null' },
						{ name: 'Less Than', value: '-lt' },
						{ name: 'Less than or Equal', value: '-le' },
						{ name: 'Like (SQL %/_)', value: '-like' },
						{ name: 'Not Equals', value: '-ne' },
						{ name: 'Not Ilike', value: '-notilike' },
						{ name: 'Not in (JSON Array)', value: '-notin' },
						{ name: 'Not Like', value: '-notlike' },
					],
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Filter value (use JSON array string for -in/-notin)',
				},
			],
		},
	],
};

/**
 * Additional fields collection (properties, includeReferencedEntities, etc.).
 * Full implementation in unit 3.
 */
export const additionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'Properties (Field Projection)',
			name: 'properties',
			type: 'string',
			default: '',
			description:
				'Comma-separated list of fields to include in the response (field projection)',
			placeholder: 'e.g. ID,articleNumber,name',
		},
		{
			displayName: 'Include Referenced Entities',
			name: 'includeReferencedEntities',
			type: 'string',
			default: '',
			description: 'Comma-separated list of referenced entity types to include inline',
			placeholder: 'e.g. article,party',
		},
		{
			displayName: 'Serialize Nulls',
			name: 'serializeNulls',
			type: 'boolean',
			default: false,
			description: 'Whether to include null fields in the response',
		},
	],
};

/**
 * Simplify toggle — when true, returns curated subset of entity fields.
 */
export const simplifyField: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description:
		'Whether to return a simplified version of the response instead of the raw data (recommended for most use cases)',
};
