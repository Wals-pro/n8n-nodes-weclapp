import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ─── documentType enum values ─────────────────────────────────────────────────

const documentTypeOptions = [
	{ name: 'Article Datasheet', value: 'ARTICLE_DATASHEET' },
	{ name: 'Article Label', value: 'ARTICLE_LABEL' },
	{ name: 'Blanket Purchase Order', value: 'BLANKET_PURCHASE_ORDER' },
	{ name: 'Blanket Sales Order', value: 'BLANKET_SALES_ORDER' },
	{ name: 'Cancellation UBL', value: 'CANCELLATION_UBL' },
	{ name: 'Cancellation XR', value: 'CANCELLATION_XR' },
	{ name: 'Contract', value: 'CONTRACT' },
	{ name: 'Credit Advice', value: 'CREDIT_ADVICE' },
	{ name: 'Credit Advice Cancellation', value: 'CREDIT_ADVICE_CANCELLATION' },
	{ name: 'Credit Advice Preliminary Invoice', value: 'CREDIT_ADVICE_PRELIMINARY_INVOICE' },
	{ name: 'Credit Advice UBL', value: 'CREDIT_ADVICE_UBL' },
	{ name: 'Credit Advice XR', value: 'CREDIT_ADVICE_XR' },
	{ name: 'CRM Event Letter', value: 'CRM_EVENT_LETTER' },
	{ name: 'Customer Article Price List', value: 'CUSTOMER_ARTICLE_PRICE_LIST' },
	{ name: 'Dunning', value: 'DUNNING' },
	{ name: 'Incoming Goods', value: 'INCOMING_GOODS' },
	{ name: 'Incoming Goods From Return', value: 'INCOMING_GOODS_FROM_RETURN' },
	{ name: 'Incoming Goods Returns Pickup Note', value: 'INCOMING_GOODS_RETURNS_PICKUP_NOTE' },
	{ name: 'Inventory Taking', value: 'INVENTORY_TAKING' },
	{ name: 'Performance Record', value: 'PERFORMANCE_RECORD' },
	{ name: 'Production Order', value: 'PRODUCTION_ORDER' },
	{ name: 'Purchase Invoice', value: 'PURCHASE_INVOICE' },
	{ name: 'Purchase Invoice FatturaPA', value: 'PURCHASE_INVOICE_FATTURAPA' },
	{ name: 'Purchase Invoice ZUGFeRD', value: 'PURCHASE_INVOICE_ZUGFERD' },
	{ name: 'Purchase Order', value: 'PURCHASE_ORDER' },
	{ name: 'Purchase Order Cancellation', value: 'PURCHASE_ORDER_CANCELLATION' },
	{ name: 'Purchase Order Default', value: 'PURCHASE_ORDER_DEFAULT' },
	{ name: 'Purchase Order Request', value: 'PURCHASE_ORDER_REQUEST' },
	{ name: 'Purchase Order Request Offer Item CSV', value: 'PURCHASE_ORDER_REQUEST_OFFER_ITEM_CSV' },
	{ name: 'Purchase Order Request Supplier Document', value: 'PURCHASE_ORDER_REQUEST_SUPPLIER_DOCUMENT' },
	{ name: 'Quotation', value: 'QUOTATION' },
	{ name: 'Quotation Default', value: 'QUOTATION_DEFAULT' },
	{ name: 'Sales Invoice', value: 'SALES_INVOICE' },
	{ name: 'Sales Invoice Cancellation', value: 'SALES_INVOICE_CANCELLATION' },
	{ name: 'Sales Invoice Default', value: 'SALES_INVOICE_DEFAULT' },
	{ name: 'Sales Invoice FatturaPA', value: 'SALES_INVOICE_FATTURAPA' },
	{ name: 'Sales Invoice Preliminary', value: 'SALES_INVOICE_PRELIMINARY' },
	{ name: 'Sales Invoice QR', value: 'SALES_INVOICE_QR' },
	{ name: 'Sales Invoice UBL', value: 'SALES_INVOICE_UBL' },
	{ name: 'Sales Invoice XR', value: 'SALES_INVOICE_XR' },
	{ name: 'Sales Order', value: 'SALES_ORDER' },
	{ name: 'Sales Order Default', value: 'SALES_ORDER_DEFAULT' },
	{ name: 'Shipment Customs Declaration', value: 'SHIPMENT_CUSTOMS_DECLARATION' },
	{ name: 'Shipment Delivery Label', value: 'SHIPMENT_DELIVERY_LABEL' },
	{ name: 'Shipment Delivery Note', value: 'SHIPMENT_DELIVERY_NOTE' },
	{ name: 'Shipment Delivery Note Default', value: 'SHIPMENT_DELIVERY_NOTE_DEFAULT' },
	{ name: 'Shipment Picking List', value: 'SHIPMENT_PICKING_LIST' },
	{ name: 'Shipment Proforma Invoice', value: 'SHIPMENT_PROFORMA_INVOICE' },
	{ name: 'Shipment Return Delivery Note', value: 'SHIPMENT_RETURN_DELIVERY_NOTE' },
	{ name: 'Shipment Return Label', value: 'SHIPMENT_RETURN_LABEL' },
	{ name: 'Shipment Serial Numbers CSV', value: 'SHIPMENT_SERIAL_NUMBERS_CSV' },
	{ name: 'Ticket', value: 'TICKET' },
	{ name: 'ZUGFeRD Validation', value: 'ZUGFERD_VALIDATION' },
];

