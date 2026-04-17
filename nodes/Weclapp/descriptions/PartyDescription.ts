import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ─── Shared constants ─────────────────────────────────────────────────────────

export const PARTY_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Organization', value: 'ORGANIZATION' },
	{ name: 'Person', value: 'PERSON' },
];

/** Body fields shared between create and update — same shape, same API fields. */
export const PARTY_BODY_OPTIONS: INodeProperties[] = [
	{
		displayName: 'Active',
		name: 'active',
		type: 'boolean',
		default: true,
		description: 'Whether the party is active',
		routing: { send: { type: 'body', property: 'active' } },
	},
	{
		displayName: 'Company Name',
		name: 'company',
		type: 'string',
		default: '',
		description: 'The company or organisation name of the party',
		routing: { send: { type: 'body', property: 'company' } },
	},
	{
		displayName: 'Customer Number',
		name: 'customerNumber',
		type: 'string',
		default: '',
		description: 'The customer number assigned to this party',
		routing: { send: { type: 'body', property: 'customerNumber' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'name@email.com',
		description: 'Primary email address of the party',
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		description: 'First name (for individual contacts)',
		routing: { send: { type: 'body', property: 'firstName' } },
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		description: 'Last name (for individual contacts)',
		routing: { send: { type: 'body', property: 'lastName' } },
	},
	{
		displayName: 'Party Number',
		name: 'partyNumber',
		type: 'string',
		default: '',
		description: 'The unique party number',
		routing: { send: { type: 'body', property: 'partyNumber' } },
	},
	{
		displayName: 'Party Type',
		name: 'partyType',
		type: 'options',
		default: 'ORGANIZATION',
		description: 'The type classification of this party',
		options: PARTY_TYPE_OPTIONS,
		routing: { send: { type: 'body', property: 'partyType' } },
	},
	{
		displayName: 'Customer',
		name: 'customer',
		type: 'boolean',
		default: false,
		description: 'Whether this party acts as a customer',
		routing: { send: { type: 'body', property: 'customer' } },
	},
	{
		displayName: 'Prospect',
		name: 'prospect',
		type: 'boolean',
		default: false,
		description: 'Whether this party is a prospect',
		routing: { send: { type: 'body', property: 'prospect' } },
	},
	{
		displayName: 'Supplier',
		name: 'supplier',
		type: 'boolean',
		default: false,
		description: 'Whether this party acts as a supplier',
		routing: { send: { type: 'body', property: 'supplier' } },
	},
	{
		displayName: 'Supplier Number',
		name: 'supplierNumber',
		type: 'string',
		default: '',
		description: 'The supplier number assigned to this party',
		routing: { send: { type: 'body', property: 'supplierNumber' } },
	},
];

// ─── Operations ───────────────────────────────────────────────────────────────

const partyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['party'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new party (customer, supplier, or prospect)',
				action: 'Create a party',
				routing: {
					request: { method: 'POST', url: '/party' },
				},
			},
			{
				name: 'Create Public Page',
				value: 'createPublicPage',
				description: 'Create a public page for a party',
				action: 'Create public page for a party',
				routing: {
					request: {
						method: 'POST',
						url: '=/party/id/{{$parameter["partyId"]}}/createPublicPage',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a party by ID',
				action: 'Delete a party',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/party/id/{{$parameter["partyId"]}}',
					},
					output: {
						postReceive: [
							{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } },
						],
					},
				},
			},
			{
				name: 'Download Image',
				value: 'downloadImage',
				description: 'Download the image of a party as binary data',
				action: 'Download image of a party',
				routing: {
					request: {
						method: 'GET',
						url: '=/party/id/{{$parameter["partyId"]}}/downloadImage',
						returnFullResponse: true,
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{ type: 'binaryData', properties: { destinationProperty: 'data' } },
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a party by ID',
				action: 'Get a party',
				routing: {
					request: { method: 'GET', url: '=/party/id/{{$parameter["partyId"]}}' },
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List and filter parties',
				action: 'List parties',
				routing: {
					request: { method: 'GET', url: '/party', qs: { pageSize: 1000 } },
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'result' } },
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing party by ID',
				action: 'Update a party',
				routing: {
					request: {
						method: 'PUT',
						url: '=/party/id/{{$parameter["partyId"]}}',
						qs: { ignoreMissingProperties: true },
					},
				},
			},
			{
				name: 'Upload Image',
				value: 'uploadImage',
				description: 'Upload an image for a party from binary data',
				action: 'Upload image for a party',
				routing: {
					request: {
						method: 'POST',
						url: '=/party/id/{{$parameter["partyId"]}}/uploadImage',
					},
				},
			},
		],
		default: 'list',
	},
];

