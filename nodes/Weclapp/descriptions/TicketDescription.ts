import type { INodeProperties } from 'n8n-workflow';

import { filtersCollection, returnAllOrLimit, simplifyField } from '../SharedFields';

// ---------------------------------------------------------------------------
// Ticket operations
// ---------------------------------------------------------------------------

export const ticketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['ticket'] } },
		default: 'list',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new ticket',
				action: 'Create a ticket',
				routing: {
					request: {
						method: 'POST',
						url: '/ticket',
					},
				},
			},
			{
				name: 'Create Performance Record',
				value: 'createPerformanceRecord',
				description: 'Create a performance record for a ticket',
				action: 'Create a performance record for a ticket',
				routing: {
					request: {
						method: 'POST',
						url: '=/ticket/id/{{$parameter["ticketId"]}}/createPerformanceRecord',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket by ID',
				action: 'Delete a ticket',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/ticket/id/{{$parameter["ticketId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["ticketId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket by ID',
				action: 'Get a ticket',
				routing: {
					request: {
						method: 'GET',
						url: '=/ticket/id/{{$parameter["ticketId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List tickets',
				action: 'List tickets',
				routing: {
					request: {
						method: 'GET',
						url: '/ticket',
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
				name: 'Mark Read',
				value: 'markRead',
				description:
					'Mark a ticket as read (may return 404 on some weclapp versions; check permissions)',
				action: 'Mark a ticket as read',
				routing: {
					request: {
						method: 'POST',
						url: '=/ticket/id/{{$parameter["ticketId"]}}/markRead',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket by ID',
				action: 'Update a ticket',
				routing: {
					request: {
						method: 'PUT',
						url: '=/ticket/id/{{$parameter["ticketId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Ticket fields
// ---------------------------------------------------------------------------

export const ticketFields: INodeProperties[] = [
	// ── Ticket ID (get / update / delete / markRead / createPerformanceRecord) ──
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get', 'update', 'delete', 'markRead', 'createPerformanceRecord'],
			},
		},
		description: 'The ID of the ticket',
	},

	// ── List: Return All / Limit ──
	...returnAllOrLimit.map((field) => ({
		...field,
		displayOptions: { show: { resource: ['ticket'], operation: ['list'] } },
	})),

	// ── List: pagination via pageSize query param ──
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'hidden',
		default: 1000,
		displayOptions: { show: { resource: ['ticket'], operation: ['list'] } },
		routing: {
			send: { type: 'query', property: 'pageSize', value: '=1000' },
		},
	},

	// ── List: Filters ──
	{
		...filtersCollection,
		displayOptions: { show: { resource: ['ticket'], operation: ['list'] } },
	},

	// ── List: Simplify ──
	{
		...simplifyField,
		displayOptions: { show: { resource: ['ticket'], operation: ['list', 'get'] } },
	},

	// ── Create fields ──
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['ticket'], operation: ['create'] } },
		description: 'The subject of the ticket',
		routing: {
			send: { type: 'body', property: 'subject' },
		},
	},
	{
		displayName: 'Ticket Status Name or ID',
		name: 'ticketStatusId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getTicketStatuses' },
		displayOptions: { show: { resource: ['ticket'], operation: ['create'] } },
		description: 'The status of the ticket (foreign key to ticketStatus entity). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: {
			send: { type: 'body', property: 'ticketStatusId' },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['ticket'], operation: ['create'] } },
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assigneeId',
				type: 'string',
				default: '',
				description: 'The ID of the user assigned to this ticket',
				routing: {
					send: { type: 'body', property: 'assigneeId' },
				},
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'The due date for the ticket (as timestamp in ms)',
				routing: {
					send: { type: 'body', property: 'dueDate' },
				},
			},
			{
				displayName: 'Requester ID',
				name: 'requesterId',
				type: 'string',
				default: '',
				description: 'The ID of the user who requested this ticket',
				routing: {
					send: { type: 'body', property: 'requesterId' },
				},
			},
			{
				displayName: 'Ticket Pooling Group ID',
				name: 'ticketPoolingGroupId',
				type: 'string',
				default: '',
				description: 'The ID of the ticket pooling group',
				routing: {
					send: { type: 'body', property: 'ticketPoolingGroupId' },
				},
			},
		],
	},

	// ── Update fields ──
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['ticket'], operation: ['update'] } },
		options: [
			{
				displayName: 'Assignee ID',
				name: 'assigneeId',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'assigneeId' },
				},
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				routing: {
					send: { type: 'body', property: 'dueDate' },
				},
			},
			{
				displayName: 'Requester ID',
				name: 'requesterId',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'requesterId' },
				},
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the ticket',
				routing: {
					send: { type: 'body', property: 'subject' },
				},
			},
			{
				displayName: 'Ticket Pooling Group ID',
				name: 'ticketPoolingGroupId',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'ticketPoolingGroupId' },
				},
			},
			{
				displayName: 'Ticket Status Name or ID',
				name: 'ticketStatusId',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getTicketStatuses' },
				description: 'The status of the ticket (foreign key to ticketStatus entity). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: {
					send: { type: 'body', property: 'ticketStatusId' },
				},
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description:
					'Optimistic-lock version string. Include to prevent conflicting concurrent updates.',
				routing: {
					send: { type: 'body', property: 'version' },
				},
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Comment operations
// ---------------------------------------------------------------------------

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		default: 'list',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new comment on an entity',
				action: 'Create a comment',
				routing: {
					request: {
						method: 'POST',
						url: '/comment',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment by ID',
				action: 'Delete a comment',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/comment/id/{{$parameter["commentId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["commentId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a comment by ID',
				action: 'Get a comment',
				routing: {
					request: {
						method: 'GET',
						url: '=/comment/id/{{$parameter["commentId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List comments for an entity',
				action: 'List comments',
				routing: {
					request: {
						method: 'GET',
						url: '/comment',
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
				description: 'Update a comment by ID',
				action: 'Update a comment',
				routing: {
					request: {
						method: 'PUT',
						url: '=/comment/id/{{$parameter["commentId"]}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Comment fields
// ---------------------------------------------------------------------------

export const commentFields: INodeProperties[] = [
	// ── Comment ID (get / update / delete) ──
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The ID of the comment',
	},

	// ── List: entityName (query param — weclapp uses it as a filter) ──
	{
		displayName: 'Entity Name',
		name: 'entityName',
		type: 'options',
		required: true,
		default: 'ticket',
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['list'],
			},
		},
		description:
			'The entity type these comments belong to (e.g. ticket, salesOrder, purchaseOrder)',
		options: [
			{ name: 'Article', value: 'article' },
			{ name: 'Document', value: 'document' },
			{ name: 'Party', value: 'party' },
			{ name: 'Production Order', value: 'productionOrder' },
			{ name: 'Purchase Invoice', value: 'purchaseInvoice' },
			{ name: 'Purchase Order', value: 'purchaseOrder' },
			{ name: 'Quotation', value: 'quotation' },
			{ name: 'Sales Invoice', value: 'salesInvoice' },
			{ name: 'Sales Order', value: 'salesOrder' },
			{ name: 'Shipment', value: 'shipment' },
			{ name: 'Ticket', value: 'ticket' },
		],
		routing: {
			send: {
				type: 'query',
				property: 'entityName',
			},
		},
	},

	// ── Create: entityName (body field — weclapp expects it in the request body) ──
	{
		displayName: 'Entity Name',
		name: 'entityNameCreate',
		type: 'options',
		required: true,
		default: 'ticket',
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['create'],
			},
		},
		description:
			'The entity type this comment belongs to (e.g. ticket, salesOrder, purchaseOrder)',
		options: [
			{ name: 'Article', value: 'article' },
			{ name: 'Document', value: 'document' },
			{ name: 'Party', value: 'party' },
			{ name: 'Production Order', value: 'productionOrder' },
			{ name: 'Purchase Invoice', value: 'purchaseInvoice' },
			{ name: 'Purchase Order', value: 'purchaseOrder' },
			{ name: 'Quotation', value: 'quotation' },
			{ name: 'Sales Invoice', value: 'salesInvoice' },
			{ name: 'Sales Order', value: 'salesOrder' },
			{ name: 'Shipment', value: 'shipment' },
			{ name: 'Ticket', value: 'ticket' },
		],
		routing: {
			send: {
				type: 'body',
				property: 'entityName',
			},
		},
	},

	// ── List: entityId (required by weclapp API for list) ──
	{
		displayName: 'Entity ID',
		name: 'entityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['list'],
			},
		},
		description: 'The ID of the entity whose comments to list',
		routing: {
			send: {
				type: 'query',
				property: 'entityId',
			},
		},
	},

	// ── List: Return All / Limit ──
	...returnAllOrLimit.map((field) => ({
		...field,
		displayOptions: { show: { resource: ['comment'], operation: ['list'] } },
	})),

	// ── List: Simplify ──
	{
		...simplifyField,
		displayOptions: { show: { resource: ['comment'], operation: ['list', 'get'] } },
	},

	// ── Create fields ──
	{
		displayName: 'Entity ID',
		name: 'entityIdCreate',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['comment'],
				operation: ['create'],
			},
		},
		description: 'The ID of the entity this comment belongs to',
		routing: {
			send: { type: 'body', property: 'entityId' },
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		displayOptions: { show: { resource: ['comment'], operation: ['create'] } },
		description: 'The comment text',
		routing: {
			send: { type: 'body', property: 'comment' },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['comment'], operation: ['create'] } },
		options: [
			{
				displayName: 'HTML Comment',
				name: 'htmlComment',
				type: 'string',
				default: '',
				description: 'The comment text in HTML format (used instead of plain comment if set)',
				routing: {
					send: { type: 'body', property: 'htmlComment' },
				},
			},
			{
				displayName: 'Parent Comment ID',
				name: 'parentCommentId',
				type: 'string',
				default: '',
				description: 'The ID of the parent comment (for threaded replies)',
				routing: {
					send: { type: 'body', property: 'parentCommentId' },
				},
			},
			{
				displayName: 'Private Comment',
				name: 'privateComment',
				type: 'boolean',
				default: false,
				description: 'Whether this comment is private (internal only)',
				routing: {
					send: { type: 'body', property: 'privateComment' },
				},
			},
			{
				displayName: 'Public Comment',
				name: 'publicComment',
				type: 'boolean',
				default: false,
				description: 'Whether this comment is public (visible to external parties)',
				routing: {
					send: { type: 'body', property: 'publicComment' },
				},
			},
			{
				displayName: 'Solution',
				name: 'solution',
				type: 'boolean',
				default: false,
				description: 'Whether this comment marks the solution to the ticket',
				routing: {
					send: { type: 'body', property: 'solution' },
				},
			},
		],
	},

	// ── Update fields ──
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['comment'], operation: ['update'] } },
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				typeOptions: { rows: 4 },
				routing: {
					send: { type: 'body', property: 'comment' },
				},
			},
			{
				displayName: 'HTML Comment',
				name: 'htmlComment',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'htmlComment' },
				},
			},
			{
				displayName: 'Private Comment',
				name: 'privateComment',
				type: 'boolean',
				default: false,
				routing: {
					send: { type: 'body', property: 'privateComment' },
				},
			},
			{
				displayName: 'Public Comment',
				name: 'publicComment',
				type: 'boolean',
				default: false,
				routing: {
					send: { type: 'body', property: 'publicComment' },
				},
			},
			{
				displayName: 'Solution',
				name: 'solution',
				type: 'boolean',
				default: false,
				routing: {
					send: { type: 'body', property: 'solution' },
				},
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				description:
					'Optimistic-lock version string. Include to prevent conflicting concurrent updates.',
				routing: {
					send: { type: 'body', property: 'version' },
				},
			},
		],
	},
];

// ---------------------------------------------------------------------------
// Simplify helpers (curated subsets)
// ---------------------------------------------------------------------------

/** Ticket simplify whitelist — the 7 most useful fields. */
export const TICKET_SIMPLE_FIELDS = new Set([
	'id',
	'version',
	'ticketStatusId',
	'subject',
	'assigneeId',
	'requesterId',
	'createdDate',
	'dueDate',
]);

/** Comment simplify whitelist — the 7 most useful fields. */
export const COMMENT_SIMPLE_FIELDS = new Set([
	'id',
	'version',
	'entityName',
	'entityId',
	'comment',
	'createdUserId',
	'createdDate',
]);

export function simplifyTicket(ticket: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(ticket).filter(([k]) => TICKET_SIMPLE_FIELDS.has(k)));
}

export function simplifyComment(comment: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(comment).filter(([k]) => COMMENT_SIMPLE_FIELDS.has(k)),
	);
}
