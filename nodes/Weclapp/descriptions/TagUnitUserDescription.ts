import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, sortCollection, listLimitFields, listPaginationRouting, simplifyField } from '../SharedFields';
import { mergeAdditionalProperties, simplifyPostReceive } from '../GenericFunctions';

// ─── Shared postReceive helpers ──────────────────────────────────────────────

/** Extract result[] from a weclapp list response. */
const rootProperty = [{ type: 'rootProperty' as const, properties: { property: 'result' } }];

/** Return {deleted: true} after a 204 delete. */
const setDeleted = [{ type: 'set' as const, properties: { value: '{"deleted":true}' } }];

// ─── Version-gated ID fields ─────────────────────────────────────────────────

/**
 * Build the version-gated ID field pair for one resource.
 *
 * Node typeVersion 1 (workflows created before 1.0.0) keeps the original plain
 * string ID field. typeVersion 2 (the default for newly added nodes) shows a
 * resourceLocator with From-list search instead, matching the other resources.
 * Both variants share the parameter name, so routing expressions like
 * `{{$parameter["tagId"]}}` work unchanged — n8n resolves a resourceLocator
 * to its extracted value in expressions.
 */
function versionedIdField(config: {
	/** Locator label shown on typeVersion 2, e.g. 'Tag' */
	displayName: string;
	/** Original label kept on typeVersion 1, e.g. 'Tag ID' */
	v1DisplayName: string;
	/** Shared parameter name, e.g. 'tagId' */
	name: string;
	/** REST path segment for URL-mode extraction, e.g. 'tag' */
	entityPath: string;
	/** Key in the listSearch registry (methods/loadOptions.ts) */
	searchListMethod: string;
	description: string;
	show: { resource: string[]; operation: string[] };
}): INodeProperties[] {
	return [
		{
			displayName: config.v1DisplayName,
			name: config.name,
			type: 'string',
			required: true,
			default: '',
			description: config.description,
			displayOptions: { show: { ...config.show, '@version': [1] } },
		},
		{
			displayName: config.displayName,
			name: config.name,
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description: config.description,
			displayOptions: { show: { ...config.show, '@version': [2] } },
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
								errorMessage: `${config.displayName} ID must be numeric`,
							},
						},
					],
				},
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: config.searchListMethod,
						searchable: true,
					},
				},
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					placeholder: `e.g. https://tenant.weclapp.com/webapp/api/v2/${config.entityPath}/id/1234567890`,
					extractValue: {
						type: 'regex',
						regex: `/${config.entityPath}/id/([0-9]+)`,
					},
					validation: [
						{
							type: 'regex',
							properties: {
								regex: `/${config.entityPath}/id/[0-9]+`,
								errorMessage: `URL must contain /${config.entityPath}/id/{id}`,
							},
						},
					],
				},
			],
		},
	];
}

// ─── TAG ─────────────────────────────────────────────────────────────────────

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tag'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new tag',
				action: 'Create a tag',
				routing: { request: { method: 'POST', url: '/tag' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a tag by ID',
				action: 'Delete a tag',
				routing: {
					request: { method: 'DELETE', url: '=/tag/id/{{$parameter.tagId}}' },
					output: { postReceive: setDeleted },
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a tag by ID',
				action: 'Get a tag',
				routing: {
					request: { method: 'GET', url: '=/tag/id/{{$parameter.tagId}}' },
					output: { postReceive: [simplifyPostReceive] },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'List tags with optional filters',
				action: 'Get many tags',
				routing: {
					request: { method: 'GET', url: '/tag' },
					...listPaginationRouting,
					output: { postReceive: [...rootProperty, mergeAdditionalProperties, simplifyPostReceive] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a tag by ID',
				action: 'Update a tag',
				routing: { request: { method: 'PUT', url: '=/tag/id/{{$parameter.tagId}}', qs: { ignoreMissingProperties: true } } },
			},
		],
		default: 'list',
	},
];

export const tagFields: INodeProperties[] = [
	// ── List ──────────────────────────────────────────────────────────────────
	...listLimitFields('tag'),
	{
		...sortCollection,
		displayOptions: { show: { resource: ['tag'], operation: ['list'] } },
	},
	{
		...filtersCollection,
		displayOptions: { show: { resource: ['tag'], operation: ['list'] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['tag'], operation: ['list', 'get'] } },
	},
	{
		...additionalFields,
		displayOptions: { show: { resource: ['tag'], operation: ['list', 'get'] } },
	},

	// ── Get / Delete / Update — ID ────────────────────────────────────────────
	...versionedIdField({
		displayName: 'Tag',
		v1DisplayName: 'Tag ID',
		name: 'tagId',
		entityPath: 'tag',
		searchListMethod: 'searchTags',
		description: 'The tag to operate on',
		show: { resource: ['tag'], operation: ['get', 'delete', 'update'] },
	}),

	// ── Create / Update — body fields ─────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'tagName',
		type: 'string',
		required: true,
		default: '',
		description: 'Tag name',
		displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'tagBody',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['tag'], operation: ['create', 'update'] } },
		options: [
			{
				displayName: 'Name',
				name: 'tagName',
				type: 'string',
				default: '',
				description: 'Tag name',
				routing: { send: { type: 'body', property: 'name' } },
			},
		],
	},
];

