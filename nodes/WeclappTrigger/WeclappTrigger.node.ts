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

/** Shape returned by GET /webhook (weclapp OpenAPI: webhook schema) */
interface WeclappWebhook {
	id: string;
	url: string;
	entityName: string;
	requestMethod: 'GET' | 'POST';
	atCreate: boolean;
	atUpdate: boolean;
	atDelete: boolean;
}

/** Shape of weclapp list response */
interface WeclappListResponse {
	result: WeclappWebhook[];
}

/** Stored per-workflow-node to survive activate/deactivate cycles */
interface TriggerStaticData {
	weclappWebhookId?: string;
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
		icon: {
			light: 'file:weclapp.light.svg',
			dark: 'file:weclapp.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		description:
			'Starts the workflow when a weclapp entity event fires. Automatically registers and removes the webhook subscription on workflow activate/deactivate. Maintained by Wals-pro (wals.pro).',
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
				displayName: 'Built by <a href="https://wals.pro" target="_blank">Wals-pro</a> — try the AI copilot at <a href="https://dev.weclapp-ai.wals.pro" target="_blank">weclapp-ai.wals.pro</a> (Beta)',
				name: 'walsproNotice',
				type: 'notice',
				default: '',
			},
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
			 * Check whether a weclapp webhook already exists for our n8n endpoint URL
			 * and the selected entity. Filters by both url-eq AND entityName-eq so that
			 * multiple triggers sharing the same n8n instance do not collide.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					return false;
				}

				const entityName = this.getNodeParameter('entityName') as string;

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIAL_NAME,
					{
						method: 'GET',
						url: buildUrl(credentials.baseUrl, '/webhook'),
						qs: {
							'url-eq': webhookUrl,
							'entityName-eq': entityName,
						},
						json: true,
					},
				)) as WeclappListResponse;

				const rows = response?.result ?? [];
				return rows.some((row) => row.url === webhookUrl && row.entityName === entityName);
			},

			/**
			 * Register ONE weclapp webhook for the selected entity with boolean flags
			 * derived from the selected events array.
			 *
			 * weclapp's /webhook schema uses a single row per URL+entity combination
			 * with atCreate/atUpdate/atDelete booleans — NOT one row per event.
			 * Sending the old { event, active } shape results in HTTP 400 from weclapp.
			 *
			 * Required POST body fields (per OpenAPI):
			 *   entityName, url, requestMethod, atCreate, atUpdate, atDelete
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

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIAL_NAME,
					{
						method: 'POST',
						url: buildUrl(credentials.baseUrl, '/webhook'),
						body: {
							entityName,
							url: webhookUrl,
							requestMethod: 'POST',
							atCreate: events.includes('created'),
							atUpdate: events.includes('updated'),
							atDelete: events.includes('deleted'),
						},
						json: true,
					},
				)) as { id: string };

				if (!response?.id) {
					throw new NodeOperationError(
						this.getNode(),
						`weclapp did not return an id for entity "${entityName}"`,
					);
				}

				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				staticData.weclappWebhookId = response.id;

				return true;
			},

			/**
			 * Remove the weclapp webhook subscription that was created by this node.
			 * The ID is read from workflow static data (set during create).
			 *
			 * Failure is swallowed so that a partially cleaned-up state (e.g. already
			 * manually deleted in weclapp) does not prevent the workflow from deactivating.
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const id = staticData.weclappWebhookId;

				if (!id) {
					return true;
				}

				const credentials = await this.getCredentials<{ baseUrl: string }>(CREDENTIAL_NAME);

				await this.helpers.httpRequestWithAuthentication
					.call(this, CREDENTIAL_NAME, {
						method: 'DELETE',
						url: buildUrl(credentials.baseUrl, `/webhook/id/${id}`),
						json: true,
					})
					.catch(() => {
						// Swallow: weclapp row may have been removed manually already.
					});

				staticData.weclappWebhookId = undefined;
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
