import type { IDataObject, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

/**
 * preSend hook for warehouse/warehouseStock/warehouseStockMovement list operations.
 *
 * Removes query-string keys whose value is empty string, undefined, or the
 * literal string "undefined". This prevents optional filter fields (filterName,
 * filterWarehouseId, etc.) from sending e.g. `name-eq=` or `name-eq=undefined`
 * to the weclapp API when left blank in the UI — weclapp interprets `field-eq=`
 * as "field equals empty string" and returns 0 results.
 *
 * Attached at FIELD level (routing.send.preSend) so it runs during field routing
 * processing, after all earlier routing has been accumulated.
 */
export async function stripEmptyFilterPreSend(
	this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (!requestOptions.qs || typeof requestOptions.qs !== 'object') {
		return requestOptions;
	}
	const cleanQs: IDataObject = {};
	for (const [key, value] of Object.entries(requestOptions.qs as IDataObject)) {
		if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
			cleanQs[key] = value;
		}
	}
	return { ...requestOptions, qs: cleanQs };
}

/**
 * Factory: creates a preSend hook that adds a single query-string filter
 * (key=value) only when the named parameter is non-empty.
 *
 * n8n does not skip `routing.request.qs` entries whose expression evaluates to
 * undefined — they end up as the string "undefined" in the URL. This hook reads
 * the parameter value at execution time and adds it to qs only when non-blank.
 */
function makeFilterPreSend(
	paramName: string,
	qsKey: string,
): (this: { getNodeParameter: (name: string, fallback?: unknown) => unknown }, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions> {
	return async function (
		this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const value = (this.getNodeParameter(paramName, '') as string) ?? '';
		if (!value) {
			return requestOptions;
		}
		return {
			...requestOptions,
			qs: {
				...(requestOptions.qs ?? {}),
				[qsKey]: value,
			},
		};
	};
}

export const warehouseFilterNamePreSend = makeFilterPreSend('filterName', 'name-eq');
export const warehouseStockFilterWarehouseIdPreSend = makeFilterPreSend('filterWarehouseId', 'warehouseId-eq');
export const warehouseStockFilterArticleIdPreSend = makeFilterPreSend('filterArticleId', 'articleId-eq');
export const movementFilterArticleIdPreSend = makeFilterPreSend('filterArticleId', 'articleId-eq');
export const movementFilterWarehouseIdPreSend = makeFilterPreSend('filterWarehouseId', 'warehouseId-eq');
export const movementFilterEntryDateFromPreSend = makeFilterPreSend('filterEntryDateFrom', 'entryDate-ge');
export const movementFilterEntryDateToPreSend = makeFilterPreSend('filterEntryDateTo', 'entryDate-le');
export const movementFilterMovementTypePreSend = makeFilterPreSend('filterMovementType', 'stockMovementType-eq');

// ─── warehouse ───────────────────────────────────────────────────────────────

export const warehouseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['warehouse'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new warehouse',
				action: 'Create a warehouse',
				routing: {
					request: {
						method: 'POST',
						url: '/warehouse',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a warehouse by ID',
				action: 'Delete a warehouse',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/warehouse/id/{{$parameter["warehouseId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["warehouseId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a warehouse by ID',
				action: 'Get a warehouse',
				routing: {
					request: {
						method: 'GET',
						url: '=/warehouse/id/{{$parameter["warehouseId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all warehouses',
				action: 'List warehouses',
				routing: {
					request: {
						method: 'GET',
						url: '/warehouse',
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
				description: 'Update a warehouse by ID',
				action: 'Update a warehouse',
				routing: {
					request: {
						method: 'PUT',
						url: '=/warehouse/id/{{$parameter["warehouseId"]}}',
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

export const warehouseFields: INodeProperties[] = [
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the warehouse',
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},

	// Required name field for create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the warehouse',
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'name',
			},
		},
	},

	// Optional body fields for create and update
	{
		displayName: 'Additional Fields',
		name: 'warehouseBodyFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the warehouse is active',
				routing: {
					send: {
						type: 'body',
						property: 'active',
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the warehouse',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			{
				displayName: 'Short Name',
				name: 'shortName',
				type: 'string',
				default: '',
				description: 'Short name / abbreviation for the warehouse',
				routing: {
					send: {
						type: 'body',
						property: 'shortName',
					},
				},
			},
			{
				displayName: 'Standard',
				name: 'standard',
				type: 'boolean',
				default: false,
				description: 'Whether this is the standard (default) warehouse',
				routing: {
					send: {
						type: 'body',
						property: 'standard',
					},
				},
			},
		],
	},

	// Return All / Limit for list
	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},

	// Quick-filter by name (string equality)
	{
		displayName: 'Filter by Name',
		name: 'filterName',
		type: 'string',
		default: '',
		description: 'Filter warehouses by exact name',
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [warehouseFilterNamePreSend],
			},
		},
	},

	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['list'],
			},
		},
	},

	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['get', 'list'],
			},
		},
	},

	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['warehouse'],
				operation: ['get', 'list'],
			},
		},
	},
];

