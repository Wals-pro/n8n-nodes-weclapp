import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { resources } from './descriptions/index';
import { loadOptions, listSearch } from './methods/loadOptions';
import { getCustomAttributeFields } from './methods/customAttributes';
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
		// typeVersion 2 swaps the Tag/Unit/User/Custom Attribute Definition ID
		// strings for resource locators (see versionedIdField in
		// descriptions/TagUnitUserDescription.ts). Workflows saved on
		// typeVersion 1 keep the plain string fields.
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the weclapp ERP API — CRUD, entity actions, binary downloads, and webhooks',
		defaults: {
			name: 'weclapp',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						description: 'Products and services, including prices, stock-relevant flags, and images',
					},
					{
						name: 'Bank Account',
						value: 'bankAccount',
						description: 'Company bank accounts used for payment runs and reconciliation',
					},
					{
						name: 'Bank Transaction',
						value: 'bankTransaction',
						description: 'Imported bank statement lines for payment reconciliation',
					},
					{
						name: 'Comment',
						value: 'comment',
						description: 'Comments attached to any weclapp entity',
					},
					{
						name: 'Custom API Call',
						value: 'customApiCall',
						description: 'Raw call to any weclapp API endpoint not covered by a dedicated resource',
					},
					{
						name: 'Custom Attribute Definition',
						value: 'customAttributeDefinition',
						description: 'Tenant-specific custom field definitions',
					},
					{
						name: 'Document',
						value: 'document',
						description: 'Files attached to entities — upload, download, versions',
					},
					{
						name: 'Party',
						value: 'party',
						description: 'Customers, suppliers, and prospects',
					},
					{
						name: 'Production Order',
						value: 'productionOrder',
						description: 'Manufacturing orders with material and time bookings',
					},
					{
						name: 'Purchase Invoice',
						value: 'purchaseInvoice',
						description: 'Incoming supplier invoices, including payment application',
					},
					{
						name: 'Purchase Order',
						value: 'purchaseOrder',
						description: 'Orders placed with suppliers',
					},
					{
						name: 'Quotation',
						value: 'quotation',
						description: 'Sales quotations, including PDF creation and order conversion',
					},
					{
						name: 'Sales Invoice',
						value: 'salesInvoice',
						description: 'Outgoing customer invoices, including PDF creation',
					},
					{
						name: 'Sales Order',
						value: 'salesOrder',
						description: 'Customer orders and their fulfillment lifecycle',
					},
					{
						name: 'Shipment',
						value: 'shipment',
						description: 'Outgoing and incoming shipments, including PDF documents',
					},
					{
						name: 'Tag',
						value: 'tag',
						description: 'Labels for organizing entities',
					},
					{
						name: 'Ticket',
						value: 'ticket',
						description: 'Support and service tickets',
					},
					{
						name: 'Unit',
						value: 'unit',
						description: 'Measurement units for articles',
					},
					{
						name: 'User',
						value: 'user',
						description: 'User accounts of the weclapp tenant',
					},
					{
						name: 'Warehouse',
						value: 'warehouse',
						description: 'Warehouses and storage locations',
					},
					{
						name: 'Warehouse Stock',
						value: 'warehouseStock',
						description: 'Current stock levels per article and warehouse',
					},
					{
						name: 'Warehouse Stock Movement',
						value: 'warehouseStockMovement',
						description: 'Historical stock movements',
					},
					{
						name: 'Webhook',
						value: 'webhook',
						description: 'Webhook subscriptions (see also the weclapp Trigger node)',
					},
				],
				default: 'article',
			},
			// Resource-specific fields are spread from descriptions/index.ts
			...resources,
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions,
		listSearch,
		resourceMapping: {
			getCustomAttributeFields,
		},
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
