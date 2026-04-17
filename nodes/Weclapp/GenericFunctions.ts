import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
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

/** Fields kept per resource when simplify = true. */
const SIMPLIFY_FIELDS: Record<string, string[]> = {
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

		// `in` / `notin` accept either a JSON array or a raw value; normalise arrays.
		if (op === 'in' || op === 'notin') {
			if (Array.isArray(filter.value)) {
				params[key] = JSON.stringify(filter.value);
			} else {
				params[key] = String(filter.value ?? '');
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