// ─── warehouseStock ──────────────────────────────────────────────────────────

export const warehouseStockOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a warehouse stock record by ID',
				action: 'Get warehouse stock',
				routing: {
					request: {
						method: 'GET',
						url: '=/warehouseStock/id/{{$parameter["stockId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List warehouse stock levels',
				action: 'List warehouse stock',
				routing: {
					request: {
						method: 'GET',
						url: '/warehouseStock',
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
		],
		default: 'list',
	},
];

export const warehouseStockFields: INodeProperties[] = [
	{
		displayName: 'Stock ID',
		name: 'stockId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the warehouse stock record',
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['get'],
			},
		},
	},

	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},

	{
		displayName: 'Filter by Warehouse',
		name: 'filterWarehouseId',
		type: 'string',
		default: '',
		description: 'Return stock for this warehouse ID only',
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [warehouseStockFilterWarehouseIdPreSend],
			},
		},
	},

	{
		displayName: 'Filter by Article',
		name: 'filterArticleId',
		type: 'string',
		default: '',
		description: 'Return stock for this article ID only',
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [warehouseStockFilterArticleIdPreSend],
			},
		},
	},

	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['list'],
			},
		},
	},

	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['get', 'list'],
			},
		},
	},

	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['warehouseStock'],
				operation: ['get', 'list'],
			},
		},
	},
];

// ─── warehouseStockMovement ──────────────────────────────────────────────────

