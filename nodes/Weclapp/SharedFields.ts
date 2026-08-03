import type {
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
	INodePropertyRouting,
	IN8nRequestOperationPaginationOffset,
	ResourceMapperValue,
} from 'n8n-workflow';

import { buildFilterParams, type WeclappFilterItem } from './GenericFunctions';
import { buildWeclappCustomAttributes } from './methods/customAttributes';

/** A single filter entry read from the fixedCollection at runtime. value is absent for null/notnull operators. */
export type WeclappFilterEntry = { field: string; operator: string; value?: string };

// ---------------------------------------------------------------------------
// Pagination config
// ---------------------------------------------------------------------------

/**
 * Native n8n offset-pagination config for weclapp list operations.
 *
 * Resource descriptors can spread this into their list op's `routing.operations`
 * to get automatic multi-page fetching when returnAll = true.
 *
 * NOTE: Resource descriptors are NOT wired to this yet — that is a follow-up
 * task (see #29 partial). The constant is exported so follow-up workers can
 * consume it without touching SharedFields again.
 *
 * Shape verified against IN8nRequestOperationPaginationOffset from n8n-workflow.
 */
export const paginationConfig: IN8nRequestOperationPaginationOffset = {
	type: 'offset' as const,
	properties: {
		limitParameter: 'pageSize',
		offsetParameter: 'page',
		pageSize: 1000,
		rootProperty: 'result',
		type: 'query' as const,
	},
};

// ---------------------------------------------------------------------------
// preSend: filters
// ---------------------------------------------------------------------------

/**
 * PreSend action for filtersCollection.
 *
 * Reads the `filters` fixedCollection value from the current node parameter,
 * converts each entry to a `field-operator=value` weclapp query param via
 * buildFilterParams, and merges the result into requestOptions.qs.
 *
 * This is the routing hook that fixes #57: without it, UI-configured filters
 * are collected but never sent to the weclapp API.
 *
 * Attached on the top-level `filtersCollection` INodeProperties.routing because
 * INodePropertyCollection (inner option groups) does not carry a routing field.
 */
export async function filtersPreSend(
	this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// fixedCollection shape: { filter: Array<{ field, operator, value }> }
	const filtersParam = this.getNodeParameter('filters', {}) as {
		filter?: Array<{ field: string; operator: string; value?: string }>;
	};

	const entries = filtersParam?.filter ?? [];

	// buildFilterParams validates operators and produces { 'field-op': 'value' }
	// Cast is safe: WeclappFilterItem.value is `unknown`; our entries have value?: string
	// which is compatible at runtime (undefined handled as empty string in buildFilterParams).
	const filterQs = entries.length > 0 ? buildFilterParams(entries as WeclappFilterItem[]) : {};

	// B3 rawFilter escape hatch: a verbatim weclapp `filter=` grammar expression
	// (supports OR/parentheses, e.g. `((shipped = true) or (fulfillmentProviderId null))`).
	// The first non-empty expression wins and is sent as `qs.filter` untouched (trimmed).
	// NOTE: mixing rawFilter with field-op filters is NOT additive — both are sent, and
	// weclapp combines them per its own semantics; prefer one approach per request.
	const rawFilterParam = this.getNodeParameter('filters', {}) as {
		rawFilter?: Array<{ expression?: string }>;
	};
	const rawExpression = (rawFilterParam?.rawFilter ?? [])
		.map((entry) => entry?.expression?.trim())
		.find((expr) => expr && expr.length > 0);

	const rawFilterQs: Record<string, string> = {};
	if (rawExpression) {
		rawFilterQs.filter = rawExpression;
	}

	if (entries.length === 0 && !rawExpression) {
		return requestOptions;
	}

	return {
		...requestOptions,
		qs: {
			...(requestOptions.qs ?? {}),
			...filterQs,
			...rawFilterQs,
		},
	};
}

// ---------------------------------------------------------------------------
// preSend: additionalFields (query projection)
// ---------------------------------------------------------------------------

