import type { INodeProperties } from 'n8n-workflow';

import { filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ---------------------------------------------------------------------------
// Operation list for the purchaseInvoice resource
// ---------------------------------------------------------------------------

export const purchaseInvoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
			},
		},
		options: [
			// Alphabetized by name per n8n linter requirement
			{
				name: 'Apply Payment',
				value: 'applyPayment',
				action: 'Apply payment to a purchase invoice',
				description:
					'Composite: find the open item for the invoice, validate amounts match exactly, then POST createPaymentApplication',
			},
			{
				name: 'Convert to Credit Note',
				value: 'convertPurchaseInvoiceToCreditNote',
				action: 'Convert purchase invoice to credit note',
				description:
					'Convert a purchase invoice to a credit note (must be INVOICE_RECEIVED, STANDARD_INVOICE type, no PO/incoming goods reference)',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/convertPurchaseInvoiceToCreditNote',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a purchase invoice',
				description: 'Create a new purchase invoice',
				routing: {
					request: {
						method: 'POST',
						url: '/purchaseInvoice',
					},
				},
			},
			{
				name: 'Create Credit Note',
				value: 'createCreditNote',
				action: 'Create a credit note from a purchase invoice',
				description: 'Create a partial or full credit note from the specified purchase invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/createCreditNote',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a purchase invoice',
				description: 'Delete a purchase invoice by ID',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { deleted: true, id: $parameter["purchaseInvoiceId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Invoice Document',
				value: 'downloadLatestPurchaseInvoiceDocument',
				action: 'Download the latest purchase invoice document',
				description: 'Download the latest document (PDF/image) attached to the purchase invoice',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/downloadLatestPurchaseInvoiceDocument',
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
				action: 'Get a purchase invoice',
				description: 'Retrieve a single purchase invoice by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List purchase invoices',
				description: 'Retrieve a list of purchase invoices',
				routing: {
					request: {
						method: 'GET',
						url: '/purchaseInvoice',
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
				action: 'Print label for a purchase invoice',
				description: 'Generate and download a label (PDF/image) for the purchase invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/printLabel',
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
				name: 'Reset Taxes',
				value: 'resetTaxes',
				action: 'Reset taxes on a purchase invoice',
				description: 'Reset invoice item taxes to their defaults for the specified purchase invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/resetTaxes',
					},
				},
			},
			{
				name: 'Save Duplicate Invoice as Original',
				value: 'saveDuplicateInvoiceAsOriginal',
				action: 'Save a duplicate invoice as original',
				description: 'Mark a duplicate purchase invoice as an original invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}/saveDuplicateInvoiceAsOriginal',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a purchase invoice',
				description: 'Update an existing purchase invoice (uses ignoreMissingProperties)',
				routing: {
					request: {
						method: 'PUT',
						url: '=/purchaseInvoice/id/{{$parameter["purchaseInvoiceId"]}}',
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
// Fields shared across multiple operations
// ---------------------------------------------------------------------------

const purchaseInvoiceIdField: INodeProperties = {
	displayName: 'Purchase Invoice ID',
	name: 'purchaseInvoiceId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the purchase invoice',
	displayOptions: {
		show: {
			resource: ['purchaseInvoice'],
			operation: [
				'delete',
				'get',
				'update',
				'convertPurchaseInvoiceToCreditNote',
				'createCreditNote',
				'downloadLatestPurchaseInvoiceDocument',
				'printLabel',
				'resetTaxes',
				'saveDuplicateInvoiceAsOriginal',
				'applyPayment',
			],
		},
	},
};

// ---------------------------------------------------------------------------
// List operation fields
// ---------------------------------------------------------------------------

const listFields: INodeProperties[] = [
	{
		...returnAllOrLimit[0],
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['list'],
			},
		},
	},
	{
		...returnAllOrLimit[1],
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['list'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'pageSize',
			},
		},
	},
	{
		...filtersCollection,
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['list'],
			},
		},
		description: 'Filterable fields: invoiceNumber, status, supplierId, invoiceDate, dueDate, recordCurrencyId',
	},
	simplifyField,
];

// ---------------------------------------------------------------------------
// Create / Update body fields
// ---------------------------------------------------------------------------

const bodyFields: INodeProperties[] = [
	{
		displayName: 'Invoice Date',
		name: 'invoiceDate',
		type: 'dateTime',
		default: '',
		description: 'Date of the invoice (required for create)',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'invoiceDate',
			},
		},
	},
	{
		displayName: 'Invoice Number',
		name: 'invoiceNumber',
		type: 'string',
		default: '',
		description: "The supplier's invoice number",
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'invoiceNumber',
			},
		},
	},
	{
		displayName: 'Supplier ID',
		name: 'supplierId',
		type: 'string',
		default: '',
		description: 'ID of the supplier (party)',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'supplierId',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Booking Date',
				name: 'bookingDate',
				type: 'dateTime',
				default: '',
				description: 'Accounting booking date for the invoice',
				routing: {
					send: {
						type: 'body',
						property: 'bookingDate',
					},
				},
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Payment due date',
				routing: {
					send: {
						type: 'body',
						property: 'dueDate',
					},
				},
			},
			{
				displayName: 'Internal Invoice Number',
				name: 'internalInvoiceNumber',
				type: 'string',
				default: '',
				description: 'Internal reference number assigned by your company',
				routing: {
					send: {
						type: 'body',
						property: 'internalInvoiceNumber',
					},
				},
			},
			{
				displayName: 'Purchase Invoice Type',
				name: 'purchaseInvoiceType',
				type: 'options',
				default: 'STANDARD_INVOICE',
				options: [
					{ name: 'Standard Invoice', value: 'STANDARD_INVOICE' },
					{ name: 'Credit Note', value: 'CREDIT_NOTE' },
					{ name: 'Down Payment Invoice', value: 'DOWN_PAYMENT_INVOICE' },
					{ name: 'Down Payment Credit Note', value: 'DOWN_PAYMENT_CREDIT_NOTE' },
				],
				routing: {
					send: {
						type: 'body',
						property: 'purchaseInvoiceType',
					},
				},
			},
			{
				displayName: 'Record Currency ID',
				name: 'recordCurrencyId',
				type: 'string',
				default: '',
				description: 'Currency ID for this invoice',
				routing: {
					send: {
						type: 'body',
						property: 'recordCurrencyId',
					},
				},
			},
		],
	},
];

