import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { handleBinaryDownload, weclappApiRequest } from '../GenericFunctions';

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const customApiOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customApiCall'],
			},
		},
		options: [
			{
				name: 'Call',
				value: 'call',
				description: 'Make a raw HTTP request to any weclapp endpoint',
				action: 'Call a weclapp endpoint',
			},
		],
		default: 'call',
	},
];

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

export const customApiFields: INodeProperties[] = [
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
		default: 'GET',
		description: 'HTTP method to use for the request',
	},

	{
		displayName: 'Entity Path',
		name: 'entityPath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		default: '',
		placeholder: 'article',
		description:
			'The weclapp entity path (e.g. "article" or "salesOrder"). Do not prefix with /.',
		hint: 'Do not include a leading slash. The full URL will be built as /{entityPath}[/id/{entityId}][/{action}].',
	},

	{
		displayName: 'Entity ID',
		name: 'entityId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		default: '',
		placeholder: 'e.g. 123456',
		description: 'ID of a specific entity record. When provided, the request targets that single record.',
	},

	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		default: '',
		placeholder: 'e.g. acceptQuotation',
		description: 'Action name appended after the entity path and record segment (e.g. "acceptQuotation", "createPickingList")',
	},

	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		default: {},
		description:
			'Query parameters to append to the request URL. Use weclapp filter suffixes (e.g. articleType-eq, modifiedDate-ge). Valid operators: -eq -ne -lt -gt -le -ge -null -notnull -like -notlike -ilike -notilike -in -notin.',
		options: [
			{
				displayName: 'Parameter',
				name: 'parameter',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						placeholder: 'e.g. articleType-eq',
						description:
							'Parameter name. For filters append the operator suffix (e.g. status-eq, modifiedDate-ge).',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g. STORABLE',
						description: 'Parameter value. For -in/-notin use a JSON array string (e.g. ["A","B"]).',
					},
				],
			},
		],
	},

	{
		displayName: 'Request Body',
		name: 'requestBody',
		type: 'string',
		typeOptions: {
			rows: 6,
		},
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
				method: ['POST', 'PUT', 'PATCH'],
			},
		},
		default: '',
		placeholder: '{\n  "name": "My Article"\n}',
		description:
			'JSON body to send with the request. Must be a valid JSON object. Leave blank to send no body.',
	},

	{
		displayName: 'Return Binary',
		name: 'returnBinary',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
			},
		},
		default: false,
		description:
			'Whether the response should be treated as binary data (e.g. a PDF download). When enabled, sets responseType to arraybuffer and emits binary data on the output.',
	},

	{
		displayName: 'Binary Property Name',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['customApiCall'],
				operation: ['call'],
				returnBinary: [true],
			},
		},
		default: 'data',
		description: 'Name of the binary property on the output item that holds the downloaded file',
	},
];

// ---------------------------------------------------------------------------
// Execute handler — called from Weclapp.node.ts when resource === 'customApiCall'
// ---------------------------------------------------------------------------

/**
 * Build the weclapp endpoint URL from the user-supplied parts.
 *
 * Rules:
 *   /{entityPath}
 *   /{entityPath}/id/{entityId}          — when entityId is provided
 *   /{entityPath}/id/{entityId}/{action} — when both entityId and action are provided
 *   /{entityPath}/{action}               — when action is provided but no entityId
 */
function buildEndpoint(entityPath: string, entityId: string, action: string): string {
	let endpoint = `/${entityPath.trim()}`;
	if (entityId.trim()) {
		endpoint += `/id/${entityId.trim()}`;
	}
	if (action.trim()) {
		endpoint += `/${action.trim()}`;
	}
	return endpoint;
}

export async function executeCustomApiCall(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const method = this.getNodeParameter('method', itemIndex) as IHttpRequestMethods;
	const entityPath = this.getNodeParameter('entityPath', itemIndex) as string;
	const entityId = this.getNodeParameter('entityId', itemIndex, '') as string;
	const action = this.getNodeParameter('action', itemIndex, '') as string;
	const returnBinary = this.getNodeParameter('returnBinary', itemIndex, false) as boolean;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;

	if (!entityPath.trim()) {
		throw new NodeOperationError(this.getNode(), 'Entity Path is required.', { itemIndex });
	}

	const endpoint = buildEndpoint(entityPath, entityId, action);

	const qs: IDataObject = {};
	const queryParams = this.getNodeParameter(
		'queryParameters.parameter',
		itemIndex,
		[],
	) as Array<{ key: string; value: string }>;
	for (const param of queryParams) {
		const key = param.key?.trim();
		if (key) {
			qs[key] = param.value;
		}
	}

	let body: IDataObject | undefined;
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
		const rawBody = (this.getNodeParameter('requestBody', itemIndex, '') as string).trim();
		if (rawBody) {
			try {
				body = JSON.parse(rawBody) as IDataObject;
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					`Request Body contains invalid JSON: ${rawBody.slice(0, 120)}`,
					{ itemIndex },
				);
			}
		}
	}

	if (returnBinary) {
		const binaryItem = await handleBinaryDownload.call(this, method, endpoint, 'download', body, qs);
		if (binaryPropertyName !== 'data' && binaryItem.binary?.data) {
			binaryItem.binary[binaryPropertyName] = binaryItem.binary.data;
			delete binaryItem.binary.data;
		}
		return { ...binaryItem, pairedItem: { item: itemIndex } };
	}

	const response = await weclappApiRequest.call(this, method, endpoint, body, qs);

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}
