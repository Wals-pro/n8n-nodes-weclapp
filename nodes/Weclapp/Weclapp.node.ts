import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { resources } from './descriptions/index';
import { loadOptions, listSearch } from './methods/loadOptions';
import { executeApplyPayment } from './actions/applyPayment';
import { executeUpdatePrices } from './actions/articlePriceSync';
import { executeCustomApiCall } from './descriptions/CustomApiDescription';
import { executeDocumentUpload, executeDocumentUploadNewVersion } from './actions/documentUpload';

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

	/**
	 * customOperations — programmatic handlers for composite operations that cannot
	 * be expressed as declarative routing (multi-step logic, binary multipart uploads, etc.).
	 *
	 * n8n invokes these handlers in place of declarative routing when the node's
	 * resource+operation matches a key here. All other operations continue to use
	 * the declarative routing defined in the operation's `routing` property.
	 *
	 * Handlers must process ALL items themselves (iterate `this.getInputData()`)
	 * and return `INodeExecutionData[][]` (one output branch).
	 */
	customOperations = {
		article: {
			updatePrices: async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const results: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					// resourceLocator — extractValue: true resolves to the raw ID string.
					const articleId = this.getNodeParameter('articleId', i, '', { extractValue: true }) as string;
					const grossPrice = this.getNodeParameter('grossPrice', i) as number;
					const currencyId = this.getNodeParameter('currencyId', i) as string;
					const options = this.getNodeParameter('updatePricesOptions', i, {}) as {
						salesChannel?: string;
						validFrom?: number;
					};

					const result = await executeUpdatePrices.call(this, {
						articleId,
						grossPrice,
						currencyId,
						salesChannel: options.salesChannel,
						validFrom: options.validFrom && options.validFrom > 0 ? options.validFrom : undefined,
					});

					results.push({ json: result as unknown as IDataObject, pairedItem: { item: i } });
				}

				return [results];
			},
		},

		purchaseInvoice: {
			applyPayment: async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const results: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					const result = await executeApplyPayment.call(this, i);
					results.push({ json: result as unknown as IDataObject, pairedItem: { item: i } });
				}

				return [results];
			},
		},

		customApiCall: {
			call: async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const results: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					const result = await executeCustomApiCall.call(this, i);
					results.push(result);
				}

				return [results];
			},
		},

		document: {
			upload: async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const results: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					const result = await executeDocumentUpload.call(this, i);
					results.push(result);
				}

				return [results];
			},

			uploadNewVersion: async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				const results: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					const result = await executeDocumentUploadNewVersion.call(this, i);
					results.push(result);
				}

				return [results];
			},
		},
	};
}
