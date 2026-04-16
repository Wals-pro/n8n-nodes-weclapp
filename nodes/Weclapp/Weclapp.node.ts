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
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Custom API Call',
						value: 'customApiCall',
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