/**
 * PreSend action for the shared `additionalFields` collection.
 *
 * Reads the `additionalFields` collection value and merges its query-level
 * projection modifiers into requestOptions.qs:
 *   - properties                → `properties` (field projection)
 *   - includeReferencedEntities → `includeReferencedEntities` (expand refs)
 *   - serializeNulls            → `serializeNulls` (only sent when true)
 *
 * Fixes the projection gap surfaced by the Ayurvedashop autopilot: the
 * collection children carried no `routing`, so `properties` (and the other two)
 * were collected in the UI but never reached the weclapp API — every GET/list
 * op silently returned the full entity instead of the requested projection.
 *
 * Attached on the top-level `additionalFields` INodeProperties.routing for the
 * same reason as filtersPreSend: INodePropertyCollection children do not carry
 * a routing field. Comma lists are whitespace-normalized but colons are
 * preserved so referenced-entity projections like `salesOrder:id` survive.
 */
export async function additionalFieldsPreSend(
	this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = this.getNodeParameter('additionalFields', {}) as {
		properties?: string;
		includeReferencedEntities?: string;
		additionalProperties?: string;
		serializeNulls?: boolean;
	};

	// Trim each comma-separated token and drop empties; keep colons intact so
	// weclapp colon-projections (e.g. `salesOrder:id`) are not mangled.
	const normalizeCsv = (raw: string): string =>
		raw
			.split(',')
			.map((token) => token.trim())
			.filter((token) => token.length > 0)
			.join(',');

	const additions: Record<string, string | boolean> = {};

	const properties = params?.properties?.trim();
	if (properties) {
		additions.properties = normalizeCsv(properties);
	}

	const includeReferencedEntities = params?.includeReferencedEntities?.trim();
	if (includeReferencedEntities) {
		additions.includeReferencedEntities = normalizeCsv(includeReferencedEntities);
	}

	// additionalProperties requests weclapp's computed sibling block (e.g.
	// shipment `availability`); mergeAdditionalProperties (postReceive) folds
	// the index-aligned response back onto each row.
	const requestedAdditionalProperties = params?.additionalProperties?.trim();
	if (requestedAdditionalProperties) {
		additions.additionalProperties = normalizeCsv(requestedAdditionalProperties);
	}

	// weclapp defaults serializeNulls to false — only send when explicitly enabled.
	if (params?.serializeNulls === true) {
		additions.serializeNulls = true;
	}

	if (Object.keys(additions).length === 0) {
		return requestOptions;
	}

	return {
		...requestOptions,
		qs: {
			...(requestOptions.qs ?? {}),
			...additions,
		},
	};
}

// ---------------------------------------------------------------------------
// preSend: empty JSON body for arraybuffer POST ops
// ---------------------------------------------------------------------------

/**
 * PreSend hook for arraybuffer POST operations that have no request body fields
 * (e.g. createPickingList, createQuotationPdf).
 *
 * Problem: n8n's `convertN8nRequestToAxios` skips setting `axiosConfig.data`
 * when `body` is an empty plain object `{}` (it calls `isObjectEmpty` and
 * short-circuits). This means the HTTP request is sent with no body at all,
 * and weclapp returns HTTP 400 "body is not a json object" because
 * Content-Type: application/json is set (from requestDefaults) but the body
 * is empty.
 *
 * Fix: set `requestOptions.body` to the JSON string `'{}'` (not the object
 * `{}`). `convertN8nRequestToAxios` has `typeof body === 'string'` as the
 * first branch in its truthy check, so a string always passes through and
 * is set as `axiosConfig.data = '{}'`. Axios then sends `Content-Length: 2`
 * and weclapp receives a valid empty JSON object body.
 *
 * This preSend runs AFTER the routing-node merges all field-level body keys,
 * so it must only be attached to ops that have NO body fields (ops that rely
 * on field routing for their body should NOT use this hook).
 */
/**
 * @deprecated The preSend approach for empty JSON bodies doesn't reliably fire in all
 * n8n routing-node execution contexts. Use `routing.request.body: '{}'` in the operation
 * definition instead (sets body as a string literal, bypassing the isObjectEmpty check in
 * convertN8nRequestToAxios). Kept for completeness but not used in current ShipmentDescription.
 */