// ─── Operation selector ───────────────────────────────────────────────────────

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a document to the same entity',
				action: 'Copy document',
				routing: {
					request: {
						method: 'POST',
						url: '=/document/id/{{$parameter["documentId"]}}/copy',
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
				name: 'Copy to Entity',
				value: 'copyToEntity',
				description: 'Copy a document to a different entity',
				action: 'Copy document to entity',
				routing: {
					request: {
						method: 'POST',
						url: '/document/copy',
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
				name: 'Count',
				value: 'count',
				description: 'Count documents for an entity',
				action: 'Count documents',
				routing: {
					request: {
						method: 'GET',
						url: '/document/count',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new document metadata record (without file — use Upload to attach a file)',
				action: 'Create document',
				routing: {
					request: {
						method: 'POST',
						url: '/document',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a document',
				action: 'Delete document',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/document/id/{{$parameter["documentId"]}}',
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
				name: 'Download',
				value: 'download',
				description: 'Download the current file binary of a document',
				action: 'Download document',
				routing: {
					request: {
						method: 'GET',
						url: '=/document/id/{{$parameter["documentId"]}}/download',
						encoding: 'arraybuffer',
					},
				},
			},
			{
				name: 'Download Document Version',
				value: 'downloadDocumentVersion',
				description: 'Download a specific version of a document (binary)',
				action: 'Download document version',
				routing: {
					request: {
						method: 'GET',
						url: '=/document/id/{{$parameter["documentId"]}}/downloadDocumentVersion',
						encoding: 'arraybuffer',
					},
				},
			},
			{
				name: 'Download Document Versions Zipped',
				value: 'downloadDocumentVersionsZipped',
				description: 'Download all or selected versions of a document as a ZIP archive (binary)',
				action: 'Download document versions zipped',
				routing: {
					request: {
						method: 'GET',
						url: '=/document/id/{{$parameter["documentId"]}}/downloadDocumentVersionsZipped',
						encoding: 'arraybuffer',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a single document by ID',
				action: 'Get document',
				routing: {
					request: {
						method: 'GET',
						url: '=/document/id/{{$parameter["documentId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'Retrieve a list of documents for an entity',
				action: 'List documents',
				routing: {
					request: {
						method: 'GET',
						url: '/document',
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
				description: 'Update document metadata',
				action: 'Update document',
				routing: {
					request: {
						method: 'PUT',
						url: '=/document/id/{{$parameter["documentId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a new document file attached to an entity',
				action: 'Upload document',
				routing: {
					request: {
						method: 'POST',
						url: '/document/upload',
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
				name: 'Upload New Version',
				value: 'uploadNewVersion',
				description: 'Upload a new file version to an existing document',
				action: 'Upload document new version',
				routing: {
					request: {
						method: 'POST',
						url: '=/document/id/{{$parameter["documentId"]}}/upload',
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

// ─── Shared: document ID field ────────────────────────────────────────────────

const documentIdField: INodeProperties = {
	displayName: 'Document ID',
	name: 'documentId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the document to operate on',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: [
				'get',
				'update',
				'delete',
				'copy',
				'download',
				'downloadDocumentVersion',
				'downloadDocumentVersionsZipped',
				'uploadNewVersion',
			],
		},
	},
};

// ─── Shared: entity context fields ───────────────────────────────────────────
// list, count, upload, copyToEntity all require entityName + entityId

const listEntityName: INodeProperties = {
	displayName: 'Entity Name',
	name: 'entityName',
	type: 'string',
	required: true,
	default: '',
	description: 'The weclapp entity type the documents belong to (e.g. salesOrder, customer, article)',
	placeholder: 'e.g. salesOrder',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'count'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'entityName',
		},
	},
};

const listEntityId: INodeProperties = {
	displayName: 'Entity ID',
	name: 'entityId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the entity the documents belong to',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'count'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'entityId',
		},
	},
};

// ─── List operation fields ────────────────────────────────────────────────────

const listReturnAll: INodeProperties[] = returnAllOrLimit.map((f) => ({
	...f,
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list'],
		},
	},
}));

const listFilters: INodeProperties = {
	...filtersCollection,
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list'],
		},
	},
};

const listSimplify: INodeProperties = {
	...simplifyField,
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'get'],
		},
	},
};

const listAdditionalFields: INodeProperties = {
	...additionalFields,
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'get'],
		},
	},
};

// ─── Create operation fields ──────────────────────────────────────────────────

const createName: INodeProperties = {
	displayName: 'Name',
	name: 'createName',
	type: 'string',
	required: true,
	default: '',
	description: 'Name/filename of the document',
	displayOptions: {
		show: {
			resource: ['document'],
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

const createMediaType: INodeProperties = {
	displayName: 'Media Type',
	name: 'createMediaType',
	type: 'string',
	required: true,
	default: 'application/pdf',
	description: 'MIME type of the document (e.g. application/pdf, image/png)',
	placeholder: 'e.g. application/pdf',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['create'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'mediaType',
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
			resource: ['document'],
			operation: ['create'],
		},
	},
	options: [
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Description for the document',
			routing: {
				send: {
					type: 'body',
					property: 'description',
				},
			},
		},
		{
			displayName: 'Document Type',
			name: 'documentType',
			type: 'options',
			default: 'CONTRACT',
			options: documentTypeOptions,
			routing: {
				send: {
					type: 'body',
					property: 'documentType',
				},
			},
		},
	],
};

// ─── Update operation fields ──────────────────────────────────────────────────

const updateFields: INodeProperties = {
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	description: 'Fields to update on the document metadata',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['update'],
		},
	},
	options: [
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
			displayName: 'Document Type',
			name: 'documentType',
			type: 'options',
			default: 'CONTRACT',
			options: documentTypeOptions,
			routing: {
				send: {
					type: 'body',
					property: 'documentType',
				},
			},
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'Name/filename of the document',
			routing: {
				send: {
					type: 'body',
					property: 'name',
				},
			},
		},
	],
};

// ─── Copy (POST /document/id/{id}/copy) fields ────────────────────────────────

const copySourceDocumentId: INodeProperties = {
	displayName: 'Source Document ID',
	name: 'copySourceDocumentId',
	type: 'string',
	required: true,
	default: '',
	description: 'ID of the source document to copy from',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['copy'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'sourceDocumentId',
		},
	},
};

const copyComment: INodeProperties = {
	displayName: 'Comment',
	name: 'copyComment',
	type: 'string',
	default: '',
	description: 'Comment for the copied document',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['copy'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'comment',
		},
	},
};

