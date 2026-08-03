import type { INodeProperties } from 'n8n-workflow';

import { filtersCollection, listLimitFields, listPaginationRouting, simplifyField } from '../SharedFields';
import { mergeAdditionalProperties, simplifyPostReceive } from '../GenericFunctions';

export const bankAccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bankAccount'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bank account',
				action: 'Create a bank account',
				routing: {
					request: {
						method: 'POST',
						url: '/bankAccount',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bank account by ID',
				action: 'Delete a bank account',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/bankAccount/id/{{$parameter["bankAccountId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["bankAccountId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a bank account by ID',
				action: 'Get a bank account',
				routing: {
					request: {
						method: 'GET',
						url: '=/bankAccount/id/{{$parameter["bankAccountId"]}}',
					},
					output: {
						postReceive: [simplifyPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'Get many bank accounts',
				action: 'Get many bank accounts',
				routing: {
					request: {
						method: 'GET',
						url: '/bankAccount',
					},
					...listPaginationRouting,
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
				name: 'Update',
				value: 'update',
				description: 'Update a bank account by ID',
				action: 'Update a bank account',
				routing: {
					request: {
						method: 'PUT',
						url: '=/bankAccount/id/{{$parameter["bankAccountId"]}}',
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

export const bankAccountFields: INodeProperties[] = [
	{
		displayName: 'Bank Account',
		name: 'bankAccountId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The bank account to operate on',
		displayOptions: {
			show: {
				resource: ['bankAccount'],
				operation: ['get', 'update', 'delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchBankAccounts',
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
							errorMessage: 'Bank Account ID must be numeric',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://tenant.weclapp.com/webapp/api/v2/bankAccount/id/1234567890',
				extractValue: {
					type: 'regex',
					regex: '/bankAccount/id/([0-9]+)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '/bankAccount/id/[0-9]+',
							errorMessage: 'URL must contain /bankAccount/id/{id}',
						},
					},
				],
			},
		],
	},
	...listLimitFields('bankAccount'),
	{
		...filtersCollection,
		description: 'Filter bank accounts. Useful fields: accountHolder, creditInstitute, iban, active.',
		displayOptions: {
			show: {
				resource: ['bankAccount'],
				operation: ['list'],
			},
		},
	},
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['bankAccount'],
				operation: ['list', 'get'],
			},
		},
	},
	{
		displayName: 'Active',
		name: 'active',
		type: 'boolean',
		required: true,
		default: true,
		description: 'Whether the bank account is active',
		displayOptions: {
			show: {
				resource: ['bankAccount'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					active: '={{ $value }}',
				},
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
				resource: ['bankAccount'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Account Holder',
				name: 'accountHolder',
				type: 'string',
				default: '',
				description: 'Name of the account holder',
				routing: {
					request: {
						body: {
							accountHolder: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Account Number',
				name: 'accountNumber',
				type: 'string',
				default: '',
				routing: {
					request: {
						body: {
							accountNumber: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the bank account is active',
				routing: {
					request: {
						body: {
							active: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Bank Code',
				name: 'bankCode',
				type: 'string',
				default: '',
				description: 'Bank routing / sort code',
				routing: {
					request: {
						body: {
							bankCode: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Bank Name (Credit Institute)',
				name: 'creditInstitute',
				type: 'string',
				default: '',
				description: 'Name of the credit institution (bank)',
				routing: {
					request: {
						body: {
							creditInstitute: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Currency ID',
				name: 'currencyId',
				type: 'string',
				default: '',
				description: 'ID of the currency for this account',
				routing: {
					request: {
						body: {
							currencyId: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'IBAN',
				name: 'iban',
				type: 'string',
				default: '',
				description: 'IBAN of the bank account (max 34 characters)',
				routing: {
					request: {
						body: {
							iban: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'SWIFT / BIC',
				name: 'swiftBic',
				type: 'string',
				default: '',
				description: 'SWIFT/BIC code of the bank (max 11 characters)',
				routing: {
					request: {
						body: {
							swiftBic: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

export const bankTransactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bankTransaction'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bank transaction by ID',
				action: 'Delete a bank transaction',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/bankTransaction/id/{{$parameter["bankTransactionId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter["bankTransactionId"] } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a bank transaction by ID',
				action: 'Get a bank transaction',
				routing: {
					request: {
						method: 'GET',
						url: '=/bankTransaction/id/{{$parameter["bankTransactionId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'Get many bank transactions',
				action: 'Get many bank transactions',
				routing: {
					request: {
						method: 'GET',
						url: '/bankTransaction',
					},
					...listPaginationRouting,
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'result',
								},
							},
							mergeAdditionalProperties,
						],
					},
				},
			},
		],
		default: 'list',
	},
];

export const bankTransactionFields: INodeProperties[] = [
	{
		displayName: 'Bank Transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the bank transaction',
		displayOptions: {
			show: {
				resource: ['bankTransaction'],
				operation: ['get', 'delete'],
			},
		},
	},
	...listLimitFields('bankTransaction'),
	{
		...filtersCollection,
		description:
			'Filter bank transactions. Useful fields: effectiveDate, bankAccountId, amount, externalRecordNumber, paymentType, cleared.',
		displayOptions: {
			show: {
				resource: ['bankTransaction'],
				operation: ['list'],
			},
		},
	},
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['bankTransaction'],
				operation: ['list', 'get'],
			},
		},
	},
];

export const bankDescription: INodeProperties[] = [
	...bankAccountOperations,
	...bankAccountFields,
	...bankTransactionOperations,
	...bankTransactionFields,
];
