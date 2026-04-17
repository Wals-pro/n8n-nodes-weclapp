import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { resources } from './descriptions/index';
import { loadOptions, listSearch } from './methods/loadOptions';

export class Weclapp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'weclapp',
		name: 'weclapp',
		icon: {
			light: 'file:weclapp.light.svg',
			dark: 'file:weclapp.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the weclapp ERP API — CRUD, actions, binary downloads, and webhooks. Maintained by Wals-pro (wals.pro). AI copilot available at dev.weclapp-ai.wals.pro (Beta).',
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
				displayName: 'Built by <a href="https://wals.pro" target="_blank">Wals-pro</a> — try the AI copilot at <a href="https://dev.weclapp-ai.wals.pro" target="_blank">weclapp-ai.wals.pro</a> (Beta)',
				name: 'walsproNotice',
				type: 'notice',
				default: '',
			},
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
					{
						name: 'Warehouse',
						value: 'warehouse',
					},
					{
						name: 'Warehouse Stock',
						value: 'warehouseStock',
					},
					{
						name: 'Warehouse Stock Movement',
						value: 'warehouseStockMovement',
					},
					{
						name: 'Webhook',
						value: 'webhook',
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
}