// ─── UNIT ─────────────────────────────────────────────────────────────────────

export const unitOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['unit'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new unit of measure',
				action: 'Create a unit',
				routing: { request: { method: 'POST', url: '/unit' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a unit by ID',
				action: 'Delete a unit',
				routing: {
					request: { method: 'DELETE', url: '=/unit/id/{{$parameter.unitId}}' },
					output: { postReceive: setDeleted },
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a unit by ID',
				action: 'Get a unit',
				routing: {
					request: { method: 'GET', url: '=/unit/id/{{$parameter.unitId}}' },
					output: { postReceive: [simplifyPostReceive] },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'List units of measure with optional filters',
				action: 'Get many units',
				routing: {
					request: { method: 'GET', url: '/unit' },
					...listPaginationRouting,
					output: { postReceive: [...rootProperty, mergeAdditionalProperties, simplifyPostReceive] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a unit by ID',
				action: 'Update a unit',
				routing: { request: { method: 'PUT', url: '=/unit/id/{{$parameter.unitId}}', qs: { ignoreMissingProperties: true } } },
			},
		],
		default: 'list',
	},
];

export const unitFields: INodeProperties[] = [
	// ── List ──────────────────────────────────────────────────────────────────
	...listLimitFields('unit'),
	{
		...sortCollection,
		displayOptions: { show: { resource: ['unit'], operation: ['list'] } },
	},
	{
		...filtersCollection,
		displayOptions: { show: { resource: ['unit'], operation: ['list'] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['unit'], operation: ['list', 'get'] } },
	},
	{
		...additionalFields,
		displayOptions: { show: { resource: ['unit'], operation: ['list', 'get'] } },
	},

	// ── Get / Delete / Update — ID ────────────────────────────────────────────
	...versionedIdField({
		displayName: 'Unit',
		v1DisplayName: 'Unit ID',
		name: 'unitId',
		entityPath: 'unit',
		searchListMethod: 'searchUnits',
		description: 'The unit to operate on',
		show: { resource: ['unit'], operation: ['get', 'delete', 'update'] },
	}),

	// ── Create / Update — body fields ─────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'unitName',
		type: 'string',
		required: true,
		default: '',
		description: 'Unit name (e.g. Kilogram)',
		displayOptions: { show: { resource: ['unit'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'unitBody',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['unit'], operation: ['create', 'update'] } },
		options: [
			{
				displayName: 'Abbreviation',
				name: 'abbreviation',
				type: 'string',
				default: '',
				description: 'Short abbreviation for the unit (e.g. kg)',
				routing: { send: { type: 'body', property: 'abbreviation' } },
			},
			{
				displayName: 'Name',
				name: 'unitName',
				type: 'string',
				default: '',
				description: 'Unit name',
				routing: { send: { type: 'body', property: 'name' } },
			},
		],
	},
];

// ─── USER ─────────────────────────────────────────────────────────────────────

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create a user',
				routing: { request: { method: 'POST', url: '/user' } },
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user by ID',
				action: 'Get a user',
				routing: {
					request: { method: 'GET', url: '=/user/id/{{$parameter.userId}}' },
					output: { postReceive: [simplifyPostReceive] },
				},
			},
			{
				name: 'Get Current',
				value: 'getCurrent',
				description: 'Get the currently authenticated user',
				action: 'Get current user',
				routing: {
					request: { method: 'GET', url: '/user/currentUser' },
					output: { postReceive: [...rootProperty, simplifyPostReceive] },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'List users with optional filters',
				action: 'Get many users',
				routing: {
					request: { method: 'GET', url: '/user' },
					...listPaginationRouting,
					output: { postReceive: [...rootProperty, mergeAdditionalProperties, simplifyPostReceive] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user by ID',
				action: 'Update a user',
				routing: { request: { method: 'PUT', url: '=/user/id/{{$parameter.userId}}', qs: { ignoreMissingProperties: true } } },
			},
		],
		default: 'list',
	},
];

export const userFields: INodeProperties[] = [
	// ── List ──────────────────────────────────────────────────────────────────
	...listLimitFields('user'),
	{
		...sortCollection,
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
	},
	{
		...filtersCollection,
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['user'], operation: ['list', 'get', 'getCurrent'] } },
	},
	{
		...additionalFields,
		displayOptions: {
			show: { resource: ['user'], operation: ['list', 'get', 'getCurrent'] },
		},
	},

	// ── Get / Update — ID ─────────────────────────────────────────────────────
	...versionedIdField({
		displayName: 'User',
		v1DisplayName: 'User ID',
		name: 'userId',
		entityPath: 'user',
		searchListMethod: 'searchUsers',
		description: 'The user to operate on',
		show: { resource: ['user'], operation: ['get', 'update'] },
	}),

	// ── Create — required fields ───────────────────────────────────────────────
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		description: 'Login username for the new user',
		displayOptions: { show: { resource: ['user'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'username' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'name@example.com',
		description: 'Email address of the new user',
		displayOptions: { show: { resource: ['user'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},

	// ── Create / Update — body fields ─────────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'userBody',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['create', 'update'] } },
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the user account is active',
				routing: { send: { type: 'body', property: 'active' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'name@example.com',
				description: 'Email address',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the user',
				routing: { send: { type: 'body', property: 'firstName' } },
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the user',
				routing: { send: { type: 'body', property: 'lastName' } },
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Login username',
				routing: { send: { type: 'body', property: 'username' } },
			},
		],
	},
];

// ─── CUSTOM ATTRIBUTE DEFINITION ─────────────────────────────────────────────

export const customAttributeDefinitionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customAttributeDefinition'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new custom attribute definition',
				action: 'Create a custom attribute definition',
				routing: { request: { method: 'POST', url: '/customAttributeDefinition' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a custom attribute definition by ID',
				action: 'Delete a custom attribute definition',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/customAttributeDefinition/id/{{$parameter.customAttributeDefinitionId}}',
					},
					output: { postReceive: setDeleted },
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a custom attribute definition by ID',
				action: 'Get a custom attribute definition',
				routing: {
					request: {
						method: 'GET',
						url: '=/customAttributeDefinition/id/{{$parameter.customAttributeDefinitionId}}',
					},
					output: { postReceive: [simplifyPostReceive] },
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'List custom attribute definitions with optional filters',
				action: 'Get many custom attribute definitions',
				routing: {
					request: { method: 'GET', url: '/customAttributeDefinition' },
					...listPaginationRouting,
					output: { postReceive: [...rootProperty, mergeAdditionalProperties, simplifyPostReceive] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a custom attribute definition by ID',
				action: 'Update a custom attribute definition',
				routing: {
					request: {
						method: 'PUT',
						url: '=/customAttributeDefinition/id/{{$parameter.customAttributeDefinitionId}}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const customAttributeDefinitionFields: INodeProperties[] = [
	// ── List ──────────────────────────────────────────────────────────────────
	...listLimitFields('customAttributeDefinition'),
	{
		...sortCollection,
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['list'] },
		},
	},
	{
		...filtersCollection,
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['list'] },
		},
	},
	{
		...simplifyField,
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['list', 'get'] },
		},
	},
	{
		...additionalFields,
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['list', 'get'] },
		},
	},

	// ── Get / Delete / Update — ID ────────────────────────────────────────────
	...versionedIdField({
		displayName: 'Custom Attribute Definition',
		v1DisplayName: 'Custom Attribute Definition ID',
		name: 'customAttributeDefinitionId',
		entityPath: 'customAttributeDefinition',
		searchListMethod: 'searchCustomAttributeDefinitions',
		description: 'The custom attribute definition to operate on',
		show: {
			resource: ['customAttributeDefinition'],
			operation: ['get', 'delete', 'update'],
		},
	}),

	// ── Create — required fields ───────────────────────────────────────────────
	{
		displayName: 'Attribute Key',
		name: 'attributeKey',
		type: 'string',
		required: true,
		default: '',
		description: 'Unique key identifier for this attribute (e.g. my_custom_field)',
		placeholder: 'e.g. custom_field_1',
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['create'] },
		},
		routing: { send: { type: 'body', property: 'attributeKey' } },
	},
	{
		displayName: 'Attribute Type',
		name: 'attributeType',
		type: 'options',
		required: true,
		default: 'STRING',
		description: 'Data type of the custom attribute',
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['create'] },
		},
		options: [
			{ name: 'Boolean', value: 'BOOLEAN' },
			{ name: 'Date', value: 'DATE' },
			{ name: 'Decimal', value: 'DECIMAL' },
			{ name: 'Entity', value: 'ENTITY' },
			{ name: 'Integer', value: 'INTEGER' },
			{ name: 'Large Text', value: 'LARGE_TEXT' },
			{ name: 'List', value: 'LIST' },
			{ name: 'Multiselect List', value: 'MULTISELECT_LIST' },
			{ name: 'Reference', value: 'REFERENCE' },
			{ name: 'String', value: 'STRING' },
			{ name: 'URL', value: 'URL' },
		],
		routing: { send: { type: 'body', property: 'attributeType' } },
	},
	{
		displayName: 'Entities',
		name: 'entities',
		type: 'multiOptions',
		required: true,
		default: [],
		description: 'The weclapp entity types this attribute applies to',
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['create'] },
		},
		options: [
			{ name: 'Article', value: 'article' },
			{ name: 'Article Supply Source', value: 'articleSupplySource' },
			{ name: 'Batch Number', value: 'batchNumber' },
			{ name: 'Blanket Purchase Order', value: 'blanketPurchaseOrder' },
			{ name: 'Blanket Sales Order', value: 'blanketSalesOrder' },
			{ name: 'Campaign', value: 'campaign' },
			{ name: 'Competitor', value: 'competitor' },
			{ name: 'Contract', value: 'contract' },
			{ name: 'Contract Item', value: 'contractItem' },
			{ name: 'CRM Event', value: 'crmEvent' },
			{ name: 'Customer', value: 'customer' },
			{ name: 'Incoming Goods', value: 'incomingGoods' },
			{ name: 'Incoming Goods Item', value: 'incomingGoodsItem' },
			{ name: 'Opportunity', value: 'opportunity' },
			{ name: 'Parcel', value: 'parcel' },
			{ name: 'Party', value: 'party' },
			{ name: 'Performance Record', value: 'performanceRecord' },
			{ name: 'Performance Record Item', value: 'performanceRecordItem' },
			{ name: 'Production Order', value: 'productionOrder' },
			{ name: 'Production Order Item', value: 'productionOrderItem' },
			{ name: 'Project', value: 'project' },
			{ name: 'Purchase Invoice', value: 'purchaseInvoice' },
			{ name: 'Purchase Invoice Item', value: 'purchaseInvoiceItem' },
			{ name: 'Purchase Order', value: 'purchaseOrder' },
			{ name: 'Purchase Order Item', value: 'purchaseOrderItem' },
			{ name: 'Purchase Order Request', value: 'purchaseOrderRequest' },
			{ name: 'Purchase Order Request Item', value: 'purchaseOrderRequestItem' },
			{ name: 'Purchase Requisition', value: 'purchaseRequisition' },
			{ name: 'Quotation', value: 'quotation' },
			{ name: 'Quotation Item', value: 'quotationItem' },
			{ name: 'Recurring Invoice', value: 'recurringInvoice' },
			{ name: 'Recurring Invoice Item', value: 'recurringInvoiceItem' },
			{ name: 'Sales Invoice', value: 'salesInvoice' },
			{ name: 'Sales Invoice Item', value: 'salesInvoiceItem' },
			{ name: 'Sales Order', value: 'salesOrder' },
			{ name: 'Sales Order Item', value: 'salesOrderItem' },
			{ name: 'Serial Number', value: 'serialNumber' },
			{ name: 'Service Quota', value: 'serviceQuota' },
			{ name: 'Shipment', value: 'shipment' },
			{ name: 'Shipment Item', value: 'shipmentItem' },
			{ name: 'Storage Location', value: 'storageLocation' },
			{ name: 'Storage Place', value: 'storagePlace' },
			{ name: 'Supplier', value: 'supplier' },
			{ name: 'Task', value: 'task' },
			{ name: 'Ticket', value: 'ticket' },
			{ name: 'Time Record', value: 'timeRecord' },
			{ name: 'Transportation Order', value: 'transportationOrder' },
			{ name: 'User', value: 'user' },
			{ name: 'Warehouse', value: 'warehouse' },
			{ name: 'Warehouse Stock Movement', value: 'warehouseStockMovement' },
		],
		routing: { send: { type: 'body', property: 'entities' } },
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		default: '',
		description: 'Human-readable label shown in the weclapp UI',
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['create'] },
		},
		routing: { send: { type: 'body', property: 'label' } },
	},

	// ── Create / Update — body fields ─────────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'customAttributeDefinitionBody',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['customAttributeDefinition'], operation: ['create', 'update'] },
		},
		options: [
			{
				displayName: 'Attribute Key',
				name: 'attributeKey',
				type: 'string',
				default: '',
				description: 'Unique key identifier for this attribute',
				routing: { send: { type: 'body', property: 'attributeKey' } },
			},
			{
				displayName: 'Attribute Type',
				name: 'attributeType',
				type: 'string',
				default: '',
				description: 'Data type of the custom attribute (e.g. STRING, BOOLEAN)',
				routing: { send: { type: 'body', property: 'attributeType' } },
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Human-readable label shown in the weclapp UI',
				routing: { send: { type: 'body', property: 'label' } },
			},
			{
				displayName: 'Mandatory',
				name: 'mandatory',
				type: 'boolean',
				default: false,
				description: 'Whether a value for this attribute is required',
				routing: { send: { type: 'body', property: 'mandatory' } },
			},
		],
	},
];