export async function emptyJsonBodyPreSend(
	this: unknown,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return {
		...requestOptions,
		body: '{}',
	};
}

// ---------------------------------------------------------------------------
// limit + implicit pagination
// ---------------------------------------------------------------------------

/**
 * n8n's standard "Return All" toggle for List operations.
 *
 * UX contract (the pair returnAll + limit, per n8n's UX guidelines):
 *   - Return All off → a single request with `pageSize` = Limit (≤ 1000, the
 *     weclapp API maximum for a single page).
 *   - Return All on  → `pageSize` is forced to 1000 and the list op paginates
 *     automatically until weclapp returns a short page (see listPaginationRouting).
 *
 * The `pageSize` routing lives here rather than on limitField because Limit is
 * hidden when Return All is on, and hidden properties contribute no routing.
 */
export const returnAllField: INodeProperties = {
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
	routing: {
		send: {
			type: 'query',
			property: 'pageSize',
			value: '={{ $value ? 1000 : $parameter.limit }}',
		},
	},
};

/**
 * Companion Limit field, shown only while Return All is off. Follows n8n's
 * limit convention (default 50, minimum 1, canonical description) — the
 * verified-community-node scan gate enforces all three and ignores inline
 * eslint-disable comments.
 *
 * maxValue is 1000 because that is weclapp's per-page ceiling; larger result
 * sets are served by Return All, which paginates.
 */
export const limitField: INodeProperties = {
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	default: 50,
	description: 'Max number of results to return',
	typeOptions: {
		minValue: 1,
		maxValue: 1000,
	},
};

/**
 * Builds the returnAll + limit pair for one resource's List operation, already
 * scoped with displayOptions. Spread into a descriptor's fields array:
 *   ...listLimitFields('article')
 *
 * Limit additionally hides behind `returnAll: [false]`, so the two fields never
 * show at once.
 */
export const listLimitFields = (resource: string, operation = 'list'): INodeProperties[] => [
	{
		...returnAllField,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
	},
	{
		...limitField,
		displayOptions: {
			show: { resource: [resource], operation: [operation], returnAll: [false] },
		},
	},
];

/**
 * Routing fragment enabling auto-pagination on a List operation.
 * Spread into the list op's `routing`, alongside `request` and `output`:
 *   routing: { request: {...}, ...listPaginationRouting, output: {...} }
 *
 * `send.paginate` is a boolean-valued expression: pagination runs only when
 * Return All is on. Otherwise the single request uses pageSize = Limit.
 */
export const listPaginationRouting: Pick<INodePropertyRouting, 'operations' | 'send'> = {
	operations: {
		pagination: paginationConfig,
	},
	send: {
		paginate: '={{ $parameter.returnAll }}',
	},
};

// ---------------------------------------------------------------------------
// filtersCollection
// ---------------------------------------------------------------------------

/**
 * Filters fixedCollection mapping to weclapp query-param suffixes.
 * Lists exactly the 14 valid suffixes — `-gte` and `-lte` are omitted because
 * weclapp silently ignores unknown suffixes, returning unfiltered results.
 *
 * Fix #57: `routing.send.preSend` on the top-level property calls
 * filtersPreSend which reads filters.filter, calls buildFilterParams, and
 * merges the result into qs. Without this hook, UI filters are silently dropped.
 *
 * Fix #58: the `value` child field no longer has `displayOptions` — n8n
 * crashes with "Could not resolve parameter dependencies / max iterations" when
 * a collection or fixedCollection child carries displayOptions. The description
 * still explains when to leave the field empty.
 */
