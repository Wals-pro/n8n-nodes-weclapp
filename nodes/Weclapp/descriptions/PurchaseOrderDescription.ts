import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFields,
	filtersCollection,
	returnAllOrLimit,
	simplifyField,
} from '../SharedFields';

export const purchaseOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['purchaseOrder'],
			},
		},
		options: [
			{
				name: 'Cancel Dropshipping Shipments',
				value: 'cancelDropshippingShipments',
				description: 'Cancel one or more dropshipping shipments and their corresponding incoming goods',
				action: 'Cancel dropshipping shipments for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/cancelDropshippingShipments',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new purchase order',
				action: 'Create a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '/purchaseOrder',
					},
				},
			},
			{
				name: 'Create Cancellation Slip PDF',
				value: 'createCancellationSlipPdf',
				description: 'Trigger generation of a cancellation slip PDF for the purchase order',
				action: 'Create cancellation slip PDF for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/createCancellationSlipPdf',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true, "id": $parameter["purchaseOrderId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Create Dropshipping Delivery Note PDF',
				value: 'createDropshippingDeliveryNotePdf',
				description: 'Create and return a dropshipping delivery note PDF as binary data',
				action: 'Create dropshipping delivery note PDF for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/createDropshippingDeliveryNotePdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: { destinationProperty: 'data' },
							},
						],
					},
				},
			},
			{
				name: 'Create Incoming Goods',
				value: 'createIncomingGoods',
				description: 'Create incoming goods from this purchase order',
				action: 'Create incoming goods for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/createIncomingGoods',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Create Purchase Invoice',
				value: 'createPurchaseInvoice',
				description: 'Create a purchase invoice from this purchase order',
				action: 'Create purchase invoice for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/createPurchaseInvoice',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Create Supplier Return',
				value: 'createSupplierReturn',
				description: 'Create a supplier return shipment from this purchase order',
				action: 'Create supplier return for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/createSupplierReturn',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a purchase order by ID',
				action: 'Delete a purchase order',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["purchaseOrderId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Latest Cancellation Slip PDF',
				value: 'downloadLatestCancellationSlipPdf',
				description: 'Download the latest cancellation slip PDF as binary data',
				action: 'Download latest cancellation slip PDF for a purchase order',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/downloadLatestCancellationSlipPdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: { destinationProperty: 'data' },
							},
						],
					},
				},
			},
			{
				name: 'Download Latest Dropshipping Delivery Note PDF',
				value: 'downloadLatestDropshippingDeliveryNotePdf',
				description: 'Download the latest dropshipping delivery note PDF as binary data',
				action: 'Download latest dropshipping delivery note PDF for a purchase order',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/downloadLatestDropshippingDeliveryNotePdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: { destinationProperty: 'data' },
							},
						],
					},
				},
			},
			{
				name: 'Download Latest Purchase Order PDF',
				value: 'downloadLatestPurchaseOrderPdf',
				description: 'Download the latest purchase order PDF as binary data',
				action: 'Download latest purchase order PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/downloadLatestPurchaseOrderPdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: { destinationProperty: 'data' },
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a specific purchase order by ID',
				action: 'Get a purchase order',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Retrieve a list of purchase orders',
				action: 'List purchase orders',
				routing: {
					request: {
						method: 'GET',
						url: '/purchaseOrder',
						qs: {
							pageSize: 1000,
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Print Label',
				value: 'printLabel',
				description: 'Print a label for purchase order items and return as binary data',
				action: 'Print label for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/printLabel',
						encoding: 'arraybuffer',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: { destinationProperty: 'data' },
							},
						],
					},
				},
			},
			{
				name: 'Process Dropshipping',
				value: 'processDropshipping',
				description: 'Process a dropshipping purchase order — creates incoming goods and shipment',
				action: 'Process dropshipping for a purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}/processDropshipping',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'result' },
							},
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing purchase order (PUT with ignoreMissingProperties=true)',
				action: 'Update a purchase order',
				routing: {
					request: {
						method: 'PUT',
						url: '=/purchaseOrder/id/{{$parameter["purchaseOrderId"]}}',
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

export const purchaseOrderFields: INodeProperties[] = [
	// ── Shared: Purchase Order ID (all single-record operations) ────────────
	{
		displayName: 'Purchase Order ID',
		name: 'purchaseOrderId',
		type: 'string',
		required: true,
		default: '',
		description: 'The unique ID of the purchase order',
		displayOptions: {
			show: {
				resource: ['purchaseOrder'],
				operation: [
					'cancelDropshippingShipments',
					'createCancellationSlipPdf',
					'createDropshippingDeliveryNotePdf',
					'createIncomingGoods',
					'createPurchaseInvoice',
					'createSupplierReturn',
					'delete',
					'downloadLatestCancellationSlipPdf',
					'downloadLatestDropshippingDeliveryNotePdf',
					'downloadLatestPurchaseOrderPdf',
					'get',
					'printLabel',
					'processDropshipping',
					'update',
				],
			},
		},
	},

	// ── List: Return All / Limit ─────────────────────────────────────────────
	...returnAllOrLimit.map((field) => ({
		...field,
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
	})),

	// ── List: Filterable fields ──────────────────────────────────────────────
	{
		displayName: 'Filter by Currency ID',
		name: 'recordCurrencyIdFilter',
		type: 'string',
		default: '',
		description: 'Filter by currency ID (recordCurrencyId-eq)',
		placeholder: 'e.g. EUR',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'recordCurrencyId-eq': '={{$value || undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Filter by Order Date (From)',
		name: 'orderDateFrom',
		type: 'dateTime',
		default: '',
		description: 'Return orders with orderDate greater than or equal to this date (orderDate-ge)',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'orderDate-ge': '={{$value ? new Date($value).getTime() : undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Filter by Order Date (To)',
		name: 'orderDateTo',
		type: 'dateTime',
		default: '',
		description: 'Return orders with orderDate less than or equal to this date (orderDate-le)',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'orderDate-le': '={{$value ? new Date($value).getTime() : undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Filter by Order Number',
		name: 'orderNumberFilter',
		type: 'string',
		default: '',
		description: 'Filter by exact order number (orderNumber-eq)',
		placeholder: 'e.g. PO-2024-001',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'orderNumber-eq': '={{$value || undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Filter by Recipient ID',
		name: 'recipientIdFilter',
		type: 'string',
		default: '',
		description: 'Filter by recipient (supplier) party ID (recipientId-eq)',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'recipientId-eq': '={{$value || undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Filter by Status',
		name: 'statusFilter',
		type: 'options',
		default: '',
		description: 'Filter by purchase order status',
		options: [
			{ name: '(All)', value: '' },
			{ name: 'Cancelled', value: 'CANCELLED' },
			{ name: 'Confirmed', value: 'CONFIRMED' },
			{ name: 'In Process', value: 'IN_PROCESS' },
			{ name: 'New', value: 'NEW' },
			{ name: 'Order Confirmation Printed', value: 'ORDER_CONFIRMATION_PRINTED' },
			{ name: 'Order Entry Completed', value: 'ORDER_ENTRY_COMPLETED' },
			{ name: 'Order Entry In Progress', value: 'ORDER_ENTRY_IN_PROGRESS' },
			{ name: 'Partly Received', value: 'PARTLY_RECEIVED' },
			{ name: 'Received', value: 'RECEIVED' },
		],
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
		routing: {
			request: {
				qs: {
					'status-eq': '={{$value || undefined}}',
				},
			},
		},
	},

	// ── List: General filters collection ────────────────────────────────────
	{
		...filtersCollection,
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['list'] } },
	},

	// ── List / Get: Simplify ─────────────────────────────────────────────────
	{
		...simplifyField,
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['get', 'list'] } },
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{$parameter["simplify"]}}',
						properties: {
							id: '={{$responseItem.id}}',
							orderNumber: '={{$responseItem.orderNumber}}',
							status: '={{$responseItem.status}}',
							orderDate: '={{$responseItem.orderDate}}',
							grossAmount: '={{$responseItem.grossAmount}}',
							recipientId: '={{$responseItem.recipientId}}',
							version: '={{$responseItem.version}}',
						},
					},
				],
			},
		},
	},

	// ── List / Get: Additional Fields ────────────────────────────────────────
	{
		...additionalFields,
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['get', 'list'] } },
	},

	// ── Create: Request Body ─────────────────────────────────────────────────
	{
		displayName: 'Purchase Order Data',
		name: 'purchaseOrderData',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'JSON body for the new purchase order. Include at minimum recipientId and purchase order items.',
		placeholder:
			'{"recipientId": "123", "purchaseOrderItems": [{"articleId": "456", "quantity": "10"}]}',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['create'] } },
		routing: {
			request: {
				body: '={{JSON.parse($value)}}',
			},
		},
	},

	// ── Update: Request Body ─────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'JSON fields to update on the purchase order. Uses PUT with ignoreMissingProperties=true so only provided fields are changed.',
		placeholder: '{"status": "CONFIRMED"}',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['update'] } },
		routing: {
			request: {
				body: '={{JSON.parse($value)}}',
			},
		},
	},

	// ── cancelDropshippingShipments: shipmentIds ─────────────────────────────
	{
		displayName: 'Shipment IDs',
		name: 'shipmentIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of shipment IDs to cancel',
		placeholder: 'e.g. 111,222,333',
		displayOptions: {
			show: { resource: ['purchaseOrder'], operation: ['cancelDropshippingShipments'] },
		},
		routing: {
			request: {
				body: '={{ { shipmentIds: $value.split(",").map(s => s.trim()).filter(s => s) } }}',
			},
		},
	},

	// ── createIncomingGoods: optional additional order IDs ───────────────────
	{
		displayName: 'Additional Purchase Order IDs',
		name: 'additionalPurchaseOrderIds',
		type: 'string',
		default: '',
		description:
			'Optional comma-separated list of additional purchase order IDs to combine into one incoming goods record',
		displayOptions: {
			show: { resource: ['purchaseOrder'], operation: ['createIncomingGoods'] },
		},
		routing: {
			request: {
				body: '={{ $value ? { additionalPurchaseOrderIds: $value.split(",").map(s => s.trim()).filter(s => s) } : {} }}',
			},
		},
	},

	// ── createPurchaseInvoice: invoice fields ─────────────────────────────────
	// invoiceDate and invoiceNumber carry no routing — they are picked up by invoiceType's
	// body expression, which always runs because invoiceType has a non-empty default.
	{
		displayName: 'Invoice Date',
		name: 'invoiceDate',
		type: 'dateTime',
		default: '',
		description: 'Date of the supplier invoice (defaults to today if not set)',
		displayOptions: {
			show: { resource: ['purchaseOrder'], operation: ['createPurchaseInvoice'] },
		},
	},
	{
		displayName: 'Invoice Number',
		name: 'invoiceNumber',
		type: 'string',
		default: '',
		description: 'Invoice number assigned by the supplier',
		displayOptions: {
			show: { resource: ['purchaseOrder'], operation: ['createPurchaseInvoice'] },
		},
	},
	{
		displayName: 'Invoice Type',
		name: 'invoiceType',
		type: 'options',
		default: 'STANDARD_INVOICE',
		description: 'Type of purchase invoice to create',
		options: [
			{ name: 'Advance Payment Invoice', value: 'ADVANCE_PAYMENT_INVOICE' },
			{ name: 'Credit Advice', value: 'CREDIT_ADVICE' },
			{ name: 'Credit Note', value: 'CREDIT_NOTE' },
			{ name: 'Final Invoice', value: 'FINAL_INVOICE' },
			{ name: 'Part Payment Invoice', value: 'PART_PAYMENT_INVOICE' },
			{ name: 'Prepayment Invoice', value: 'PREPAYMENT_INVOICE' },
			{ name: 'Standard Invoice', value: 'STANDARD_INVOICE' },
		],
		displayOptions: {
			show: { resource: ['purchaseOrder'], operation: ['createPurchaseInvoice'] },
		},
		routing: {
			request: {
				body: '={{ { invoiceNumber: $parameter["invoiceNumber"] || undefined, invoiceDate: $parameter["invoiceDate"] ? new Date($parameter["invoiceDate"]).getTime() : undefined, invoiceType: $value } }}',
			},
		},
	},

	// ── printLabel: required fields ───────────────────────────────────────────
	{
		displayName: 'Label Quantity Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ONLY_ONE_LABEL_PER_ITEM',
		description: 'Controls how many labels are printed per item',
		options: [
			{ name: 'Item Quantity', value: 'ITEM_QUANTITY' },
			{ name: 'One Label per Booking Record', value: 'ONLY_ONE_LABEL_PER_BOOKING_RECORD' },
			{ name: 'One Label per Item', value: 'ONLY_ONE_LABEL_PER_ITEM' },
		],
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['printLabel'] } },
		routing: {
			request: {
				body: '={{ { itemLabelQuantityPrintSetting: $value, purchaseOrderItemIds: $parameter["purchaseOrderItemIds"] ? $parameter["purchaseOrderItemIds"].split(",").map(s => s.trim()).filter(s => s) : undefined } }}',
			},
		},
	},
	{
		displayName: 'Purchase Order Item IDs',
		name: 'purchaseOrderItemIds',
		type: 'string',
		default: '',
		description:
			'Optional comma-separated list of purchase order item IDs to print labels for (prints labels for all items if not set)',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['printLabel'] } },
	},

	// ── processDropshipping: optional body ────────────────────────────────────
	{
		displayName: 'Process Options',
		name: 'processDropshippingOptions',
		type: 'json',
		default: '{}',
		description:
			'Optional JSON body for processDropshipping. Can include processPurchaseOrderItems (array of {purchaseOrderItemId, quantity}) and shipmentParameters ({deliveryDate, deliveryNoteNumber, shippingDate}).',
		placeholder:
			'{"processPurchaseOrderItems": [{"purchaseOrderItemId": "123", "quantity": "5"}]}',
		displayOptions: { show: { resource: ['purchaseOrder'], operation: ['processDropshipping'] } },
		routing: {
			request: {
				body: '={{JSON.parse($value)}}',
			},
		},
	},
];