// ─── Copy to Entity (POST /document/copy) fields ──────────────────────────────

const copyToEntitySourceDocumentId: INodeProperties = {
	displayName: 'Source Document ID',
	name: 'copyToEntitySourceDocumentId',
	type: 'string',
	required: true,
	default: '',
	description: 'ID of the source document to copy',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['copyToEntity'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'sourceDocumentId',
		},
	},
};

const copyToEntityEntityName: INodeProperties = {
	displayName: 'Target Entity Name',
	name: 'copyToEntityEntityName',
	type: 'string',
	required: true,
	default: '',
	description: 'The weclapp entity type to copy the document to (e.g. salesOrder, customer)',
	placeholder: 'e.g. salesOrder',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['copyToEntity'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'entityName',
		},
	},
};

const copyToEntityEntityId: INodeProperties = {
	displayName: 'Target Entity ID',
	name: 'copyToEntityEntityId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the entity to copy the document to',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['copyToEntity'],
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'entityId',
		},
	},
};

// ─── Download (binary) fields ─────────────────────────────────────────────────

const downloadBinaryProperty: INodeProperties = {
	displayName: 'Put Output File in Field',
	name: 'binaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	description: 'The name of the output binary field to put the downloaded file in',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['download', 'downloadDocumentVersion', 'downloadDocumentVersionsZipped'],
		},
	},
};