export const filtersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'fixedCollection',
	placeholder: 'Add filter',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	// #57 fix: preSend attached here (top-level INodeProperties.routing) because
	// INodePropertyCollection (fixedCollection option groups) does not carry routing.
	routing: {
		send: {
			preSend: [filtersPreSend],
		},
	},
	options: [
		{
			displayName: 'Filter',
			name: 'filter',
			values: [
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
					required: true,
					default: '',
					description: 'Entity property name (e.g., articleNumber, partyType)',
					placeholder: 'e.g. articleNumber',
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					default: 'eq',
					options: [
						{
							name: 'Case-Insensitive Like',
							value: 'ilike',
							description: 'Case-insensitive LIKE pattern matching',
						},
						{
							name: 'Case-Insensitive Not Like',
							value: 'notilike',
							description: 'Case-insensitive negated LIKE pattern matching',
						},
						{
							name: 'Equals',
							value: 'eq',
							description: 'Field value equals the given value',
						},
						{
							name: 'Greater Than',
							value: 'gt',
							description: 'Field value is strictly greater than the given value',
						},
						{
							name: 'Greater Than or Equal',
							value: 'ge',
							description: 'Field value is greater than or equal to the given value',
						},
						{
							name: 'In (JSON Array)',
							value: 'in',
							description: 'Field value is one of the values in a JSON array (e.g., ["a","b"])',
						},
						{
							name: 'Is Not Null',
							value: 'notnull',
							description: 'Field value is not null (leave Value empty)',
						},
						{
							name: 'Is Null',
							value: 'null',
							description: 'Field value is null (leave Value empty)',
						},
						{
							name: 'Less Than',
							value: 'lt',
							description: 'Field value is strictly less than the given value',
						},
						{
							name: 'Less Than or Equal',
							value: 'le',
							description: 'Field value is less than or equal to the given value',
						},
						{
							name: 'Like',
							value: 'like',
							description: 'SQL-style LIKE pattern matching (use % and _ wildcards)',
						},
						{
							name: 'Not Equals',
							value: 'ne',
							description: 'Field value does not equal the given value',
						},
						{
							name: 'Not In (JSON Array)',
							value: 'notin',
							description:
								'Field value is not one of the values in a JSON array (e.g., ["a","b"])',
						},
						{
							name: 'Not Like',
							value: 'notlike',
							description: 'Negated SQL-style LIKE pattern matching',
						},
					],
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					// displayOptions intentionally removed — fix #58: n8n crashes with
					// "Could not resolve parameter dependencies / max iterations" when
					// a fixedCollection/collection child has displayOptions. The description
					// below explains when to leave this empty instead.
					description:
						'Filter value. For in/notin use a JSON array (e.g. ["a","b"]). For null/notnull operators leave this empty — the value is ignored by weclapp.',
				},
			],
		},
		{
			displayName: 'Raw Filter',
			name: 'rawFilter',
			values: [
				{
					displayName: 'Expression',
					name: 'expression',
					type: 'string',
					typeOptions: {
						rows: 3,
					},
					default: '',
					placeholder: '((shipped = true) or (fulfillmentProviderId null))',
					description:
						"Raw weclapp filter= expression, sent verbatim as the API's `filter` query parameter. Supports OR / AND / parentheses per the weclapp filter grammar. Warning: mixing this with the field-operator filters above is not additive — prefer one approach per request.",
				},
			],
		},
	],
};

// ---------------------------------------------------------------------------
// additionalFields
// ---------------------------------------------------------------------------

/**
 * Optional query-level modifiers available on most List and Get operations.
 *
 * The `preSend: [additionalFieldsPreSend]` hook is what actually sends these to
 * weclapp: collection children cannot carry `routing`, so without the top-level
 * preSend the projection fields were silently dropped (fixed alongside #57's
 * filters pattern).
 */
export const additionalFields: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add field',
	default: {},
	routing: {
		send: {
			preSend: [additionalFieldsPreSend],
		},
	},
	options: [
		{
			displayName: 'Properties',
			name: 'properties',
			type: 'string',
			default: '',
			description: 'Comma-separated list of fields to include in the response',
			placeholder: 'e.g. ID,articleNumber,name',
		},
		{
			displayName: 'Include Referenced Entities',
			name: 'includeReferencedEntities',
			type: 'string',
			default: '',
			description: 'Comma-separated list of referenced entity IDs to expand',
			placeholder: 'e.g. article,party',
		},
		{
			displayName: 'Additional Properties',
			name: 'additionalProperties',
			type: 'string',
			default: '',
			description:
				'Comma-separated list of weclapp computed properties to fetch (returned index-aligned and merged onto each row under `additionalProperties`)',
			placeholder: 'e.g. availability,currentSalesPrice',
		},
		{
			displayName: 'Serialize Nulls',
			name: 'serializeNulls',
			type: 'boolean',
			default: false,
			description: 'Whether to include null-valued fields in the response',
		},
	],
};