export const warehouseStockMovementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
			},
		},
		options: [
			{
				name: 'Book Incoming Movement',
				value: 'bookIncomingMovement',
				description: 'Book an incoming stock movement (goods receipt)',
				action: 'Book incoming movement',
				routing: {
					request: {
						method: 'POST',
						url: '/warehouseStockMovement/bookIncomingMovement',
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
				name: 'Book Outgoing Movement',
				value: 'bookOutgoingMovement',
				description: 'Book an outgoing stock movement (goods issue)',
				action: 'Book outgoing movement',
				routing: {
					request: {
						method: 'POST',
						url: '/warehouseStockMovement/bookOutgoingMovement',
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
				description: 'Get a stock movement by ID',
				action: 'Get a warehouse stock movement',
				routing: {
					request: {
						method: 'GET',
						url: '=/warehouseStockMovement/id/{{$parameter["movementId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List warehouse stock movements',
				action: 'List warehouse stock movements',
				routing: {
					request: {
						method: 'GET',
						url: '/warehouseStockMovement',
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
		],
		default: 'list',
	},
];

export const warehouseStockMovementFields: INodeProperties[] = [
	{
		displayName: 'Movement ID',
		name: 'movementId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the warehouse stock movement',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['get'],
			},
		},
	},

	// Book Incoming: required fields
	{
		displayName: 'Article ID',
		name: 'articleId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the article to book',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookIncomingMovement'],
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
		displayName: 'Quantity',
		name: 'quantity',
		type: 'string',
		required: true,
		default: '',
		description: 'Quantity to book in (decimal string, e.g. "10.000")',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookIncomingMovement'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'quantity',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'incomingAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookIncomingMovement'],
			},
		},
		options: [
			{
				displayName: 'Batch Number',
				name: 'batchNumber',
				type: 'string',
				default: '',
				description: 'Batch or lot number for the stock movement',
				routing: {
					send: {
						type: 'body',
						property: 'batchNumber',
					},
				},
			},
			{
				displayName: 'Movement Note',
				name: 'movementNote',
				type: 'string',
				default: '',
				description: 'Free-text note attached to this movement',
				routing: {
					send: {
						type: 'body',
						property: 'movementNote',
					},
				},
			},
			{
				displayName: 'Target Storage Place ID',
				name: 'targetStoragePlaceId',
				type: 'string',
				default: '',
				description:
					'Storage place (bin/location) to receive goods into. The warehouse is inferred from the storage place.',
				routing: {
					send: {
						type: 'body',
						property: 'targetStoragePlaceId',
					},
				},
			},
		],
	},

	// Book Outgoing: required fields
	{
		displayName: 'Article ID',
		name: 'articleId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the article to book out',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookOutgoingMovement'],
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
		displayName: 'Quantity',
		name: 'quantity',
		type: 'string',
		required: true,
		default: '',
		description: 'Quantity to book out (decimal string, e.g. "10.000")',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookOutgoingMovement'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'quantity',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'outgoingAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['bookOutgoingMovement'],
			},
		},
		options: [
			{
				displayName: 'Batch Number',
				name: 'batchNumber',
				type: 'string',
				default: '',
				description: 'Batch or lot number for the stock movement',
				routing: {
					send: {
						type: 'body',
						property: 'batchNumber',
					},
				},
			},
			{
				displayName: 'Movement Note',
				name: 'movementNote',
				type: 'string',
				default: '',
				description: 'Free-text note attached to this movement',
				routing: {
					send: {
						type: 'body',
						property: 'movementNote',
					},
				},
			},
			{
				displayName: 'Source Storage Place ID',
				name: 'sourceStoragePlaceId',
				type: 'string',
				default: '',
				description:
					'Storage place (bin/location) to issue goods from. The warehouse is inferred from the storage place.',
				routing: {
					send: {
						type: 'body',
						property: 'sourceStoragePlaceId',
					},
				},
			},
		],
	},

	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},

	{
		displayName: 'Filter by Article',
		name: 'filterArticleId',
		type: 'string',
		default: '',
		description: 'Filter movements by article ID',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [movementFilterArticleIdPreSend],
			},
		},
	},
	{
		displayName: 'Filter by Warehouse',
		name: 'filterWarehouseId',
		type: 'string',
		default: '',
		description: 'Filter movements by warehouse ID',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [movementFilterWarehouseIdPreSend],
			},
		},
	},
	{
		displayName: 'Filter by Entry Date (From)',
		name: 'filterEntryDateFrom',
		type: 'string',
		default: '',
		description: 'Filter movements with entry date >= this value (Unix ms timestamp)',
		placeholder: 'e.g. 1704067200000',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [movementFilterEntryDateFromPreSend],
			},
		},
	},
	{
		displayName: 'Filter by Entry Date (To)',
		name: 'filterEntryDateTo',
		type: 'string',
		default: '',
		description: 'Filter movements with entry date <= this value (Unix ms timestamp)',
		placeholder: 'e.g. 1706745600000',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [movementFilterEntryDateToPreSend],
			},
		},
	},
	{
		displayName: 'Filter by Movement Type',
		name: 'filterMovementType',
		type: 'string',
		default: '',
		description:
			'Filter by stock movement type. Common values: IN, OUT, IN_PURCHASE_ORDER, OUT_PRODUCTION_ORDER, IN_TRANSFER, OUT_TRANSFER.',
		placeholder: 'e.g. IN',
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
		routing: {
			send: {
				preSend: [movementFilterMovementTypePreSend],
			},
		},
	},

	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['list'],
			},
		},
	},

	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['get', 'list'],
			},
		},
	},

	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['warehouseStockMovement'],
				operation: ['get', 'list'],
			},
		},
	},
];

// ─── Flat export ─────────────────────────────────────────────────────────────

export const warehouseDescription: INodeProperties[] = [
	...warehouseOperations,
	...warehouseFields,
	...warehouseStockOperations,
	...warehouseStockFields,
	...warehouseStockMovementOperations,
	...warehouseStockMovementFields,
];