// ---------------------------------------------------------------------------
// createCreditNote fields
// ---------------------------------------------------------------------------

const createCreditNoteFields: INodeProperties[] = [
	{
		displayName: 'Item IDs',
		name: 'itemIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of purchaseInvoiceItem IDs to include in the credit note. Leave empty to credit all items.',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['createCreditNote'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'itemIds',
				value: '={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
			},
		},
	},
];

// ---------------------------------------------------------------------------
// printLabel fields
// ---------------------------------------------------------------------------

const printLabelFields: INodeProperties[] = [
	{
		displayName: 'Item Label Quantity Print Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ITEM_QUANTITY',
		description: 'Controls how many labels are printed per item',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['printLabel'],
			},
		},
		options: [
			{ name: 'Item Quantity', value: 'ITEM_QUANTITY' },
			{ name: 'Only One Label per Booking Record', value: 'ONLY_ONE_LABEL_PER_BOOKING_RECORD' },
			{ name: 'Only One Label per Item', value: 'ONLY_ONE_LABEL_PER_ITEM' },
		],
		routing: {
			request: {
				body: {
					itemLabelQuantityPrintSetting: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Purchase Invoice Item IDs',
		name: 'purchaseInvoiceItemIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of purchaseInvoiceItem IDs to include. Leave empty to include all items.',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					purchaseInvoiceItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},
];

// ---------------------------------------------------------------------------
// downloadLatestPurchaseInvoiceDocument fields
// ---------------------------------------------------------------------------

const downloadDocumentFields: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		description: 'Name of the binary property to write the downloaded document to',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['downloadLatestPurchaseInvoiceDocument'],
			},
		},
	},
];

// ---------------------------------------------------------------------------
// applyPayment fields
// ---------------------------------------------------------------------------

const applyPaymentFields: INodeProperties[] = [
	{
		displayName: 'Bank Transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the bank transaction to apply as payment. The transaction amount must exactly match the open item amount (no partial allocation, no FX conversion).',
		displayOptions: {
			show: {
				resource: ['purchaseInvoice'],
				operation: ['applyPayment'],
			},
		},
	},
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const purchaseInvoiceFields: INodeProperties[] = [
	purchaseInvoiceIdField,
	...listFields,
	...bodyFields,
	...createCreditNoteFields,
	...printLabelFields,
	...downloadDocumentFields,
	...applyPaymentFields,
];