// ---------------------------------------------------------------------------
// Misc shared fields
// ---------------------------------------------------------------------------

/** When true, weclapp ignores fields absent from the PUT body instead of clearing them. Attach to Update operations only. */
export const ignoreMissingPropertiesField: INodeProperties = {
	displayName: 'Ignore Missing Properties',
	name: 'ignoreMissingProperties',
	type: 'boolean',
	default: true,
	description:
		'Whether to ignore fields missing from the body on update (weclapp PUT with ignoreMissingProperties=true)',
};

export const simplifyField: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
};

// ---------------------------------------------------------------------------
// customAttributes resourceMapper (typed, Berlin-correct dates)
// ---------------------------------------------------------------------------

/**
 * PreSend action for the shared `customAttributes` resourceMapper field.
 *
 * Declarative routing cannot call `buildWeclappCustomAttributes` inline, so — as
 * with filtersPreSend — the transform runs in a preSend hook. It reads the
 * resourceMapper value from the `customAttributes` node parameter, builds the
 * weclapp `customAttributes[]` array, and merges it into requestOptions.body
 * without clobbering the other body keys the field routing already assembled.
 *
 * Guards:
 *  - When the resourceMapper is empty (no mapped values) nothing is added.
 *  - When the body is a JSON string (empty-body ops) it is left untouched — the
 *    entities that expose this field always assemble their body from `type:'body'`
 *    collection fields, so the body is a plain object here.
 */
export async function customAttributesPreSend(
	this: { getNodeParameter: (name: string, fallback?: unknown) => unknown },
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const rmv = this.getNodeParameter('customAttributes', {}) as
		| Pick<ResourceMapperValue, 'value' | 'schema'>
		| undefined;

	const attributes = rmv ? buildWeclappCustomAttributes(rmv) : [];
	if (attributes.length === 0) {
		return requestOptions;
	}

	// Only merge into an object body; leave string bodies untouched.
	const existingBody =
		requestOptions.body && typeof requestOptions.body === 'object'
			? (requestOptions.body as IDataObject)
			: {};

	return {
		...requestOptions,
		body: {
			...existingBody,
			customAttributes: attributes,
		},
	};
}

/**
 * Shared `Custom Attributes` field (n8n resourceMapper). Spread into the
 * create/update body region of each entity that supports custom attributes,
 * overriding `displayOptions` for the concrete resource:
 *   { ...customAttributesField, displayOptions: { show: { resource:['party'], operation:['create','update'] } } }
 *
 * A single generic resourceMapping method (`getCustomAttributeFields`) resolves
 * the entity from the current `resource` parameter, so one field definition works
 * for every entity. The `customAttributesPreSend` hook injects the built array
 * into the request body.
 */
export const customAttributesField: INodeProperties = {
	displayName: 'Custom Attributes',
	name: 'customAttributes',
	type: 'resourceMapper',
	noDataExpression: true,
	default: { mappingMode: 'defineBelow', value: null },
	description: 'Set weclapp custom attributes for this record, typed by their definition',
	typeOptions: {
		loadOptionsDependsOn: ['resource'],
		resourceMapper: {
			resourceMapperMethod: 'getCustomAttributeFields',
			mode: 'add',
			fieldWords: {
				singular: 'custom attribute',
				plural: 'custom attributes',
			},
			addAllFields: false,
			multiKeyMatch: false,
			supportAutoMap: false,
		},
	},
	routing: {
		send: {
			preSend: [customAttributesPreSend],
		},
	},
};
