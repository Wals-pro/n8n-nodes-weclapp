import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, sortCollection, listLimitFields, listPaginationRouting, simplifyField } from '../SharedFields';
import { mergeAdditionalProperties, simplifyPostReceive } from '../GenericFunctions';

// ---------------------------------------------------------------------------
// Shipment Operations
// ---------------------------------------------------------------------------

export const shipmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['shipment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new shipment',
				action: 'Create a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '/shipment',
					},
				},
			},
			{
				name: 'Create Picking List (PDF)',
				value: 'createPickingList',
				description: 'Generate a picking list PDF for the shipment',
				action: 'Create picking list PDF for a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/createPickingList',
						encoding: 'arraybuffer',
						returnFullResponse: true,
						// body as string '{}' forces axios to send Content-Length: 2
						// (empty object body {} is stripped by isObjectEmpty check in convertN8nRequestToAxios)
						body: '{}',
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
				name: 'Create Return Labels',
				value: 'createReturnLabels',
				description: 'Create return shipping labels for the shipment',
				action: 'Create return labels for a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/createReturnLabels',
						body: '{}',
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
				name: 'Create Sales Invoice',
				value: 'createSalesInvoice',
				description: 'Create a sales invoice from the shipment',
				action: 'Create sales invoice from a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/createSalesInvoice',
						body: '{}',
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
				name: 'Create Shipping Labels',
				value: 'createShippingLabels',
				description: 'Generate shipping labels (optionally for specific parcel IDs)',
				action: 'Create shipping labels for a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/createShippingLabels',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a shipment by ID',
				action: 'Delete a shipment',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["shipmentId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Delivery Note PDF',
				value: 'downloadLatestDeliveryNotePdf',
				description: 'Download the latest delivery note PDF for the shipment',
				action: 'Download delivery note PDF for a shipment',
				routing: {
					request: {
						method: 'GET',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/downloadLatestDeliveryNotePdf',
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
				name: 'Download Picking List PDF',
				value: 'downloadLatestPickingListPdf',
				description: 'Download the latest picking list PDF for the shipment',
				action: 'Download picking list PDF for a shipment',
				routing: {
					request: {
						method: 'GET',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/downloadLatestPickingListPdf',
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
				name: 'Download Shipping Label PDF',
				value: 'downloadLatestShippingLabelPdf',
				description: 'Download the latest shipping label PDF for the shipment',
				action: 'Download shipping label PDF for a shipment',
				routing: {
					request: {
						method: 'GET',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/downloadLatestShippingLabelPdf',
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
				description: 'Retrieve a shipment by ID',
				action: 'Get a shipment',
				routing: {
					request: {
						method: 'GET',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}',
					},
					output: {
						postReceive: [simplifyPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'Return a list of shipments',
				action: 'Get many shipments',
				routing: {
					...listPaginationRouting,
					request: {
						method: 'GET',
						url: '/shipment',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'result',
								},
							},
							mergeAdditionalProperties,
							simplifyPostReceive,
						],
					},
				},
			},
			{
				name: 'Print Label (PDF)',
				value: 'printLabel',
				description: 'Print item labels as a PDF for the shipment',
				action: 'Print labels for a shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}/printLabel',
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
				name: 'Update',
				value: 'update',
				description: 'Update an existing shipment by ID',
				action: 'Update a shipment',
				routing: {
					request: {
						method: 'PUT',
						url: '=/shipment/id/{{$parameter["shipmentId"]}}',
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
// Shipment Fields
// ---------------------------------------------------------------------------

export const shipmentFields: INodeProperties[] = [
	// ── Shared: Shipment resource locator ──────────────────────────────────
	{
		displayName: 'Shipment',
		name: 'shipmentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The shipment to operate on',
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: [
					'get',
					'update',
					'delete',
					'createPickingList',
					'createReturnLabels',
					'createSalesInvoice',
					'createShippingLabels',
					'downloadLatestDeliveryNotePdf',
					'downloadLatestPickingListPdf',
					'downloadLatestShippingLabelPdf',
					'printLabel',
				],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchShipments',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 1234567890',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Shipment ID must be numeric',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://tenant.weclapp.com/webapp/api/v2/shipment/id/1234567890',
				extractValue: {
					type: 'regex',
					regex: '/shipment/id/([0-9]+)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '/shipment/id/[0-9]+',
							errorMessage: 'URL must contain /shipment/id/{id}',
						},
					},
				],
			},
		],
	},

	// ── List: Limit ────────────────────────────────────────────────────────
	...listLimitFields('shipment'),

	// ── List / Get / Create / Update: Simplify ────────────────────────────
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['get', 'list', 'create', 'update'],
			},
		},
	},

	// ── List: Filters ──────────────────────────────────────────────────────
	{
		...sortCollection,
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['list'],
			},
		},
	},
	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['list'],
			},
		},
	},

	// ── List / Get: Additional Fields ──────────────────────────────────────
	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['list', 'get'],
			},
		},
	},

	// ── Create / Update: Body ─────────────────────────────────────────────
	{
		displayName: 'Shipment Data',
		name: 'body',
		type: 'json',
		default: '{}',
		description: 'Shipment fields to set as a JSON object. For update, only the fields you want to change are required.',
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			request: {
				body: '={{ JSON.parse($value) }}',
			},
		},
	},

	// ── createShippingLabels: Optional parcel IDs ─────────────────────────
	{
		displayName: 'Parcel IDs',
		name: 'parcelIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of parcel IDs to generate labels for. Leave empty to generate labels for all parcels.',
		placeholder: 'e.g. parcel-1,parcel-2',
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['createShippingLabels'],
			},
		},
		routing: {
			request: {
				body: '={{ $value ? { parcelIds: $value.split(",").map(s => s.trim()).filter(Boolean) } : {} }}',
			},
		},
	},

	// ── printLabel: Required body fields ──────────────────────────────────
	{
		displayName: 'Label Quantity Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ITEM_QUANTITY',
		description: 'Controls how many labels are printed per item',
		options: [
			{
				name: 'Item Quantity (One Label per Unit)',
				value: 'ITEM_QUANTITY',
			},
			{
				name: 'Only One Label per Booking Record',
				value: 'ONLY_ONE_LABEL_PER_BOOKING_RECORD',
			},
			{
				name: 'Only One Label per Item',
				value: 'ONLY_ONE_LABEL_PER_ITEM',
			},
		],
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					itemLabelQuantityPrintSetting: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Shipment Item IDs',
		name: 'shipmentItemIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of shipment item IDs to print labels for. Leave empty to print labels for all items.',
		placeholder: 'e.g. item-1,item-2',
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					shipmentItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},

];
// Binary PDF download operations store their output in the 'data' binary property.
