import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { resources } from './descriptions/index';
import { loadOptions, listSearch } from './methods/loadOptions';

export class Weclapp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'weclapp',
		name: 'weclapp',
		icon: 'file:weclapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the weclapp ERP API — CRUD, actions, binary downloads',
		defaults: {
			name: 'weclapp',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'weclappApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				AuthenticationToken: '={{$credentials.apiKey}}',
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				// Workers will add options here via descriptions/index.ts
				options: [
					{
						name: 'Article',
						value: 'article',
					},
					{
						name: 'Bank Account',
						value: 'bankAccount',
					},
					{
						name: 'Bank Transaction',
						value: 'bankTransaction',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Custom API Call',
						value: 'customApiCall',
					},
					{
						name: 'Custom Attribute Definition',
						value: 'customAttributeDefinition',
					},
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Party',
						value: 'party',
						description: 'Customers, suppliers, and prospects',
					},
					{
						name: 'Production Order',
						value: 'productionOrder',
					},
					{
						name: 'Purchase Invoice',
						value: 'purchaseInvoice',
					},
					{
						name: 'Purchase Order',
						value: 'purchaseOrder',
					},
					{
						name: 'Quotation',
						value: 'quotation',
					},
					{
						name: 'Sales Invoice',
						value: 'salesInvoice',
					},
					{
						name: 'Sales Order',
						value: 'salesOrder',
					},
					{
						name: 'Shipment',
						value: 'shipment',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Unit',
						value: 'unit',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'customApiCall',
			},
			// Resource-specific fields are spread from descriptions/index.ts
			...resources,
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions,
		listSearch,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Full routing implementation in unit 2 + individual resource units.
		// For now, stub returns empty so the node compiles and loads in n8n.
		return [[]];
	}
}
