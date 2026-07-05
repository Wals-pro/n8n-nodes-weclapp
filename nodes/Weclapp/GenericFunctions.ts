import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IN8nHttpFullResponse,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export type WeclappFunctions =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions;

export interface WeclappFilterItem {
	field: string;
	operator: string;
	value: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_OPERATORS = new Set([
	'eq',
	'ne',
	'lt',
	'gt',
	'le',
	'ge',
	'null',
	'notnull',
	'like',
	'notlike',
	'ilike',
	'notilike',
	'in',
	'notin',
]);

/**
 * Fields kept per resource when simplify = true.
 *
 * Whitelists follow the official-node convention: id + the main number field +
 * a human-readable name/subject + a status + the optimistic-lock `version`.
 * Field names are the weclapp REST response property names (verified against the
 * weclapp OpenAPI schemas). Resources not listed here pass through unchanged.
 */
export const SIMPLIFY_FIELDS: Record<string, string[]> = {
	article: ['id', 'articleNumber', 'name', 'articleType', 'active', 'unitId', 'version'],
	party: ['id', 'partyNumber', 'name', 'firstName', 'lastName', 'partyType', 'active', 'version'],
	salesOrder: [
		'id',
		'orderNumber',
		'commission',
		'salesOrderPaymentType',
		'orderDate',
		'status',
		'grossAmount',
		'version',
	],
	salesInvoice: ['id', 'invoiceNumber', 'status', 'paymentStatus', 'salesInvoiceType', 'version'],
	purchaseInvoice: ['id', 'invoiceNumber', 'status', 'paymentStatus', 'version'],
	purchaseOrder: ['id', 'purchaseOrderNumber', 'status', 'version'],
	quotation: ['id', 'quotationNumber', 'status', 'version'],
	shipment: ['id', 'shipmentNumber', 'shipmentType', 'deliveryDate', 'version'],
	ticket: ['id', 'ticketNumber', 'subject', 'ticketStatusId', 'version'],
	productionOrder: ['id', 'productionOrderNumber', 'status', 'version'],
	document: ['id', 'name', 'description', 'entityName', 'version'],
	warehouse: ['id', 'name', 'active', 'version'],
	warehouseStock: ['id', 'articleId', 'warehouseId', 'quantity', 'version'],
	warehouseStockMovement: ['id', 'movementNumber', 'articleId', 'quantity', 'version'],
	bankAccount: ['id', 'accountNumber', 'name', 'active', 'version'],
	bankTransaction: ['id', 'externalRecordNumber', 'description', 'version'],
	tag: ['id', 'name', 'version'],
	unit: ['id', 'name', 'description', 'version'],
	user: ['id', 'username', 'firstName', 'lastName', 'status', 'version'],
	webhook: ['id', 'entityName', 'active', 'version'],
	comment: ['id', 'entityName', 'authorName', 'version'],
	customAttributeDefinition: ['id', 'attributeKey', 'label', 'attributeType', 'version'],
};

// ---------------------------------------------------------------------------
// URL resolution helper
// ---------------------------------------------------------------------------

/**
 * Resolve a weclapp endpoint to an absolute URL.
 *
 * Declarative routing (n8n `routing` property) gets `baseURL` injected
 * automatically from `requestDefaults`. Programmatic handlers
 * (`customOperations`) bypass `requestDefaults` entirely, so they must
 * resolve the absolute URL themselves.
 *
 * Rules:
 *  - Absolute URL (`http://` or `https://`) → returned unchanged.
 *  - Relative path (with or without leading `/`) → `baseUrl` from
 *    credentials is prepended after stripping any trailing slashes.
 *
 * @param ctx       The calling function's `this`.
 * @param endpoint  Relative path (e.g. `/salesOrder`) or absolute URL.
 * @returns Absolute URL string ready for `httpRequestWithAuthentication`.
 */
export async function resolveWeclappUrl(
	ctx: WeclappFunctions,
	endpoint: string,
): Promise<string> {
	if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
		return endpoint;
	}

