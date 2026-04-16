import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class WeclappTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'weclapp Trigger',
		name: 'weclappTrigger',
		icon: 'file:weclapp.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Trigger n8n workflows from weclapp webhook events. Maintained by Wals-pro (wals.pro). AI copilot available at dev.weclapp-ai.wals.pro (Beta).',
		defaults: {
			name: 'weclapp Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'weclappApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'lastNode',
				path: 'weclapp-trigger',
			},
		],
		properties: [
			{
				displayName: 'Entity Type',
				name: 'entityType',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Article', value: 'article' },
					{ name: 'Bank Transaction', value: 'bankTransaction' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Customer', value: 'customer' },
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
					{ name: 'Warehouse Stock Movement', value: 'warehouseStockMovement' },
				],
				default: 'salesOrder',
				description: 'The entity type to watch for events',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'Created', value: 'CREATED' },
					{ name: 'Updated', value: 'UPDATED' },
					{ name: 'Deleted', value: 'DELETED' },
				],
				default: ['CREATED', 'UPDATED'],
				description: 'The events to subscribe to',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Full implementation in unit 20.
				// Check if a webhook subscription already exists for this endpoint.
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				// Full implementation in unit 20.
				// POST /webhook to register the n8n webhook URL with weclapp.
				throw new NodeOperationError(
					this.getNode(),
					'WeclappTrigger webhook registration not yet implemented — coming in unit 20',
				);
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				// Full implementation in unit 20.
				// DELETE /webhook/id/{id} to unregister the subscription.
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Full implementation in unit 20.
		// Parse the incoming weclapp webhook payload and return as node output.
		const body = this.getBodyData();
		return {
			workflowData: [[{ json: body }]],
		};
	}
}
