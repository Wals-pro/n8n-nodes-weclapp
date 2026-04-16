import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** Credential type name — kept as a const to prevent silent typos. */
const CREDENTIAL_NAME = 'weclappApi';

/** Shape returned by GET /webhook */
interface WeclappWebhook {
	id: string;
	url: string;
	event: string;
	active?: boolean;
}

/** Shape of weclapp list response */
interface WeclappListResponse {
	result: WeclappWebhook[];
}

/** Stored per-workflow-node to survive activate/deactivate cycles */
interface TriggerStaticData {
	weclappWebhookIds?: string[];
}

/**
 * Build the absolute weclapp API URL for a given path.
 * Strips a trailing slash from baseUrl so we never get double-slashes.
 */
function buildUrl(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export class WeclappTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'weclapp Trigger',
		name: 'weclappTrigger',
		icon: 'file:weclapp.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Starts the workflow when a weclapp entity event fires. Automatically registers and removes the webhook subscription on workflow activate/deactivate.',
		defaults: {
			name: 'weclapp Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: CREDENTIAL_NAME,
				required: true,
			},
		],
		usableAsTool: true,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
				isFullPath: false,
			},
		],
		properties: [
			{
				displayName: 'Entity Name',
				name: 'entityName',
				type: 'options',
				noDataExpression: true,
				required: true,
				placeholder: 'Entity to subscribe to',
				options: [
					{ name: 'Article', value: 'article' },
					{ name: 'Bank Transaction', value: 'bankTransaction' },
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
					{ name: 'Warehouse Stock', value: 'warehouseStock' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'salesOrder',
				description: 'The weclapp entity type to watch',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Created', value: 'created' },
					{ name: 'Updated', value: 'updated' },
					{ name: 'Deleted', value: 'deleted' },
				],
				default: ['created', 'updated'],
				description: 'Which lifecycle events to subscribe to',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Include History',
						name: 'includeHistory',
						type: 'boolean',
						default: false,
						description:
							'Whether to include field-level change history in the webhook payload (if supported by the entity)',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			/**
			 * Check whether a weclapp webhook already exists for our n8n endpoint URL.
			 * Filters by url-eq so only an exact URL match counts as "already registered".
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					return false;
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIAL_NAME,
					{
						method: 'GET',
						url: buildUrl(credentials.baseUrl, '/webhook'),
						qs: { 'url-eq': webhookUrl },
						json: true,
					},
				)) as WeclappListResponse;

				const rows = response?.result ?? [];
				return rows.some((row) => row.url === webhookUrl);
			},

			/**
			 * Register one weclapp webhook per selected event (e.g. salesOrder.created).
			 * Stores all created webhook IDs in workflow static data so delete() can clean up.
			 *
			 * weclapp's /webhook endpoint accepts one event string per subscription, so
			 * selecting three events creates three rows. This is the correct pattern for
			 * the weclapp webhook API.
			 */
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not determine the n8n webhook URL');
				}

				const entityName = this.getNodeParameter('entityName') as string;
				const events = this.getNodeParameter('events') as string[];

				if (!events || events.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one event must be selected');
				}

				const responses = await Promise.all(
					events.map(async (event) => {
						const response = (await this.helpers.httpRequestWithAuthentication.call(
							this,
							CREDENTIAL_NAME,
							{
								method: 'POST',
								url: buildUrl(credentials.baseUrl, '/webhook'),
								body: {
									url: webhookUrl,
									event: `${entityName}.${event}`,
									active: true,
								},
								json: true,
							},
						)) as { id: string };

						if (!response?.id) {
							throw new NodeOperationError(
								this.getNode(),
								`weclapp did not return an id for event "${entityName}.${event}"`,
							);
						}
						return response.id;
					}),
				);

				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				staticData.weclappWebhookIds = responses;

				return true;
			},

			/**
			 * Remove all weclapp webhook subscriptions that were created by this node.
			 * IDs are read from workflow static data (set during create).
			 *
			 * Failures for individual DELETE calls are swallowed so that a partially
			 * cleaned-up state (e.g. already manually deleted in weclapp) does not
			 * prevent the workflow from deactivating cleanly.
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const ids = staticData.weclappWebhookIds ?? [];

				if (ids.length === 0) {
					return true;
				}

				const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);

				await Promise.allSettled(
					ids.map((id) =>
						this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_NAME, {
							method: 'DELETE',
							url: buildUrl(credentials.baseUrl, `/webhook/id/${id}`),
							json: true,
						}),
					),
				);

				staticData.weclappWebhookIds = [];
				return true;
			},
		},
	};

	/**
	 * Handle an inbound weclapp webhook POST.
	 *
	 * weclapp does not sign webhook payloads by default, so no signature
	 * verification is performed here.
	 * TODO: If weclapp adds an HMAC signature header in the future, verify it
	 * here before emitting the item.
	 *
	 * The raw request body is emitted as-is so downstream nodes receive the
	 * full weclapp entity payload. Request headers are attached under `_headers`
	 * (namespaced to avoid collision with any "headers" key in the entity payload).
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const headers = this.getHeaderData();

		return {
			workflowData: [
				[
					{
						json: {
							...body,
							_headers: headers,
						},
					},
				],
			],
		};
	}
}