const downloadVersionId: INodeProperties = {
	displayName: 'Version ID',
	name: 'downloadVersionId',
	type: 'string',
	default: '',
	description: 'Specific version ID to download. Leave empty for the latest version.',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['downloadDocumentVersion'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'versionId',
		},
	},
};

const downloadVersionsZippedOptions: INodeProperties = {
	displayName: 'Additional Options',
	name: 'downloadZippedOptions',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['downloadDocumentVersionsZipped'],
		},
	},
	options: [
		{
			displayName: 'Filename',
			name: 'filename',
			type: 'string',
			default: '',
			description: 'Filename for the downloaded ZIP archive',
			routing: {
				send: {
					type: 'query',
					property: 'filename',
				},
			},
		},
		{
			displayName: 'Version IDs',
			name: 'ids',
			type: 'string',
			default: '',
			description: 'Comma-separated version IDs to include in the ZIP (e.g. 123,456). Leave empty to include all versions.',
			routing: {
				send: {
					type: 'query',
					property: 'ids',
				},
			},
		},
	],
};

// ─── Upload (POST /document/upload) fields ────────────────────────────────────

const uploadBinaryProperty: INodeProperties = {
	displayName: 'Binary Property',
	name: 'uploadBinaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	description: 'Name of the binary property containing the file to upload',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['upload'],
		},
	},
};

const uploadEntityName: INodeProperties = {
	displayName: 'Entity Name',
	name: 'uploadEntityName',
	type: 'string',
	required: true,
	default: '',
	description: 'The weclapp entity type the document belongs to (e.g. salesOrder, customer, article)',
	placeholder: 'e.g. salesOrder',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['upload'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'entityName',
		},
	},
};

const uploadEntityId: INodeProperties = {
	displayName: 'Entity ID',
	name: 'uploadEntityId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the entity the document belongs to',
	placeholder: 'e.g. 1234567890',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['upload'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'entityId',
		},
	},
};

const uploadDocumentName: INodeProperties = {
	displayName: 'Document Name',
	name: 'uploadDocumentName',
	type: 'string',
	required: true,
	default: '',
	description: 'Name/filename for the uploaded document',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['upload'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'name',
		},
	},
};

const uploadAdditionalOptions: INodeProperties = {
	displayName: 'Additional Options',
	name: 'uploadAdditionalOptions',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['upload'],
		},
	},
	options: [
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Description for the uploaded document',
			routing: {
				send: {
					type: 'query',
					property: 'description',
				},
			},
		},
		{
			displayName: 'Document Type',
			name: 'documentType',
			type: 'options',
			default: 'CONTRACT',
			options: documentTypeOptions,
			routing: {
				send: {
					type: 'query',
					property: 'documentType',
				},
			},
		},
	],
};

// ─── Upload New Version (POST /document/id/{id}/upload) fields ────────────────

const uploadNewVersionBinaryProperty: INodeProperties = {
	displayName: 'Binary Property',
	name: 'uploadNewVersionBinaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	description: 'Name of the binary property containing the new file version to upload',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['uploadNewVersion'],
		},
	},
};

const uploadNewVersionComment: INodeProperties = {
	displayName: 'Comment',
	name: 'uploadNewVersionComment',
	type: 'string',
	default: '',
	description: 'Comment describing the new version',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['uploadNewVersion'],
		},
	},
	routing: {
		send: {
			type: 'query',
			property: 'comment',
		},
	},
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const documentDescription: INodeProperties[] = [
	...documentOperations,
	// Shared: document ID (operations that act on an existing document by ID)
	documentIdField,
	// List + Count: entity context (required by weclapp API)
	listEntityName,
	listEntityId,
	// List options
	...listReturnAll,
	listFilters,
	listSimplify,
	listAdditionalFields,
	// Create
	createName,
	createMediaType,
	createAdditionalFields,
	// Update
	updateFields,
	// Copy (same entity)
	copySourceDocumentId,
	copyComment,
	// Copy to entity (different entity)
	copyToEntitySourceDocumentId,
	copyToEntityEntityName,
	copyToEntityEntityId,
	// Download (binary)
	downloadBinaryProperty,
	downloadVersionId,
	downloadVersionsZippedOptions,
	// Upload new document
	uploadBinaryProperty,
	uploadEntityName,
	uploadEntityId,
	uploadDocumentName,
	uploadAdditionalOptions,
	// Upload new version
	uploadNewVersionBinaryProperty,
	uploadNewVersionComment,
];
