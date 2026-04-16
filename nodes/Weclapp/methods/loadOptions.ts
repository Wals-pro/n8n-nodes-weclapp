import type { ILoadOptionsFunctions, INodeListSearchResult, INodePropertyOptions } from 'n8n-workflow';

// Full implementation in unit 21.
// Each method will call weclappApiRequest to fetch options from the weclapp API.

export const loadOptions: Record<string, (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>> = {
	// e.g. getCurrencies, getPaymentMethods, getTermsOfPayment, ...
	// workers add entries here
};

export const listSearch: Record<
	string,
	(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	) => Promise<INodeListSearchResult>
> = {
	// e.g. searchArticles, searchParties, searchWarehouses, ...
	// workers add entries here
};