	const creds = await ctx.getCredentials('weclappApi');
	const baseUrl = String(creds.baseUrl).replace(/\/+$/, '');
	const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${baseUrl}${path}`;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

/**
 * Make an authenticated request to the weclapp API.
 *
 * `endpoint` may be a relative path (e.g. `/salesOrder`) or an absolute URL.
 * Relative paths are resolved against the `baseUrl` stored in the node's
 * `weclappApi` credentials at call time. This ensures programmatic handlers
 * (customOperations) work correctly — unlike declarative routing they do NOT
 * receive `requestDefaults.baseURL` injection from n8n.
 *
 * Errors are parsed via `parseApiProblem` and re-thrown as `NodeApiError`
 * so n8n shows a structured, human-readable message.
 */
export async function weclappApiRequest(
	this: WeclappFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const url = await resolveWeclappUrl(this, endpoint);
	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weclappApi', {
			method,
			url,
			body,
			qs,
			json: true,
		});
		return response as IDataObject;
	} catch (err) {
		parseApiProblem(this, err);
	}
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

/**
 * Fetch ALL pages of a weclapp list endpoint, concatenating `result` arrays.
 *
 * Stops when:
 *  - `response.result.length < pageSize` (last page), or
 *  - `maxPages` is reached (safety cap, default 100).
 *
 * @param pageSize  Items per page (max 1000 in weclapp). Default 1000.
 * @param maxPages  Hard cap on requests to avoid runaway loops. Default 100.
 */
export async function weclappApiRequestAllItems(
	this: WeclappFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs?: IDataObject,
	pageSize = 1000,
	maxPages = 100,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];

	for (let page = 1; page <= maxPages; page++) {
		const response = await weclappApiRequest.call(this, method, endpoint, undefined, {
			...qs,
			page,
			pageSize,
		});

		const batch = (response.result as IDataObject[] | undefined) ?? [];
		results.push(...batch);

		if (batch.length < pageSize) {
			// Last page — no more items.
			break;
		}
	}

	return results;
}

// ---------------------------------------------------------------------------
// Filter builder
// ---------------------------------------------------------------------------

/**
 * Convert a UI filter collection into weclapp query-string params.
 *
 * weclapp uses `field-operator=value` query params for filtering.
 * This function validates the operator against the 13 supported suffixes
 * and rejects common mistakes (`gte`, `lte`) with a clear error message.
 *
 * Special handling:
 *  - `in` / `notin` : value is JSON-stringified if it is an array; CSV
 *    strings are passed through unchanged (weclapp accepts both forms but
 *    we normalise arrays to JSON).
 *  - `null` / `notnull` : value is omitted (weclapp ignores it anyway).
 *
 * @returns A flat `Record<string,string>` suitable for `qs` in httpRequest.
 */
export function buildFilterParams(
	filters: WeclappFilterItem[],
	node?: { getNode: () => INode },
): Record<string, string> {
	const params: Record<string, string> = {};

	for (const filter of filters) {
		// Strip a leading dash if the UI passed the full suffix (e.g. "-eq" → "eq").
		const op = filter.operator.startsWith('-') ? filter.operator.slice(1) : filter.operator;

		// Friendly error for the two most common silent-failure typos.
		if (op === 'gte' || op === 'lte') {
			const correct = op === 'gte' ? '-ge' : '-le';
			const msg =
				`Invalid weclapp filter operator "-${op}". ` +
				`This operator does not exist and would silently match nothing. ` +
				`Use -ge / -le for greater-or-equal / less-or-equal. ` +
				`Correct operator: "${correct}".`;
			if (node) {
				throw new NodeOperationError(node.getNode(), msg);
			}
			throw new NodeOperationError({ id: '', name: '', type: '', typeVersion: 1, position: [0, 0], parameters: {} }, msg);
		}

		if (!VALID_OPERATORS.has(op)) {
			const msg =
				`Invalid weclapp filter operator "${filter.operator}". ` +
				`Valid operators: ${[...VALID_OPERATORS].map((o) => '-' + o).join(', ')}.`;
			if (node) {
				throw new NodeOperationError(node.getNode(), msg);
			}
			throw new NodeOperationError({ id: '', name: '', type: '', typeVersion: 1, position: [0, 0], parameters: {} }, msg);
		}

		const key = `${filter.field}-${op}`;

		// `null` / `notnull` operators take no value.
		if (op === 'null' || op === 'notnull') {
			params[key] = '';
			continue;
		}

		// `in` / `notin` expect a JSON array. Accept three input forms and
		// normalise to a JSON array string:
		//   - a real array            → JSON.stringify
		//   - an existing JSON array literal ("[...]") → passed through unchanged
		//   - a comma-separated string ("A,B,C")      → wrapped into ["A","B","C"]
		// The CSV convenience means users can type `OPEN,CLOSED` instead of
		// hand-writing `["OPEN","CLOSED"]`.
		if (op === 'in' || op === 'notin') {
			if (Array.isArray(filter.value)) {
				params[key] = JSON.stringify(filter.value);
			} else {
				const raw = String(filter.value ?? '').trim();
				if (raw.startsWith('[')) {
					// Already a JSON array literal — trust the user's input.
					params[key] = raw;
				} else if (raw.length > 0) {
					const values = raw
						.split(',')
						.map((token) => token.trim())
						.filter((token) => token.length > 0);
					params[key] = JSON.stringify(values);
				} else {
					params[key] = '';
				}
			}
			continue;
		}

		params[key] = String(filter.value ?? '');
	}

	return params;
}

// ---------------------------------------------------------------------------
// Error parser
// ---------------------------------------------------------------------------

/**
 * Parse a weclapp RFC 7807 problem response and throw a structured
 * `NodeApiError` with the most useful available detail.
 *
 * Extracts:
 *  - `status`, `title`, `detail` — standard RFC 7807 top-level fields
 *  - `body.items[].validationMessages[].description` — nested field errors
 *
 * 429 responses receive an extra user-friendly rate-limit hint.
 *
 * @param context  The calling function's `this` — needed to construct NodeApiError.
 * @param err      The raw error thrown by httpRequestWithAuthentication.
 */
export function parseApiProblem(context: WeclappFunctions, err: unknown): never {
	// Extract the response body from the error object.
	// n8n wraps HTTP errors in a structure with `cause.response.body` or `body`.
	let body: IDataObject = {};

	if (err && typeof err === 'object') {
		const e = err as Record<string, unknown>;

		// Try err.cause.response.body first (httpRequestWithAuthentication wraps errors).
		const causeBody = (e.cause as Record<string, unknown> | undefined)?.response as
			| Record<string, unknown>
			| undefined;
		if (causeBody?.body && typeof causeBody.body === 'object') {
			body = causeBody.body as IDataObject;
		} else if (e.body && typeof e.body === 'object') {
			body = e.body as IDataObject;
		} else if (e.response && typeof e.response === 'object') {
			const r = e.response as Record<string, unknown>;
			if (r.body && typeof r.body === 'object') {
				body = r.body as IDataObject;
			}
		}
	}

	const status = (body.status as number | string | undefined) ?? '';
	const title = (body.title as string | undefined) ?? '';
	const detail = (body.detail as string | undefined) ?? '';

	// Collect nested field-level validation messages.
	const validationDetails: string[] = [];
	const items = body.items as Array<{ validationMessages?: Array<{ description?: string }> }> | undefined;
	if (Array.isArray(items)) {
		for (const item of items) {
			if (Array.isArray(item.validationMessages)) {
				for (const vm of item.validationMessages) {
					if (vm.description) {
						validationDetails.push(vm.description);
					}
				}
			}
		}
	}

	// Build the human-readable message.
	const detailPart = validationDetails.length > 0 ? validationDetails.join('; ') : detail;
	const parts: string[] = [];
	if (status) parts.push(String(status));
	if (title) parts.push(title);
	if (detailPart) parts.push(detailPart);

	const rawErr = err as Record<string, unknown> | undefined;
	const baseMessage =
		parts.length > 0
			? parts.join(': ')
			: (rawErr?.message as string) || 'Unknown weclapp API error';

	// Prepend rate-limit hint for 429 responses.
	const isRateLimited = String(status) === '429';
	const message = isRateLimited
		? 'Rate limited by weclapp — retry after a moment. ' + baseMessage
		: baseMessage;

	const node = context.getNode();
	throw new NodeApiError(node, body as unknown as JsonObject, {
		message,
		httpCode: status ? String(status) : undefined,
	});
}

// ---------------------------------------------------------------------------
// Simplify helper
// ---------------------------------------------------------------------------

/**
 * Return a reduced view of an entity, keeping only the fields most useful
 * for the given resource. Unknown resources pass through unchanged.
 *
 * Field whitelists are intentionally minimal — they cover the fields that
 * users almost always need without overwhelming the output.
 */
export function simplifyEntity(entity: IDataObject, resource: string): IDataObject {
	const fields = SIMPLIFY_FIELDS[resource];
	if (!fields) {
		// Unknown resource — return the full entity unchanged.
		return entity;
	}

	const simplified: IDataObject = {};
	for (const field of fields) {
		if (Object.prototype.hasOwnProperty.call(entity, field)) {
			simplified[field] = entity[field];
		}
	}
	return simplified;
}

/**
 * postReceive action that applies `simplifyEntity` to each row when the node's
 * `Simplify` toggle is on.
 *
 * Wires up the previously no-op `simplifyField`: reads `this.getNodeParameter('simplify')`
 * (default false, so it is safe to attach even to ops without a Simplify toggle) and,
 * when true, maps every `item.json` through `simplifyEntity(json, resource)` using the
 * current `resource` parameter. Unknown resources pass through unchanged (see
 * simplifyEntity). No-op when simplify is false — items are returned untouched.
 *
 * Attach as the LAST postReceive step (after rootProperty / mergeAdditionalProperties)
 * so it projects the fully-assembled row:
 *   output: { postReceive: [ rootProperty, mergeAdditionalProperties, simplifyPostReceive ] }
 */
export async function simplifyPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simplify = this.getNodeParameter('simplify', false) as boolean;
	if (!simplify) {
		return items;
	}

	const resource = this.getNodeParameter('resource') as string;

	return items.map((item) => ({
		...item,
		json: simplifyEntity(item.json as IDataObject, resource),
	}));
}

// ---------------------------------------------------------------------------
// postReceive: merge additionalProperties onto rows
// ---------------------------------------------------------------------------

/**
 * postReceive action that merges weclapp's index-aligned `additionalProperties`
 * response block onto each output row.
 *
 * weclapp returns extra computed data (e.g. shipment `availability`) as a
 * SIBLING of `result`, index-aligned to it:
 *
 *   { result: [ {id:'1'}, {id:'2'} ],
 *     additionalProperties: { availability: [ {stock:5}, {stock:0} ] } }
 *
 * Without this, `additionalProperties` is lost when `rootProperty: 'result'`
 * unwraps the list. This action reads the ORIGINAL full response (postReceive
 * actions always receive the untouched `response`, even after rootProperty ran)
 * and attaches `row.additionalProperties = { <name>: values[i] }` to each item.
 *
 * No-op when the response carries no `additionalProperties` block, so it is
 * safe to attach to every list op.
 *
 * Attach AFTER the rootProperty step:
 *   output: { postReceive: [ { type:'rootProperty', properties:{ property:'result' } }, mergeAdditionalProperties ] }
 */
export async function mergeAdditionalProperties(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response?.body as IDataObject | undefined;
	const additional = body?.additionalProperties as Record<string, unknown[]> | undefined;

	if (!additional || typeof additional !== 'object' || Array.isArray(additional)) {
		return items;
	}

	return items.map((item, index) => {
		const merged: IDataObject = {};
		for (const [name, values] of Object.entries(additional)) {
			if (Array.isArray(values)) {
				merged[name] = values[index] as IDataObject[keyof IDataObject];
			}
		}

		if (Object.keys(merged).length === 0) {
			return item;
		}

		return {
			...item,
			json: {
				...item.json,
				additionalProperties: merged,
			},
		};
	});
}

// ---------------------------------------------------------------------------
// Binary download helper
// ---------------------------------------------------------------------------

/**
 * Download a binary resource (PDF, image, ZIP) from a weclapp endpoint and
 * return it as n8n binary data.
 *
 * Uses `arraybuffer` encoding and `returnFullResponse: true` so we can read
 * the `Content-Type` header from the actual response.
 *
 * @param method    HTTP method (usually 'GET' or 'POST' for PDF generation actions).
 * @param endpoint  Relative endpoint path.
 * @param filename  Suggested filename for the binary attachment.
 * @param body      Optional request body.
 * @param qs        Optional query-string parameters.
 */
export async function handleBinaryDownload(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	filename: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<INodeExecutionData> {
	const url = await resolveWeclappUrl(this, endpoint);
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weclappApi', {
		method,
		url,
		body,
		qs,
		encoding: 'arraybuffer',
		returnFullResponse: true,
	});

	const fullResponse = response as {
		body: Buffer;
		headers: Record<string, string>;
	};

	const contentType =
		fullResponse.headers['content-type'] ?? 'application/octet-stream';

	const binaryData = await this.helpers.prepareBinaryData(
		fullResponse.body,
		filename,
		contentType,
	);

	return {
		json: {},
		binary: {
			data: binaryData,
		},
	};
}
