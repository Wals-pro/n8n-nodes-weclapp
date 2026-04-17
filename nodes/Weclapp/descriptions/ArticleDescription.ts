import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ─── Operation selector ──────────────────────────────────────────────────────

export const articleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['article'],
			},
		},
		// Alphabetized by name (required by n8n-nodes-base/node-param-options-type-unsorted-items)
		options: [
			{
				name: 'Change Unit',
				value: 'changeUnit',
				description: 'Change the unit of an article',
				action: 'Change article unit',
				routing: {
					request: {
						method: 'POST',
						url: '=/article/id/{{$parameter["articleId"]}}/changeUnit',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new article',
				action: 'Create article',
				routing: {
					request: {
						method: 'POST',
						url: '/article',
					},
				},
			},
			{
				name: 'Create Datasheet PDF',
				value: 'createDatasheetPdf',
				description: 'Generate and download an article datasheet as PDF (binary)',
				action: 'Create article datasheet PDF',
				routing: {
					request: {
						method: 'POST',
						url: '=/article/id/{{$parameter["articleId"]}}/createDatasheetPdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData' as const,
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Create Label PDF',
				value: 'createLabelPdf',
				description: 'Generate and download an article label as PDF (binary)',
				action: 'Create article label PDF',
				routing: {
					request: {
						method: 'POST',
						url: '=/article/id/{{$parameter["articleId"]}}/createLabelPdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData' as const,
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an article',
				action: 'Delete article',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/article/id/{{$parameter["articleId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Article Image',
				value: 'downloadArticleImage',
				description: 'Download an article image (binary)',
				action: 'Download article image',
				routing: {
					request: {
						method: 'GET',
						url: '=/article/id/{{$parameter["articleId"]}}/downloadArticleImage',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData' as const,
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Main Article Image',
				value: 'downloadMainArticleImage',
				description: 'Download the main article image (binary)',
				action: 'Download main article image',
				routing: {
					request: {
						method: 'GET',
						url: '=/article/id/{{$parameter["articleId"]}}/downloadMainArticleImage',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData' as const,
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single article by ID',
				action: 'Get article',
				routing: {
					request: {
						method: 'GET',
						url: '=/article/id/{{$parameter["articleId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Retrieve a list of articles',
				action: 'List articles',
				routing: {
					request: {
						method: 'GET',
						url: '/article',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'result',
								},
							},
						],
					},
				},
			},
			{
				name: 'Packaging Unit Structure',
				value: 'packagingUnitStructure',
				description: 'Retrieve the packaging unit structure of an article',
				action: 'Get article packaging unit structure',
				routing: {
					request: {
						method: 'GET',
						url: '=/article/id/{{$parameter["articleId"]}}/packagingUnitStructure',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing article',
				action: 'Update article',
				routing: {
					request: {
						method: 'PUT',
						url: '=/article/id/{{$parameter["articleId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
			{
				name: 'Update Prices',
				value: 'updatePrices',
				description: 'Sync article prices for a sales channel (closes overlapping prices, sets new price)',
				action: 'Update article prices',
			},
			{
				name: 'Upload Article Image',
				value: 'uploadArticleImage',
				description: 'Upload an image for an article',
				action: 'Upload article image',
				routing: {
					request: {
						method: 'POST',
						url: '=/article/id/{{$parameter["articleId"]}}/uploadArticleImage',
					},
				},
			},
		],
		default: 'list',
	},
];

// ─── Shared: article ID resource locator ─────────────────────────────────────

const articleIdField: INodeProperties = {
	displayName: 'Article',
	name: 'articleId',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	description: 'The article to operate on',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: [
				'changeUnit',
				'createDatasheetPdf',
				'createLabelPdf',
				'delete',
				'downloadArticleImage',
				'downloadMainArticleImage',
				'get',
				'packagingUnitStructure',
				'update',
				'updatePrices',
				'uploadArticleImage',
			],
		},
	},
	modes: [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234567890',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9]+$',
						errorMessage: 'Article ID must be numeric',
					},
				},
			],
		},
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getArticles',
				searchable: true,
			},
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://tenant.weclapp.com/webapp/api/v2/article/id/1234567890',
			extractValue: {
				type: 'regex',
				regex: '/article/id/([0-9]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '/article/id/[0-9]+',
						errorMessage: 'URL must contain /article/id/{id}',
					},
				},
			],
		},
	],
};

// ─── List operation fields ────────────────────────────────────────────────────

// returnAllOrLimit[0] = Return All toggle, returnAllOrLimit[1] = Limit (only shown when returnAll=false)
// Merge the resource+operation guard with the Limit field's existing returnAll guard.
const listReturnAll: INodeProperties[] = [
	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},
];

const listFilters: INodeProperties = {
	...filtersCollection,
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['list'],
		},
	},
};

const listSimplify: INodeProperties = {
	...simplifyField,
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['get', 'list'],
		},
	},
};

const listAdditionalFields: INodeProperties = {
	...additionalFields,
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['get', 'list'],
		},
	},
};

// ─── Create operation fields ──────────────────────────────────────────────────

const createArticleNumber: INodeProperties = {
	displayName: 'Article Number',
	name: 'articleNumber',
	type: 'string',
	required: true,
	default: '',
	description: 'Unique article number (SKU)',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['create'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'articleNumber',
		},
	},
};

const createName: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	required: true,
	default: '',
	description: 'Article name / description',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['create'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'name',
		},
	},
};

