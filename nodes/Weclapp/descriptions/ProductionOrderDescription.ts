import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const PRODUCTION_ORDER_STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Cancelled', value: 'CANCELLED' },
	{ name: 'Closed', value: 'CLOSED' },
	{ name: 'Documents Printed', value: 'DOCUMENTS_PRINTED' },
	{ name: 'Entry in Progress', value: 'ENTRY_IN_PROGRESS' },
	{ name: 'Interrupted', value: 'INTERRUPTED' },
	{ name: 'New', value: 'NEW' },
	{ name: 'Started', value: 'STARTED' },
];

// ---------------------------------------------------------------------------
// Production Order Operations
// ---------------------------------------------------------------------------

export const productionOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['productionOrder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new production order',
				action: 'Create a production order',
				routing: {
					request: {
						method: 'POST',
						url: '/productionOrder',
					},
				},
			},
			{
				name: 'Create Picking List (PDF)',
				value: 'createPickingList',
				description: 'Generate a picking list PDF for the production order',
				action: 'Create picking list PDF for a production order',
				routing: {
					request: {
						method: 'POST',
						url: '=/productionOrder/id/{{$parameter["productionOrderId"]}}/createPickingList',
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
				description: 'Delete a production order by ID',
				action: 'Delete a production order',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/productionOrder/id/{{$parameter["productionOrderId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["productionOrderId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Production Order PDF',
				value: 'downloadLatestProductionOrderPdf',
				description: 'Download the latest production order PDF',
				action: 'Download production order PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/productionOrder/id/{{$parameter["productionOrderId"]}}/downloadLatestProductionOrderPdf',
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
				name: 'Fast Production Booking',
				value: 'fastProductionBooking',
				description: 'Book a production quantity by production order number',
				action: 'Fast production booking',
				routing: {
					request: {
						method: 'POST',
						url: '/productionOrder/fastProductionBooking',
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
				name: 'Get',
				value: 'get',
				description: 'Retrieve a production order by ID',
				action: 'Get a production order',
				routing: {
					request: {
						method: 'GET',
						url: '=/productionOrder/id/{{$parameter["productionOrderId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Return a list of production orders',
				action: 'List production orders',
				routing: {
					request: {
						method: 'GET',
						url: '/productionOrder',
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
				name: 'Update',
				value: 'update',
				description: 'Update a production order by ID (PUT with ignoreMissingProperties=true)',
				action: 'Update a production order',
				routing: {
					request: {
						method: 'PUT',
						url: '=/productionOrder/id/{{$parameter["productionOrderId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
		],
		default: 'list',
	},
];

// ---------------------------------------------------------------------------
// Production Order Fields
// ---------------------------------------------------------------------------

export const productionOrderFields: INodeProperties[] = [
	// ── Shared: Production Order ID ────────────────────────────────────────
	{
		displayName: 'Production Order',
		name: 'productionOrderId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		description: 'The production order to operate on',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: [
					'get',
					'update',
					'delete',
					'createPickingList',
					'downloadLatestProductionOrderPdf',
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
							errorMessage: 'Production order ID must be numeric',
						},
					},
				],
			},
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getProductionOrders',
					searchable: true,
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://tenant.weclapp.com/webapp/api/v2/productionOrder/id/1234567890',
				extractValue: {
					type: 'regex',
					regex: '/productionOrder/id/([0-9]+)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '/productionOrder/id/[0-9]+',
							errorMessage: 'URL must contain /productionOrder/id/{id}',
						},
					},
				],
			},
		],
	},

	// ── List: Return All / Limit ───────────────────────────────────────────
	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					pageSize: '={{ $value ? 1000 : undefined }}',
				},
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['list'],
				returnAll: [false],
			},
		},
		routing: {
			request: {
				qs: {
					pageSize: '={{ $value }}',
				},
			},
		},
	},

	// ── List: Simplify ─────────────────────────────────────────────────────
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['get', 'list', 'create', 'update'],
			},
		},
	},

	// ── List: Filters ──────────────────────────────────────────────────────
	// Filterable fields: productionOrderNumber, status, articleId,
	// orderDate (targetStartDate), productionQuantity (targetQuantity)
	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['list'],
			},
		},
	},

	// ── List: Additional Fields ────────────────────────────────────────────
	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['list', 'get'],
			},
		},
	},

	// ── Create: Required fields ───────────────────────────────────────────
	{
		displayName: 'Article ID',
		name: 'createArticleId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the article to produce',
		placeholder: 'e.g. 1234567890',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'articleId',
			},
		},
	},
	{
		displayName: 'Target Quantity',
		name: 'createTargetQuantity',
		type: 'string',
		required: true,
		default: '1',
		description: 'Quantity to produce (decimal string, e.g. "10" or "2.5")',
		placeholder: 'e.g. 10',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'targetQuantity',
			},
		},
	},
	{
		displayName: 'Target Start Date',
		name: 'createTargetStartDate',
		type: 'number',
		required: true,
		default: 0,
		description: 'Planned start date as Unix timestamp in milliseconds',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'targetStartDate',
			},
		},
	},
	{
		displayName: 'Target End Date',
		name: 'createTargetEndDate',
		type: 'number',
		required: true,
		default: 0,
		description: 'Planned end date as Unix timestamp in milliseconds',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'targetEndDate',
			},
		},
	},
	{
		displayName: 'Warehouse ID',
		name: 'createWarehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the warehouse where production takes place',
		placeholder: 'e.g. 1234567890',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'warehouseId',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'createAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assembly Storage Place ID',
				name: 'assemblyStoragePlaceId',
				type: 'string',
				default: '',
				description: 'ID of the storage place for the assembled product',
				routing: {
					send: {
						type: 'body',
						property: 'assemblyStoragePlaceId',
					},
				},
			},
			{
				displayName: 'Picking Instructions',
				name: 'pickingInstructions',
				type: 'string',
				default: '',
				description: 'Free-text picking instructions for warehouse staff',
				routing: {
					send: {
						type: 'body',
						property: 'pickingInstructions',
					},
				},
			},
			{
				displayName: 'Production Order Number',
				name: 'productionOrderNumber',
				type: 'string',
				default: '',
				description: 'Custom production order number (auto-generated if omitted)',
				routing: {
					send: {
						type: 'body',
						property: 'productionOrderNumber',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'NEW',
				options: PRODUCTION_ORDER_STATUS_OPTIONS,
				routing: {
					send: {
						type: 'body',
						property: 'status',
					},
				},
			},
		],
	},

	// ── Update: Body ──────────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Fields to update on the production order',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assembly Storage Place ID',
				name: 'assemblyStoragePlaceId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'assemblyStoragePlaceId',
					},
				},
			},
			{
				displayName: 'Picking Instructions',
				name: 'pickingInstructions',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'pickingInstructions',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'NEW',
				options: PRODUCTION_ORDER_STATUS_OPTIONS,
				routing: {
					send: {
						type: 'body',
						property: 'status',
					},
				},
			},
			{
				displayName: 'Target End Date',
				name: 'targetEndDate',
				type: 'number',
				default: 0,
				description: 'Planned end date as Unix timestamp in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'targetEndDate',
					},
				},
			},
			{
				displayName: 'Target Quantity',
				name: 'targetQuantity',
				type: 'string',
				default: '',
				description: 'Quantity to produce (decimal string)',
				routing: {
					send: {
						type: 'body',
						property: 'targetQuantity',
					},
				},
			},
			{
				displayName: 'Target Start Date',
				name: 'targetStartDate',
				type: 'number',
				default: 0,
				description: 'Planned start date as Unix timestamp in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'targetStartDate',
					},
				},
			},
			{
				displayName: 'Warehouse ID',
				name: 'warehouseId',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'warehouseId',
					},
				},
			},
		],
	},

	// ── fastProductionBooking: Required fields ────────────────────────────
	{
		displayName: 'Production Order Number',
		name: 'fastBookingOrderNumber',
		type: 'string',
		required: true,
		default: '',
		description: 'Production order number to book against',
		placeholder: 'e.g. PA-1001',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['fastProductionBooking'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'productionOrderNumber',
			},
		},
	},
	{
		displayName: 'Quantity',
		name: 'fastBookingQuantity',
		type: 'string',
		required: true,
		default: '',
		description: 'Quantity to book (decimal string, e.g. "5" or "2.5")',
		placeholder: 'e.g. 10',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['fastProductionBooking'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'quantity',
			},
		},
	},

	// ── Binary property name for PDF downloads ────────────────────────────
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description:
			'Name of the binary property in the output item where the downloaded file will be stored',
		displayOptions: {
			show: {
				resource: ['productionOrder'],
				operation: ['createPickingList', 'downloadLatestProductionOrderPdf'],
			},
		},
	},
];

// ---------------------------------------------------------------------------
// Combined export — spread into descriptions/index.ts resources array
// ---------------------------------------------------------------------------

export const productionOrderDescription: INodeProperties[] = [
	...productionOrderOperations,
	...productionOrderFields,
];
