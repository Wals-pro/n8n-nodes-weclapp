import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

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
						body: {},
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
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
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
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
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
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
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
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
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Return a list of shipments',
				action: 'List shipments',
				routing: {
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
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
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
	// ── Shared: Shipment ID ────────────────────────────────────────────────
	{
		displayName: 'Shipment ID',
		name: 'shipmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the shipment',
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
	},

	// ── List: Return All / Limit ───────────────────────────────────────────
	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['shipment'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					pageSize: 1000,
				},
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['shipment'],
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
