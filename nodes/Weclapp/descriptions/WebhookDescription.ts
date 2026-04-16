import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ─── Operation selector ───────────────────────────────────────────────────────

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webhook'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Register a new webhook subscription',
				action: 'Create a webhook',
				routing: {
					request: {
						method: 'POST',
						url: '/webhook',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a webhook subscription by ID',
				action: 'Delete a webhook',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/webhook/id/{{$parameter["webhookId"]}}',
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
				name: 'Get',
				value: 'get',
				description: 'Retrieve a webhook subscription by ID',
				action: 'Get a webhook',
				routing: {
					request: {
						method: 'GET',
						url: '=/webhook/id/{{$parameter["webhookId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List and filter webhook subscriptions',
				action: 'List webhooks',
				routing: {
					request: {
						method: 'GET',
						url: '/webhook',
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
				name: 'Update',
				value: 'update',
				description: 'Update an existing webhook subscription by ID',
				action: 'Update a webhook',
				routing: {
					request: {
						method: 'PUT',
						url: '=/webhook/id/{{$parameter["webhookId"]}}',
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

// ─── Shared webhook ID field ──────────────────────────────────────────────────

const webhookIdField: INodeProperties = {
	displayName: 'Webhook ID',
	name: 'webhookId',
	type: 'string',
	required: true,
	default: '',
	description: 'The ID of the webhook subscription to operate on',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['get', 'update', 'delete'],
		},
	},
};

// ─── Create: required body fields ────────────────────────────────────────────

const createEntityNameField: INodeProperties = {
	displayName: 'Entity Name',
	name: 'entityName',
	type: 'string',
	required: true,
	default: '',
	description: 'The weclapp entity type to watch (e.g. salesOrder, article, party)',
	placeholder: 'e.g. salesOrder',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'entityName' },
	},
};

const createUrlField: INodeProperties = {
	displayName: 'Target URL',
	name: 'url',
	type: 'string',
	required: true,
	default: '',
	description: 'The URL that weclapp will call when the event fires',
	placeholder: 'https://example.com/my-webhook',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'url' },
	},
};

const createRequestMethodField: INodeProperties = {
	displayName: 'Request Method',
	name: 'requestMethod',
	type: 'options',
	required: true,
	default: 'POST',
	description: 'HTTP method used when calling the target URL',
	options: [
		{ name: 'GET', value: 'GET' },
		{ name: 'POST', value: 'POST' },
	],
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'requestMethod' },
	},
};

const createAtCreateField: INodeProperties = {
	displayName: 'Trigger on Create',
	name: 'atCreate',
	type: 'boolean',
	required: true,
	default: true,
	description: 'Whether to fire this webhook when an entity is created',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'atCreate' },
	},
};

const createAtUpdateField: INodeProperties = {
	displayName: 'Trigger on Update',
	name: 'atUpdate',
	type: 'boolean',
	required: true,
	default: true,
	description: 'Whether to fire this webhook when an entity is updated',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'atUpdate' },
	},
};

const createAtDeleteField: INodeProperties = {
	displayName: 'Trigger on Delete',
	name: 'atDelete',
	type: 'boolean',
	required: true,
	default: false,
	description: 'Whether to fire this webhook when an entity is deleted',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['create'],
		},
	},
	routing: {
		send: { type: 'body', property: 'atDelete' },
	},
};

// ─── Update: body fields ──────────────────────────────────────────────────────

const updateFields: INodeProperties = {
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['update'],
		},
	},
	options: [
		{
			displayName: 'Entity Name',
			name: 'entityName',
			type: 'string',
			default: '',
			description: 'The weclapp entity type to watch (e.g. salesOrder, article, party)',
			placeholder: 'e.g. salesOrder',
			routing: {
				send: { type: 'body', property: 'entityName' },
			},
		},
		{
			displayName: 'Request Method',
			name: 'requestMethod',
			type: 'options',
			default: 'POST',
			description: 'HTTP method used when calling the target URL',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
			],
			routing: {
				send: { type: 'body', property: 'requestMethod' },
			},
		},
		{
			displayName: 'Target URL',
			name: 'url',
			type: 'string',
			default: '',
			description: 'The URL that weclapp will call when the event fires',
			placeholder: 'https://example.com/my-webhook',
			routing: {
				send: { type: 'body', property: 'url' },
			},
		},
		{
			displayName: 'Trigger on Create',
			name: 'atCreate',
			type: 'boolean',
			default: true,
			description: 'Whether to fire this webhook when an entity is created',
			routing: {
				send: { type: 'body', property: 'atCreate' },
			},
		},
		{
			displayName: 'Trigger on Delete',
			name: 'atDelete',
			type: 'boolean',
			default: false,
			description: 'Whether to fire this webhook when an entity is deleted',
			routing: {
				send: { type: 'body', property: 'atDelete' },
			},
		},
		{
			displayName: 'Trigger on Update',
			name: 'atUpdate',
			type: 'boolean',
			default: true,
			description: 'Whether to fire this webhook when an entity is updated',
			routing: {
				send: { type: 'body', property: 'atUpdate' },
			},
		},
	],
};

// ─── List: return all / limit ─────────────────────────────────────────────────

const listReturnAllOrLimit: INodeProperties[] = returnAllOrLimit.map((field) => ({
	...field,
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['list'],
		},
	},
}));

// ─── List: filters collection ─────────────────────────────────────────────────

const listFilters: INodeProperties = {
	...filtersCollection,
	description: 'Filterable fields: url, entityName, atCreate, atUpdate, atDelete',
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['list'],
		},
	},
};

// ─── List + Get: simplify ─────────────────────────────────────────────────────

const listSimplify: INodeProperties = {
	...simplifyField,
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['list', 'get'],
		},
	},
	routing: {
		output: {
			postReceive: [
				{
					type: 'filter',
					enabled: '={{ $parameter["simplify"] }}',
					properties: {
						pass: '={{ ["id","url","entityName","atCreate","atUpdate","atDelete","requestMethod","version"].includes($key) }}',
					},
				},
			],
		},
	},
};

// ─── List + Get: additional fields ───────────────────────────────────────────

const getAdditionalFields: INodeProperties = {
	...additionalFields,
	displayOptions: {
		show: {
			resource: ['webhook'],
			operation: ['get', 'list'],
		},
	},
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const webhookFields: INodeProperties[] = [
	webhookIdField,
	createEntityNameField,
	createUrlField,
	createRequestMethodField,
	createAtCreateField,
	createAtUpdateField,
	createAtDeleteField,
	updateFields,
	...listReturnAllOrLimit,
	listFilters,
	listSimplify,
	getAdditionalFields,
];

export const webhookDescription: INodeProperties[] = [...webhookOperations, ...webhookFields];
