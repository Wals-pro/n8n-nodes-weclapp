import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPollFunctions,
} from 'n8n-workflow';

type WeclappFunctions =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions;

export interface WeclappFilterItem {
	field: string;
	operator: string;
	value: string;
}

/**
 * Make an authenticated request to the weclapp API.
 * Handles RFC 7807 error parsing and throws NodeOperationError on failure.
 * Full implementation in unit 2.
 */
export async function weclappApiRequest(
	this: WeclappFunctions,
	_method: string,
	_endpoint: string,
	_body?: IDataObject,
	_qs?: IDataObject,
): Promise<IDataObject> {
	throw new Error('not implemented');
}

/**
 * Fetch all pages of a paginated weclapp list endpoint.
 * Uses page-based pagination with pageSize up to 1000.
 * Full implementation in unit 2.
 */
export async function weclappApiRequestAllItems(
	this: WeclappFunctions,
	_method: string,
	_endpoint: string,
	_qs?: IDataObject,
	_pageSize?: number,
): Promise<IDataObject[]> {
	throw new Error('not implemented');
}

/**
 * Convert a filters collection array into weclapp query params.
 * e.g. [{field: "status", operator: "-eq", value: "NEW"}] → {"status-eq": "NEW"}
 * Full implementation in unit 2.
 */
export function buildFilterParams(_filters: WeclappFilterItem[]): IDataObject {
	return {};
}

/**
 * Parse a weclapp RFC 7807 API problem response into a readable error message.
 * Extracts title + nested items[].validationMessages[].
 * Full implementation in unit 2.
 */
export function parseApiProblem(err: IDataObject): never {
	const message = (err.detail as string) || (err.title as string) || 'Unknown weclapp API error';
	throw new Error(message);
}

/**
 * Return a simplified subset of entity fields (5-10 most useful).
 * Default simplification per resource type. Full implementation in unit 2.
 */
export function simplifyEntity(entity: IDataObject, _resource: string): IDataObject {
	return entity;
}

/**
 * Handle a binary (PDF/image) download response and attach it as n8n binary data.
 * Full implementation in unit 2.
 */
export async function handleBinaryDownload(
	this: IExecuteFunctions,
	_response: IDataObject,
): Promise<INodeExecutionData> {
	throw new Error('not implemented');
}
