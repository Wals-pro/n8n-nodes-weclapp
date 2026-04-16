import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

import { weclappApiRequest, weclappApiRequestAllItems } from '../GenericFunctions';

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

const LIST_SEARCH_PAGE_SIZE = 50;

function decodePageToken(token: string | undefined): number {
	if (!token) return 1;
	const n = parseInt(token, 10);
	return Number.isFinite(n) && n > 0 ? n : 1;
}

function encodeNextPageToken(currentPage: number, resultCount: number, pageSize: number): string | undefined {
	return resultCount >= pageSize ? String(currentPage + 1) : undefined;
}

// ---------------------------------------------------------------------------
// Factories — eliminate per-provider boilerplate
// ---------------------------------------------------------------------------

/**
 * Build a listSearch method for a standard weclapp entity.
 *
 * @param endpoint   - weclapp REST path, e.g. '/article'
 * @param properties - comma-separated field list to project
 * @param filterField - field name to apply the ilike filter on (when filter provided)
 * @param toName     - map a result item to its display label
 */
function makeListSearch(
	endpoint: string,
	properties: string,
	filterField: string,
	toName: (item: IDataObject) => string,
): (this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) => Promise<INodeListSearchResult> {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const page = decodePageToken(paginationToken);
		const qs: IDataObject = { properties, pageSize: LIST_SEARCH_PAGE_SIZE, page };
		if (filter) {
			qs[`${filterField}-ilike`] = `%${filter}%`;
		}
		const response = await weclappApiRequest.call(this, 'GET', endpoint, undefined, qs);
		const items = (response.result as IDataObject[]) ?? [];
		const results: INodeListSearchItems[] = items.map((item) => ({
			name: toName(item),
			value: item.id as string,
		}));
		return {
			results,
			paginationToken: encodeNextPageToken(page, items.length, LIST_SEARCH_PAGE_SIZE),
		};
	};
}

/**
 * Build a loadOptions method that fetches a bounded reference list (single page, pageSize 1000).
 */
function makeSimpleLoadOptions(
	endpoint: string,
	toName: (item: IDataObject) => string = (item) => String(item.name ?? item.id),
): (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]> {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await weclappApiRequest.call(this, 'GET', endpoint, undefined, { pageSize: 1000 });
		const items = (response.result as IDataObject[]) ?? [];
		return items.map((item) => ({ name: toName(item), value: item.id as string }));
	};
}

// ---------------------------------------------------------------------------
// listSearch — server-side search for resource locators
// ---------------------------------------------------------------------------

export const listSearch: Record<
	string,
	(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) => Promise<INodeListSearchResult>
> = {
	searchArticles: makeListSearch(
		'/article',
		'id,articleNumber,name',
		'articleNumber',
		(item) => [item.articleNumber, item.name].filter(Boolean).join(' — '),
	),

	searchParties: makeListSearch(
		'/party',
		'id,partyNumber,name,firstName,lastName',
		'name',
		(item) => {
			// Prefer company name; fall back to first+last for contact-only parties.
			const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');
			const label = item.name || fullName || String(item.partyNumber ?? item.id);
			return [item.partyNumber, label].filter(Boolean).join(' — ');
		},
	),

	searchSalesOrders: makeListSearch(
		'/salesOrder',
		'id,orderNumber,commission',
		'orderNumber',
		(item) => [item.orderNumber, item.commission].filter(Boolean).join(' — '),
	),

	searchPurchaseOrders: makeListSearch(
		'/purchaseOrder',
		'id,orderNumber',
		'orderNumber',
		(item) => String(item.orderNumber ?? item.id),
	),

	searchSalesInvoices: makeListSearch(
		'/salesInvoice',
		'id,invoiceNumber',
		'invoiceNumber',
		(item) => String(item.invoiceNumber ?? item.id),
	),

	searchPurchaseInvoices: makeListSearch(
		'/purchaseInvoice',
		'id,invoiceNumber',
		'invoiceNumber',
		(item) => String(item.invoiceNumber ?? item.id),
	),

	searchQuotations: makeListSearch(
		'/quotation',
		'id,quotationNumber',
		'quotationNumber',
		(item) => String(item.quotationNumber ?? item.id),
	),

	searchArticleCategories: makeListSearch(
		'/articleCategory',
		'id,name',
		'name',
		(item) => String(item.name ?? item.id),
	),
};

// ---------------------------------------------------------------------------
// loadOptions — bounded reference lists for dropdown fields
// ---------------------------------------------------------------------------

export const loadOptions: Record<string, (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>> = {
	// Warehouses can be numerous — fetch all pages to avoid truncation.
	getWarehouses: async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await weclappApiRequestAllItems.call(this, 'GET', '/warehouse');
		return items.map((item) => ({ name: String(item.name ?? item.id), value: item.id as string }));
	},

	getCurrencies: makeSimpleLoadOptions('/currency'),
	getPaymentMethods: makeSimpleLoadOptions('/paymentMethod'),
	getTermsOfPayment: makeSimpleLoadOptions('/termOfPayment'),
	getTags: makeSimpleLoadOptions('/tag'),
	getUnits: makeSimpleLoadOptions('/unit'),

	// Users: filter to active only and build a readable full-name label.
	getUsers: async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await weclappApiRequest.call(this, 'GET', '/user', undefined, {
			'active-eq': 'true',
			pageSize: 1000,
		});
		const items = (response.result as IDataObject[]) ?? [];
		return items.map((item) => {
			const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');
			return { name: fullName || String(item.username ?? item.id), value: item.id as string };
		});
	},
};
