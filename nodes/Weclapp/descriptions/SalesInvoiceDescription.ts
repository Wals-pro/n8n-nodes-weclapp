import type { INodeProperties } from 'n8n-workflow';

import { filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ---------------------------------------------------------------------------
// Operations (alphabetized by name — required by linter)
// ---------------------------------------------------------------------------

export const salesInvoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
			},
		},
		options: [
			{
				name: 'Add Sales Orders',
				value: 'addSalesOrders',
				description: 'Attach one or more sales orders to this sales invoice',
				action: 'Add sales orders to a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/addSalesOrders',
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
				description: 'Recalculate item sales prices using cost-surcharge or target-margin mode',
				action: 'Calculate sales prices on a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/calculateSalesPrices',
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
				description: 'Create a new sales invoice',
				action: 'Create a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '/salesInvoice',
					},
				},
			},
			{
				name: 'Create Credit Note',
				value: 'createCreditNote',
				description: 'Create a credit note for this sales invoice (optionally for specific items)',
				action: 'Create credit note from a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/createCreditNote',
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
				name: 'Create Credit Note Open Item',
				value: 'createCreditNoteOpenItem',
				description: 'Create an open-item credit note for this sales invoice',
				action: 'Create credit note open item from a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/createCreditNoteOpenItem',
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
				description: 'Delete a sales invoice by ID',
				action: 'Delete a sales invoice',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter.salesInvoiceId } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download PDF',
				value: 'downloadLatestSalesInvoicePdf',
				description: 'Download the latest PDF for this sales invoice as binary data',
				action: 'Download sales invoice PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/downloadLatestSalesInvoicePdf',
						returnFullResponse: true,
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
				description: 'Retrieve a sales invoice by ID',
				action: 'Get a sales invoice',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Retrieve a list of sales invoices',
				action: 'List sales invoices',
				routing: {
					request: {
						method: 'GET',
						url: '/salesInvoice',
						qs: {
							pageSize: 1000,
						},
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
				description: 'Generate a label PDF for items on this sales invoice',
				action: 'Print label for a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/printLabel',
						returnFullResponse: true,
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
				name: 'Recalculate Costs',
				value: 'recalculateCosts',
				description: 'Recalculate costs for all items on this sales invoice from current sources',
				action: 'Recalculate costs on a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/recalculateCosts',
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
				description: 'Reset item taxes to their defaults on this sales invoice',
				action: 'Reset taxes on a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/resetTaxes',
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
				description: 'Set unit costs for all sales invoice items that currently have no unit cost',
				action: 'Set costs for items without cost on a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/setCostsForItemsWithoutCost',
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
				description: 'Update a sales invoice by ID (PUT with ignoreMissingProperties=true)',
				action: 'Update a sales invoice',
				routing: {
					request: {
						method: 'PUT',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
			{
				name: 'Update Prices',
				value: 'updatePrices',
				description: 'Refresh article prices on this sales invoice from current price lists',
				action: 'Update prices on a sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesInvoice/id/{{ $parameter.salesInvoiceId }}/updatePrices',
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

// ---------------------------------------------------------------------------
// Shared field: Sales Invoice ID (used by all non-list operations)
// ---------------------------------------------------------------------------

const salesInvoiceIdField: INodeProperties = {
	displayName: 'Sales Invoice ID',
	name: 'salesInvoiceId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the sales invoice to operate on',
	displayOptions: {
		show: {
			resource: ['salesInvoice'],
			operation: [
				'addSalesOrders',
				'calculateSalesPrices',
				'createCreditNote',
				'createCreditNoteOpenItem',
				'delete',
				'downloadLatestSalesInvoicePdf',
				'get',
				'printLabel',
				'recalculateCosts',
				'resetTaxes',
				'setCostsForItemsWithoutCost',
				'update',
				'updatePrices',
			],
		},
	},
};

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

export const salesInvoiceFields: INodeProperties[] = [
	salesInvoiceIdField,

	// ── List: returnAll / limit ───────────────────────────────────────────────

	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
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

	// ── List: quick-filter fields ─────────────────────────────────────────────

	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		description: 'Filter by customer ID',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'customerId-eq': '={{ $value || undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Due Date (From)',
		name: 'dueDateFrom',
		type: 'dateTime',
		default: '',
		description: 'Filter invoices with dueDate on or after this date',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'dueDate-ge': '={{ $value ? new Date($value).getTime() : undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Invoice Date (From)',
		name: 'invoiceDateFrom',
		type: 'dateTime',
		default: '',
		description: 'Filter invoices with invoiceDate on or after this date',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'invoiceDate-ge': '={{ $value ? new Date($value).getTime() : undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Invoice Date (To)',
		name: 'invoiceDateTo',
		type: 'dateTime',
		default: '',
		description: 'Filter invoices with invoiceDate on or before this date',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'invoiceDate-le': '={{ $value ? new Date($value).getTime() : undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Invoice Number',
		name: 'invoiceNumber',
		type: 'string',
		default: '',
		description: 'Filter by exact invoice number',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'invoiceNumber-eq': '={{ $value || undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Record Currency ID',
		name: 'recordCurrencyId',
		type: 'string',
		default: '',
		description: 'Filter by currency ID (e.g. EUR)',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'recordCurrencyId-eq': '={{ $value || undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: '',
		description: 'Filter by invoice status',
		options: [
			{ name: '(All)', value: '' },
			{ name: 'Cancelled', value: 'CANCELLED' },
			{ name: 'Debit Advice', value: 'DEBIT_ADVICE' },
			{ name: 'Dispute', value: 'DISPUTE' },
			{ name: 'Dunning', value: 'DUNNING' },
			{ name: 'Open', value: 'OPEN' },
			{ name: 'Paid', value: 'PAID' },
		],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
		routing: {
			request: {
				qs: {
					'status-eq': '={{ $value || undefined }}',
				},
			},
		},
	},

	// Advanced filters collection for list
	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['list'],
			},
		},
	},

	// Simplify for list + get
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['get', 'list'],
			},
		},
	},

	// ── Create: required fields ───────────────────────────────────────────────

	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer for this invoice',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					customerId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Invoice Date',
		name: 'invoiceDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date of the invoice',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					invoiceDate: '={{ $value ? new Date($value).getTime() : undefined }}',
				},
			},
		},
	},

	// ── Create: optional additional fields ────────────────────────────────────

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Internal comment on the invoice',
				routing: {
					request: {
						body: {
							comment: '={{ $value || undefined }}',
						},
					},
				},
			},
			{
				displayName: 'Currency ID',
				name: 'currencyId',
				type: 'string',
				default: '',
				description: 'Currency ID (e.g. EUR). Defaults to customer currency if omitted.',
				routing: {
					request: {
						body: {
							currencyId: '={{ $value || undefined }}',
						},
					},
				},
			},
			{
				displayName: 'Dry Run',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description: 'Whether to validate the request without persisting it',
				routing: {
					request: {
						qs: {
							dryRun: '={{ $value || undefined }}',
						},
					},
				},
			},
			{
				displayName: 'Sales Channel',
				name: 'salesChannel',
				type: 'string',
				default: '',
				description: 'Sales channel ID. If omitted, the customer default is used.',
				routing: {
					request: {
						body: {
							salesChannel: '={{ $value || undefined }}',
						},
					},
				},
			},
		],
	},

	// ── Update: body as JSON ──────────────────────────────────────────────────

	{
		displayName: 'Update Fields (JSON)',
		name: 'updateBody',
		type: 'json',
		default: '{}',
		description:
			'Fields to update as a JSON object. Only supplied fields are changed (ignoreMissingProperties=true). Include "version" to use optimistic locking.',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['update'],
			},
		},
		routing: {
			request: {
				body: '={{ JSON.parse($value) }}',
			},
		},
	},
	{
		displayName: 'Dry Run',
		name: 'dryRunUpdate',
		type: 'boolean',
		default: false,
		description: 'Whether to validate the update without persisting it',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['update'],
			},
		},
		routing: {
			request: {
				qs: {
					dryRun: '={{ $value || undefined }}',
				},
			},
		},
	},

	// ── Action: addSalesOrders ────────────────────────────────────────────────

	{
		displayName: 'Collective Invoice Position Print Type',
		name: 'collectiveInvoicePositionPrintType',
		type: 'options',
		default: '',
		description: 'How positions are grouped on the collective invoice',
		options: [
			{ name: '(None)', value: '' },
			{ name: 'Order Position Group', value: 'ORDER_POSITION_GROUP' },
			{ name: 'Performance Record Position Group', value: 'PERFORMANCE_RECORD_POSITION_GROUP' },
			{ name: 'Shipment Position Group', value: 'SHIPMENT_POSITION_GROUP' },
		],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['addSalesOrders'],
			},
		},
		routing: {
			request: {
				body: {
					collectiveInvoicePositionPrintType: '={{ $value || undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Sales Order IDs',
		name: 'salesOrderIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of sales order IDs to attach to the invoice',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['addSalesOrders'],
			},
		},
		routing: {
			request: {
				body: {
					salesOrderIds: '={{ $value.split(",").map((s) => s.trim()).filter(Boolean) }}',
				},
			},
		},
	},

	// ── Action: calculateSalesPrices ──────────────────────────────────────────

	{
		displayName: 'Calculation Mode',
		name: 'calculationMode',
		type: 'options',
		required: true,
		default: 'COST_SURCHARGE',
		description: 'How to calculate new sales prices',
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
				resource: ['salesInvoice'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					calculationMode: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Invoice Item IDs (Optional)',
		name: 'invoiceItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of invoice item IDs to recalculate. If empty, all items are recalculated.',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					invoiceItemIds:
						'={{ $value ? $value.split(",").map((s) => s.trim()).filter(Boolean) : undefined }}',
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
		description: 'Target margin or surcharge percentage (decimal string, e.g. "20" for 20%)',
		placeholder: 'e.g. 20',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					percentage: '={{ $value }}',
				},
			},
		},
	},

	// ── Action: createCreditNote ──────────────────────────────────────────────

	{
		displayName: 'Item IDs (Optional)',
		name: 'itemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of invoice item IDs to include in the credit note. If empty, all items are used.',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['createCreditNote'],
			},
		},
		routing: {
			request: {
				body: {
					itemIds:
						'={{ $value ? $value.split(",").map((s) => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},

	// ── Action: createCreditNoteOpenItem ──────────────────────────────────────

	{
		displayName: 'Clear Credit Note',
		name: 'clearCreditNote',
		type: 'boolean',
		default: false,
		description: 'Whether to automatically clear (offset) the credit note against the invoice',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['createCreditNoteOpenItem'],
			},
		},
		routing: {
			request: {
				body: {
					clearCreditNote: '={{ $value }}',
				},
			},
		},
	},

	// ── Action: printLabel ────────────────────────────────────────────────────

	{
		displayName: 'Item Label Quantity Print Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ONLY_ONE_LABEL_PER_ITEM',
		description: 'Controls how many labels are printed per item',
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
				description: 'Print one label per line item',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
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
		displayName: 'Sales Invoice Item IDs (Optional)',
		name: 'salesInvoiceItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of invoice item IDs to print labels for. If empty, labels are printed for all items.',
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					salesInvoiceItemIds:
						'={{ $value ? $value.split(",").map((s) => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},

	// ── Action: setCostsForItemsWithoutCost ───────────────────────────────────

	{
		displayName: 'Cost Update Mode',
		name: 'costUpdateMode',
		type: 'options',
		required: true,
		default: 'SET_TO_NET_UNIT_PRICE',
		description: 'Target value to assign as unit cost for items that currently have no cost',
		options: [
			{
				name: 'Set to Net Unit Price',
				value: 'SET_TO_NET_UNIT_PRICE',
				description: 'Use the net unit price of each item as its unit cost',
			},
			{
				name: 'Set to Zero',
				value: 'SET_TO_ZERO',
				description: 'Set unit cost to 0',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesInvoice'],
				operation: ['setCostsForItemsWithoutCost'],
			},
		},
		routing: {
			request: {
				body: {
					costUpdateMode: '={{ $value }}',
				},
			},
		},
	},
];