const articleTypeOptions = [
	{ name: 'Non-Storable', value: 'NON_STORABLE' },
	{ name: 'Production Bill of Material', value: 'PRODUCTION_BILL_OF_MATERIAL' },
	{ name: 'Sales Bill of Material', value: 'SALES_BILL_OF_MATERIAL' },
	{ name: 'Service', value: 'SERVICE' },
	{ name: 'Storable', value: 'STORABLE' },
	{ name: 'Virtual', value: 'VIRTUAL' },
];

const createArticleType: INodeProperties = {
	displayName: 'Article Type',
	name: 'articleType',
	type: 'options',
	required: true,
	default: 'STORABLE',
	description: 'The type of article',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['create'],
		},
	},
	options: articleTypeOptions,
	routing: {
		send: {
			type: 'body',
			property: 'articleType',
		},
	},
};

const createAdditionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'createAdditionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['create'],
		},
	},
	options: [
		{
			displayName: 'Active',
			name: 'active',
			type: 'boolean',
			default: true,
			description: 'Whether the article is active',
			routing: {
				send: {
					type: 'body',
					property: 'active',
				},
			},
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Long description of the article',
			routing: {
				send: {
					type: 'body',
					property: 'description',
				},
			},
		},
		{
			displayName: 'EAN / GTIN',
			name: 'ean',
			type: 'string',
			default: '',
			description: 'EAN / GTIN barcode of the article',
			routing: {
				send: {
					type: 'body',
					property: 'ean',
				},
			},
		},
		{
			displayName: 'Tax Rate Type',
			name: 'taxRateType',
			type: 'options',
			default: 'STANDARD',
			options: [
				{ name: 'Reduced', value: 'REDUCED' },
				{ name: 'Standard', value: 'STANDARD' },
				{ name: 'Zero', value: 'ZERO' },
			],
			routing: {
				send: {
					type: 'body',
					property: 'taxRateType',
				},
			},
		},
		{
			displayName: 'Unit ID',
			name: 'unitId',
			type: 'string',
			default: '',
			description: 'ID of the unit (e.g. piece, kg)',
			routing: {
				send: {
					type: 'body',
					property: 'unitId',
				},
			},
		},
	],
};

// ─── Update operation fields ──────────────────────────────────────────────────

const updateBody: INodeProperties = {
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	description: 'Fields to update on the article',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['update'],
		},
	},
	options: [
		{
			displayName: 'Active',
			name: 'active',
			type: 'boolean',
			default: true,
			routing: {
				send: {
					type: 'body',
					property: 'active',
				},
			},
		},
		{
			displayName: 'Article Number',
			name: 'articleNumber',
			type: 'string',
			default: '',
			routing: {
				send: {
					type: 'body',
					property: 'articleNumber',
				},
			},
		},
		{
			displayName: 'Article Type',
			name: 'articleType',
			type: 'options',
			default: 'STORABLE',
			options: articleTypeOptions,
			routing: {
				send: {
					type: 'body',
					property: 'articleType',
				},
			},
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			routing: {
				send: {
					type: 'body',
					property: 'description',
				},
			},
		},
		{
			displayName: 'EAN / GTIN',
			name: 'ean',
			type: 'string',
			default: '',
			routing: {
				send: {
					type: 'body',
					property: 'ean',
				},
			},
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			routing: {
				send: {
					type: 'body',
					property: 'name',
				},
			},
		},
		{
			displayName: 'Unit ID',
			name: 'unitId',
			type: 'string',
			default: '',
			routing: {
				send: {
					type: 'body',
					property: 'unitId',
				},
			},
		},
	],
};

// ─── changeUnit action fields ─────────────────────────────────────────────────

const changeUnitFields: INodeProperties = {
	displayName: 'Unit ID',
	name: 'changeUnitId',
	type: 'string',
	required: true,
	default: '',
	description: 'ID of the new unit to assign to the article',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['changeUnit'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'unitId',
		},
	},
};

// ─── uploadArticleImage fields ────────────────────────────────────────────────

const uploadImageFields: INodeProperties = {
	displayName: 'Binary Property',
	name: 'binaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	description: 'Name of the binary property containing the image to upload',
	displayOptions: {
		show: {
			resource: ['article'],
			operation: ['uploadArticleImage'],
		},
	},
};

// ─── updatePrices composite fields ───────────────────────────────────────────

const updatePricesFields: INodeProperties[] = [
	{
		displayName: 'Gross Price',
		name: 'grossPrice',
		type: 'number',
		required: true,
		default: 0,
		description: 'Target gross price for the sales channel',
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['updatePrices'],
			},
		},
	},
	{
		displayName: 'Currency ID',
		name: 'currencyId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the currency (e.g. the ID for EUR in your weclapp instance)',
		placeholder: 'e.g. 256',
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['updatePrices'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updatePricesOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['article'],
				operation: ['updatePrices'],
			},
		},
		options: [
			{
				displayName: 'Sales Channel',
				name: 'salesChannel',
				type: 'string',
				default: 'GROSS1',
				description: 'Target sales channel (default: GROSS1)',
			},
			{
				displayName: 'Valid From Timestamp',
				name: 'validFrom',
				type: 'number',
				default: 0,
				description: 'Start of the new price validity in milliseconds since epoch. Leave 0 to default to now.',
			},
		],
	},
];

// ─── Export ───────────────────────────────────────────────────────────────────

export const articleDescription: INodeProperties[] = [
	...articleOperations,
	articleIdField,
	// List
	...listReturnAll,
	listFilters,
	listSimplify,
	listAdditionalFields,
	// Create
	createArticleNumber,
	createName,
	createArticleType,
	createAdditionalFields,
	// Update
	updateBody,
	// Native actions
	changeUnitFields,
	uploadImageFields,
	// updatePrices composite
	...updatePricesFields,
];
