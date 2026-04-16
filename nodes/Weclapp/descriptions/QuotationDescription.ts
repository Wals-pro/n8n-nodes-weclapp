import type { INodeProperties } from 'n8n-workflow';

import { filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ─────────────────────────────────────────────────────────────────────────────
// Operation selector
// ─────────────────────────────────────────────────────────────────────────────

export const quotationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quotation'],
			},
		},
		// Alphabetical by name — required by n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Accept',
				value: 'accept',
				description: 'Accept a quotation and trigger downstream processing',
				action: 'Accept a quotation',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/accept',
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
				name: 'Add Default Scale Prices to Items',
				value: 'addDefaultScalePricesToItems',
				description: 'Add default scale prices to specified quotation items',
				action: 'Add default scale prices to items',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/addDefaultScalePricesToItems',
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
				name: 'Calculate Sales Prices',
				value: 'calculateSalesPrices',
				description: 'Calculate sales prices for quotation items based on costs',
				action: 'Calculate sales prices',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/calculateSalesPrices',
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
				name: 'Create',
				value: 'create',
				description: 'Create a new quotation',
				action: 'Create a quotation',
				routing: {
					request: {
						method: 'POST',
						url: '/quotation',
					},
				},
			},
			{
				name: 'Create New Version',
				value: 'createNewVersion',
				description: 'Create a new version of the quotation',
				action: 'Create new version',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/createNewVersion',
						body: {},
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
				name: 'Create Public Page Link',
				value: 'createPublicPageLink',
				description: 'Generate a public shareable link for the quotation',
				action: 'Create public page link',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/createPublicPageLink',
						body: {},
					},
				},
			},
			{
				name: 'Create Purchase Order Request',
				value: 'createPurchaseOrderRequest',
				description: 'Create a purchase order request from the quotation',
				action: 'Create purchase order request',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/createPurchaseOrderRequest',
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
				name: 'Create Quotation PDF',
				value: 'createQuotationPdf',
				description: 'Generate and download the quotation PDF',
				action: 'Create quotation PDF',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/createQuotationPdf',
						body: {},
						encoding: 'arraybuffer',
						returnFullResponse: true,
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a quotation by ID',
				action: 'Delete a quotation',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/quotation/id/{{$parameter["quotationId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["quotationId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Disable Public Page Link',
				value: 'disablePublicPageLink',
				description: 'Disable the public shareable link for the quotation',
				action: 'Disable public page link',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/disablePublicPageLink',
						body: {},
					},
				},
			},
			{
				name: 'Download Latest Quotation PDF',
				value: 'downloadLatestQuotationPdf',
				description: 'Download the latest generated quotation PDF',
				action: 'Download latest quotation PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/downloadLatestQuotationPdf',
						encoding: 'arraybuffer',
						returnFullResponse: true,
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
				description: 'Retrieve a quotation by ID',
				action: 'Get a quotation',
				routing: {
					request: {
						method: 'GET',
						url: '=/quotation/id/{{$parameter["quotationId"]}}',
					},
				},
			},
			{
				name: 'Inquire',
				value: 'inquire',
				description: 'Send an inquiry for the quotation',
				action: 'Inquire quotation',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/inquire',
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
				name: 'List',
				value: 'list',
				description: 'Retrieve a list of quotations',
				action: 'List quotations',
				routing: {
					request: {
						method: 'GET',
						url: '/quotation',
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
				name: 'Print Label',
				value: 'printLabel',
				description: 'Print item labels for quotation items',
				action: 'Print label',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/printLabel',
						encoding: 'arraybuffer',
						returnFullResponse: true,
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
				name: 'Print Quotation Data',
				value: 'printQuotationData',
				description: 'Download printable quotation data (requires workflow option to be enabled)',
				action: 'Print quotation data',
				routing: {
					request: {
						method: 'GET',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/printQuotationData',
						encoding: 'arraybuffer',
						returnFullResponse: true,
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
				name: 'Recalculate Costs',
				value: 'recalculateCosts',
				description: 'Recalculate item costs for the quotation based on current purchase prices',
				action: 'Recalculate costs',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/recalculateCosts',
						body: {},
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
				name: 'Reset Taxes',
				value: 'resetTaxes',
				description: 'Reset taxes to default for all quotation items',
				action: 'Reset taxes',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/resetTaxes',
						body: {},
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
				name: 'Set Costs for Items Without Cost',
				value: 'setCostsForItemsWithoutCost',
				description: 'Set unit cost for all quotation items that currently have no cost',
				action: 'Set costs for items without cost',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/setCostsForItemsWithoutCost',
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
				description: 'Update a quotation by ID',
				action: 'Update a quotation',
				routing: {
					request: {
						method: 'PUT',
						url: '=/quotation/id/{{$parameter["quotationId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
			{
				name: 'Update Prices',
				value: 'updatePrices',
				description: 'Update prices for all items in the quotation from current price lists',
				action: 'Update prices',
				routing: {
					request: {
						method: 'POST',
						url: '=/quotation/id/{{$parameter["quotationId"]}}/updatePrices',
						body: {},
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

// ─────────────────────────────────────────────────────────────────────────────
// Fields
// ─────────────────────────────────────────────────────────────────────────────

export const quotationFields: INodeProperties[] = [
	// ── Quotation ID (required for all single-record operations) ─────────────

	{
		displayName: 'Quotation ID',
		name: 'quotationId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the quotation to operate on',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: [
					'accept',
					'addDefaultScalePricesToItems',
					'calculateSalesPrices',
					'createNewVersion',
					'createPublicPageLink',
					'createPurchaseOrderRequest',
					'createQuotationPdf',
					'delete',
					'disablePublicPageLink',
					'downloadLatestQuotationPdf',
					'get',
					'inquire',
					'printLabel',
					'printQuotationData',
					'recalculateCosts',
					'resetTaxes',
					'setCostsForItemsWithoutCost',
					'update',
					'updatePrices',
				],
			},
		},
	},

	// ── List: Return All / Limit ──────────────────────────────────────────────

	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['list'],
				returnAll: [false],
			},
		},
		routing: {
			request: {
				qs: {
					pageSize: '={{$value}}',
				},
			},
		},
	},

	// ── List: Pagination (return all mode) ───────────────────────────────────

	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'hidden',
		default: 1000,
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['list'],
				returnAll: [true],
			},
		},
		routing: {
			request: {
				qs: {
					pageSize: 1000,
				},
			},
			send: {
				paginate: true,
			},
		},
	},

	// ── List: Quick Filters (commonly needed fields) ──────────────────────────

	{
		displayName: 'Quick Filters',
		name: 'quickFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				description: 'Filter by customer ID',
				routing: {
					request: {
						qs: {
							'customerId-eq': '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Quotation Date From',
				name: 'quotationDateFrom',
				type: 'string',
				default: '',
				description: 'Filter quotations with date >= this value (milliseconds epoch or ISO 8601)',
				placeholder: 'e.g. 1704067200000',
				routing: {
					request: {
						qs: {
							'quotationDate-ge': '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Quotation Date To',
				name: 'quotationDateTo',
				type: 'string',
				default: '',
				description: 'Filter quotations with date <= this value (milliseconds epoch or ISO 8601)',
				placeholder: 'e.g. 1735689600000',
				routing: {
					request: {
						qs: {
							'quotationDate-le': '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Quotation Number',
				name: 'quotationNumber',
				type: 'string',
				default: '',
				description: 'Filter by exact quotation number',
				routing: {
					request: {
						qs: {
							'quotationNumber-eq': '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Record Currency ID',
				name: 'recordCurrencyId',
				type: 'string',
				default: '',
				description: 'Filter by currency ID',
				routing: {
					request: {
						qs: {
							'recordCurrencyId-eq': '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				description: 'Filter by quotation status',
				options: [
					{ name: '(Any)', value: '' },
					{ name: 'Accepted', value: 'ACCEPTED' },
					{ name: 'Cancelled', value: 'CANCELLED' },
					{ name: 'Inquiry', value: 'INQUIRY' },
					{ name: 'New', value: 'NEW' },
					{ name: 'Offer Sent', value: 'OFFER_SENT' },
					{ name: 'Ordered', value: 'ORDERED' },
					{ name: 'Rejected', value: 'REJECTED' },
				],
				routing: {
					request: {
						qs: {
							'status-eq': '={{$value || undefined}}',
						},
					},
				},
			},
		],
	},

	// ── List: Advanced Filters (generic operator UI) ──────────────────────────

	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['list'],
			},
		},
	},

	// ── List/Get: Simplify ────────────────────────────────────────────────────

	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['get', 'list'],
			},
		},
	},

	// ── Create: Request Body ──────────────────────────────────────────────────

	{
		displayName: 'Quotation Data',
		name: 'quotationData',
		type: 'json',
		required: true,
		default: '{}',
		description: 'JSON body of the quotation to create. See weclapp API docs for the full schema.',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: '={{JSON.parse($value)}}',
			},
		},
	},

	// ── Update: Request Body ──────────────────────────────────────────────────

	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'JSON object with the fields to update (uses ignoreMissingProperties=true — only listed fields are updated)',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['update'],
			},
		},
		routing: {
			request: {
				body: '={{JSON.parse($value)}}',
			},
		},
	},

	// ── Accept: Optional Items ────────────────────────────────────────────────

	{
		displayName: 'Accept Options',
		name: 'acceptOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'Optional parameters for accepting the quotation',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['accept'],
			},
		},
		options: [
			{
				displayName: 'Accept Quotation Items (JSON)',
				name: 'acceptQuotationItems',
				type: 'json',
				default: '[]',
				description:
					'Array of items to accept with specific quantities. Each item needs quotationItemId and quantity. Leave empty to accept all items.',
				placeholder: '[{"quotationItemId":"123","quantity":"5"}]',
				routing: {
					request: {
						body: {
							acceptQuotationItems: '={{JSON.parse($value)}}',
						},
					},
				},
			},
		],
	},

	// ── addDefaultScalePricesToItems: Required itemIds ────────────────────────

	{
		displayName: 'Item IDs',
		name: 'itemIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'Comma-separated list of quotation item IDs to add scale prices to (e.g. 123,456,789)',
		placeholder: 'e.g. 123456,789012',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['addDefaultScalePricesToItems'],
			},
		},
		routing: {
			request: {
				body: {
					itemIds: '={{$value.split(",").map(id => id.trim()).filter(Boolean)}}',
				},
			},
		},
	},

	// ── calculateSalesPrices: Required fields ─────────────────────────────────

	{
		displayName: 'Calculation Mode',
		name: 'calculationMode',
		type: 'options',
		required: true,
		default: 'COST_SURCHARGE',
		description: 'How to calculate the new sales prices for quotation items',
		options: [
			{
				name: 'Cost Surcharge',
				value: 'COST_SURCHARGE',
				description: 'Net price = purchase costs + purchase costs x surcharge / 100',
			},
			{
				name: 'Target Margin',
				value: 'TARGET_MARGIN',
				description: 'Net price = purchase costs x 100 / (100 - target margin)',
			},
		],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					calculationMode: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Percentage',
		name: 'percentage',
		type: 'string',
		required: true,
		default: '',
		description:
			'Surcharge percentage (for Cost Surcharge mode) or target margin percentage (for Target Margin mode)',
		placeholder: 'e.g. 10.5',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					percentage: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Quotation Item IDs (Optional)',
		name: 'calculateItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of item IDs to calculate prices for. Leave empty to calculate for all items.',
		placeholder: 'e.g. 123456,789012',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					quotationItemIds:
						'={{$value ? $value.split(",").map(id => id.trim()).filter(Boolean) : undefined}}',
				},
			},
		},
	},

	// ── createPurchaseOrderRequest: Required fields ───────────────────────────

	{
		displayName: 'Request Type',
		name: 'requestType',
		type: 'options',
		required: true,
		default: 'PURCHASE_ORDER_REQUEST',
		description: 'The type of purchase order request to create',
		options: [
			{ name: 'Blanket Order Request', value: 'BLANKET_ORDER_REQUEST' },
			{ name: 'Blanket Purchase Order Request', value: 'BLANKET_PURCHASE_ORDER_REQUEST' },
			{ name: 'Drop Shipping Request', value: 'DROP_SHIPPING_REQUEST' },
			{ name: 'Purchase Order Request', value: 'PURCHASE_ORDER_REQUEST' },
			{ name: 'Sales Order Commission Request', value: 'SALES_ORDER_COMMISSION_REQUEST' },
		],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					requestType: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the warehouse to use for the purchase order request',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					warehouseId: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Purchase Order Request Options',
		name: 'purchaseOrderRequestOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		options: [
			{
				displayName: 'Merge Items',
				name: 'mergeItems',
				type: 'boolean',
				default: false,
				description:
					'Whether to merge items with the same article (only valid when Use Item Quantity is true)',
				routing: {
					request: {
						body: {
							mergeItems: '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Quotation Item IDs (JSON)',
				name: 'quotationItemIds',
				type: 'json',
				default: '[]',
				description:
					'Array of quotation item IDs to include. Leave empty to include all quotation items.',
				routing: {
					request: {
						body: {
							quotationItemIds: '={{JSON.parse($value)}}',
						},
					},
				},
			},
			{
				displayName: 'Supplier IDs (JSON)',
				name: 'supplierIds',
				type: 'json',
				default: '[]',
				description: 'Array of supplier IDs to restrict the purchase order request to',
				routing: {
					request: {
						body: {
							supplierIds: '={{JSON.parse($value)}}',
						},
					},
				},
			},
			{
				displayName: 'Use Item Quantity',
				name: 'useItemQuantity',
				type: 'boolean',
				default: false,
				description:
					'Whether to use the quotation item quantity (only valid for PURCHASE_ORDER_REQUEST and BLANKET_ORDER_REQUEST types)',
				routing: {
					request: {
						body: {
							useItemQuantity: '={{$value}}',
						},
					},
				},
			},
		],
	},

	// ── inquire: Optional taskId ──────────────────────────────────────────────

	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		description: 'Optional task ID to associate with the inquiry',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['inquire'],
			},
		},
		routing: {
			request: {
				body: {
					taskId: '={{$value || undefined}}',
				},
			},
		},
	},

	// ── printLabel: Required field ────────────────────────────────────────────

	{
		displayName: 'Item Label Quantity Print Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ONLY_ONE_LABEL_PER_ITEM',
		description: 'How many labels to print per item',
		options: [
			{
				name: 'Item Quantity',
				value: 'ITEM_QUANTITY',
				description: 'Print one label per unit of quantity',
			},
			{
				name: 'Only One Label per Booking Record',
				value: 'ONLY_ONE_LABEL_PER_BOOKING_RECORD',
				description: 'Print one label per booking record',
			},
			{
				name: 'Only One Label per Item',
				value: 'ONLY_ONE_LABEL_PER_ITEM',
				description: 'Print exactly one label per line item',
			},
		],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					itemLabelQuantityPrintSetting: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Quotation Item IDs (Optional)',
		name: 'printLabelItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of quotation item IDs to print labels for. Leave empty for all items.',
		placeholder: 'e.g. 123456,789012',
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					quotationItemIds:
						'={{$value ? $value.split(",").map(id => id.trim()).filter(Boolean) : undefined}}',
				},
			},
		},
	},

	// ── setCostsForItemsWithoutCost: Required field ───────────────────────────

	{
		displayName: 'Cost Update Mode',
		name: 'costUpdateMode',
		type: 'options',
		required: true,
		default: 'SET_TO_NET_UNIT_PRICE',
		description: 'How to set the unit cost for items that currently have no cost',
		options: [
			{
				name: 'Set to Net Unit Price',
				value: 'SET_TO_NET_UNIT_PRICE',
				description:
					'Sets unitCost to the net unit price derived from the item price (accounting for tax if gross)',
			},
			{
				name: 'Set to Zero',
				value: 'SET_TO_ZERO',
				description: 'Sets unitCost to zero',
			},
		],
		displayOptions: {
			show: {
				resource: ['quotation'],
				operation: ['setCostsForItemsWithoutCost'],
			},
		},
		routing: {
			request: {
				body: {
					costUpdateMode: '={{$value}}',
				},
			},
		},
	},
];