// ─── Fields ───────────────────────────────────────────────────────────────────

const partyIdField: INodeProperties = {
	displayName: 'Party ID',
	name: 'partyId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the party to operate on',
	displayOptions: {
		show: {
			resource: ['party'],
			operation: ['get', 'update', 'delete', 'createPublicPage', 'downloadImage', 'uploadImage'],
		},
	},
};

const partyTypeFilterField: INodeProperties = {
	displayName: 'Party Type',
	name: 'partyTypeFilter',
	type: 'options',
	default: 'ANY',
	description:
		'Filter results by party type. Select a type to narrow results, or leave as Any to return all party types.',
	options: [{ name: 'Any', value: 'ANY' }, ...PARTY_TYPE_OPTIONS],
	displayOptions: { show: { resource: ['party'], operation: ['list'] } },
	routing: {
		send: {
			type: 'query',
			property: 'partyType-eq',
			// Only send the filter when a specific type is selected, not "ANY"
			value: '={{ $value !== "ANY" ? $value : undefined }}',
		},
	},
};

const listReturnAllOrLimit: INodeProperties[] = returnAllOrLimit.map((field) => ({
	...field,
	displayOptions: { show: { resource: ['party'], operation: ['list'] } },
}));

const listFilters: INodeProperties = {
	...filtersCollection,
	description:
		'Filterable fields: partyType, partyNumber, name, firstName, lastName, customerNumber, supplierNumber, active, email',
	displayOptions: { show: { resource: ['party'], operation: ['list'] } },
};

const listSimplify: INodeProperties = {
	...simplifyField,
	displayOptions: { show: { resource: ['party'], operation: ['list', 'get'] } },
	description: 'Reserved for future use — currently returns full entity shape.',
	// NOTE: The broken type:'filter' postReceive was removed in #61. A correct
	// type:'set' property-projection implementation is tracked for v0.3.0.
};

const getAdditionalFields: INodeProperties = {
	...additionalFields,
	displayOptions: { show: { resource: ['party'], operation: ['get', 'list'] } },
};

const createFields: INodeProperties = {
	displayName: 'Party Fields',
	name: 'partyFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: { show: { resource: ['party'], operation: ['create'] } },
	options: PARTY_BODY_OPTIONS,
};

const updateFields: INodeProperties = {
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: { show: { resource: ['party'], operation: ['update'] } },
	options: PARTY_BODY_OPTIONS,
};

const downloadImageOptions: INodeProperties = {
	displayName: 'Options',
	name: 'downloadImageOptions',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: { show: { resource: ['party'], operation: ['downloadImage'] } },
	options: [
		{
			displayName: 'Image ID',
			name: 'imageId',
			type: 'string',
			default: '',
			description: 'ID of a specific image to download (optional)',
			routing: { send: { type: 'query', property: 'imageId' } },
		},
		{
			displayName: 'Scale Height',
			name: 'scaleHeight',
			type: 'number',
			default: 0,
			description: 'Desired height in pixels for image scaling (0 = no scaling)',
			routing: {
				// Only send when a positive value is set; 0 means "use original size"
				send: { type: 'query', property: 'scaleHeight', value: '={{ $value > 0 ? $value : undefined }}' },
			},
		},
		{
			displayName: 'Scale Width',
			name: 'scaleWidth',
			type: 'number',
			default: 0,
			description: 'Desired width in pixels for image scaling (0 = no scaling)',
			routing: {
				send: { type: 'query', property: 'scaleWidth', value: '={{ $value > 0 ? $value : undefined }}' },
			},
		},
	],
};

const uploadImageField: INodeProperties = {
	displayName: 'Binary Property',
	name: 'binaryPropertyName',
	type: 'string',
	default: 'data',
	required: true,
	description: 'Name of the binary property containing the image to upload',
	displayOptions: { show: { resource: ['party'], operation: ['uploadImage'] } },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const partyDescription: INodeProperties[] = [
	...partyOperations,
	partyIdField,
	partyTypeFilterField,
	...listReturnAllOrLimit,
	listFilters,
	listSimplify,
	getAdditionalFields,
	createFields,
	updateFields,
	downloadImageOptions,
	uploadImageField,
];
