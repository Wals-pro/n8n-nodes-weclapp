/**
 * "On Error" handling for the programmatic customOperations.
 *
 * Regression: a failing item threw out of the handler loop. With "Continue
 * (using error output)" n8n then passed the untouched input items to the
 * success output — a failed write looked like a success, and in a mixed batch
 * the responses of the items that did succeed were lost.
 *
 * The HTTP errors here mimic what n8n's httpRequestWithAuthentication throws in
 * a real run: a NodeApiError with `httpCode` and the weclapp problem body in
 * `context.data` (verified live against weclapp Testhandel, n8n 2.43.4).
 */

import { describe, it, expect, vi } from 'vitest';
import type { IDataObject, INode, INodeExecutionData, INodeType, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { Weclapp } from '../../nodes/Weclapp/Weclapp.node';
import { executePerItem, parseApiProblem } from '../../nodes/Weclapp/GenericFunctions';

const node: INode = {
	id: 'n1',
	name: 'weclapp',
	type: '@wals-pro/n8n-nodes-weclapp.weclapp',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

const notFoundBody = {
	status: 404,
	title: 'not found',
	detail: 'salesOpenItem with id 999999999 not found',
	type: '/webapp/view/api/errors.html#!/errors/notFound',
};

/** The error shape n8n's httpRequestWithAuthentication throws for a weclapp 404. */
function n8nHttpError(): NodeApiError {
	const error = new NodeApiError(node, { message: 'Request failed with status code 404' } as JsonObject, {
		httpCode: '404',
	});
	error.context = { ...error.context, data: notFoundBody };
	return error;
}

type CustomOps = Record<string, Record<string, (this: unknown) => Promise<INodeExecutionData[][]>>>;
const customOperations = (new Weclapp() as unknown as INodeType & { customOperations: CustomOps })
	.customOperations;

interface ContextOptions {
	items: INodeExecutionData[];
	continueOnFail: boolean;
	params?: (name: string, itemIndex: number) => unknown;
	http?: (options: { method: string; url: string }) => Promise<unknown>;
}

function context({ items, continueOnFail, params, http }: ContextOptions) {
	return {
		getInputData: () => items,
		getNode: () => node,
		continueOnFail: () => continueOnFail,
		getCredentials: async () => ({ baseUrl: 'https://testhandel.weclapp.com/webapp/api/v2' }),
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) =>
			params ? (params(name, itemIndex) ?? fallback) : fallback,
		helpers: {
			httpRequestWithAuthentication: vi.fn(async (_cred: string, options: { method: string; url: string }) =>
				http ? await http(options) : {},
			),
		},
	};
}

/** Parameters of a Custom API Call: POST salesOpenItem/id/<item id>/createPaymentApplication */
function customCallParams(items: INodeExecutionData[]) {
	const fixed: Record<string, unknown> = {
		method: 'POST',
		entityPath: 'salesOpenItem',
		action: 'createPaymentApplication',
		returnBinary: false,
		binaryPropertyName: 'data',
		'queryParameters.parameter': [],
		requestBody: '{}',
	};
	return (name: string, itemIndex: number) =>
		name === 'entityId' ? items[itemIndex].json.id : fixed[name];
}

/** The split n8n applies for "Continue (using error output)" (workflow-execute.ts handleNodeErrorOutput). */
function splitLikeN8n(output: INodeExecutionData[]) {
	const isError = (item: INodeExecutionData) =>
		!!item.error ||
		(!!item.json.error &&
			Object.keys(item.json).every((key) => ['error', 'message', 'details'].includes(key)));
	return {
		success: output.filter((item) => !isError(item)),
		errors: output.filter(isError),
	};
}

describe('Custom API Call — On Error', () => {
	it('a 404 with continueOnFail becomes an error item, not the raw input item', async () => {
		const items = [{ json: { id: '999999999', note: 'input item' } }];
		const ctx = context({
			items,
			continueOnFail: true,
			params: customCallParams(items),
			http: async () => {
				throw n8nHttpError();
			},
		});

		const [output] = await customOperations.customApiCall.call.call(ctx);
		const { success, errors } = splitLikeN8n(output);

		expect(success).toHaveLength(0);
		expect(errors).toHaveLength(1);
		expect(errors[0].pairedItem).toEqual({ item: 0 });
		expect(errors[0].json.error).toContain('salesOpenItem with id 999999999 not found');
		expect((errors[0].json.details as IDataObject).httpCode).toBe('404');
		expect(errors[0].json).not.toHaveProperty('note');
		// No item-level error object: n8n's normalizeNodeErrors would replace json
		// with { error: message } and drop details. json alone routes the item.
		expect(errors[0].error).toBeUndefined();
		expect(Object.keys(errors[0].json).sort()).toEqual(['details', 'error']);
	});

	it('mixed batch: the good item keeps its response on success, the bad one goes to error', async () => {
		const items = [{ json: { id: '1' } }, { json: { id: '999999999' } }, { json: { id: '2' } }];
		const ctx = context({
			items,
			continueOnFail: true,
			params: customCallParams(items),
			http: async ({ url }) => {
				if (url.includes('/id/999999999/')) throw n8nHttpError();
				return { applied: true, url };
			},
		});

		const [output] = await customOperations.customApiCall.call.call(ctx);
		const { success, errors } = splitLikeN8n(output);

		expect(output.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 2 }]);
		expect(success.map((item) => item.json.applied)).toEqual([true, true]);
		expect(success.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 2 }]);
		expect(errors).toHaveLength(1);
		expect(errors[0].pairedItem).toEqual({ item: 1 });
	});

	it('without continueOnFail the run still stops with the weclapp error', async () => {
		const items = [{ json: { id: '1' } }, { json: { id: '999999999' } }];
		const http = vi.fn(async ({ url }: { url: string }) => {
			if (url.includes('/id/999999999/')) throw n8nHttpError();
			return { applied: true };
		});
		const ctx = context({ items, continueOnFail: false, params: customCallParams(items), http });

		const run = customOperations.customApiCall.call.call(ctx);
		await expect(run).rejects.toBeInstanceOf(NodeApiError);
		await expect(run).rejects.toMatchObject({
			httpCode: '404',
			message: expect.stringContaining('salesOpenItem with id 999999999 not found'),
			context: expect.objectContaining({ itemIndex: 1 }),
		});
		expect(http).toHaveBeenCalledTimes(2);
	});

	it('a parameter error (invalid JSON body) also becomes an error item', async () => {
		const items = [{ json: { id: '1' } }];
		const base = customCallParams(items);
		const ctx = context({
			items,
			continueOnFail: true,
			params: (name, i) => (name === 'requestBody' ? '{not json' : base(name, i)),
		});

		const [output] = await customOperations.customApiCall.call.call(ctx);
		expect(output).toHaveLength(1);
		expect(splitLikeN8n(output).errors).toHaveLength(1);
		expect(output[0].json.error).toContain('invalid JSON');
	});
});

describe('every customOperation honours On Error', () => {
	const handlers: Array<[string, string]> = [
		['article', 'updatePrices'],
		['purchaseInvoice', 'applyPayment'],
		['customApiCall', 'call'],
		['document', 'upload'],
		['document', 'uploadNewVersion'],
	];

	it.each(handlers)('%s.%s returns one error item per failing input item', async (resource, operation) => {
		const items = [{ json: { n: 1 } }, { json: { n: 2 } }];
		const ctx = context({
			items,
			continueOnFail: true,
			params: () => {
				throw new Error('boom');
			},
		});

		const [output] = await customOperations[resource][operation].call(ctx);
		const { success, errors } = splitLikeN8n(output);

		expect(success).toHaveLength(0);
		expect(errors.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(errors.every((item) => String(item.json.error).includes('boom'))).toBe(true);
	});

	it.each(handlers)('%s.%s still throws without continueOnFail', async (resource, operation) => {
		const ctx = context({
			items: [{ json: {} }],
			continueOnFail: false,
			params: () => {
				throw new Error('boom');
			},
		});

		await expect(customOperations[resource][operation].call(ctx)).rejects.toThrow('boom');
	});
});

describe('executePerItem', () => {
	it('adds pairedItem when the handler leaves it out and flattens array output', async () => {
		const ctx = context({ items: [{ json: {} }, { json: {} }], continueOnFail: false });
		const [output] = await executePerItem.call(ctx as never, async (i) =>
			i === 0 ? { json: { a: 1 } } : [{ json: { b: 1 } }, { json: { b: 2 } }],
		);
		expect(output.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 1 }]);
	});
});

describe('parseApiProblem with the error n8n throws in a real run', () => {
	it('reads the weclapp body from context.data and keeps the HTTP status', () => {
		const ctx = context({ items: [], continueOnFail: false });
		let thrown: unknown;
		try {
			parseApiProblem(ctx as never, n8nHttpError());
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(NodeApiError);
		expect((thrown as NodeApiError).httpCode).toBe('404');
		expect((thrown as NodeApiError).message).toBe(
			'404: not found: salesOpenItem with id 999999999 not found',
		);
	});

	it('does not repeat the text when weclapp sends the same title and detail', () => {
		const ctx = context({ items: [], continueOnFail: false });
		const error = new NodeApiError(node, { message: 'Request failed with status code 404' } as JsonObject, {
			httpCode: '404',
		});
		error.context = { ...error.context, data: { status: 404, title: 'resource not found', detail: 'resource not found' } };

		expect(() => parseApiProblem(ctx as never, error)).toThrow(/^404: resource not found$/);
	});

	it('falls back to status plus the original message when there is no body', () => {
		const ctx = context({ items: [], continueOnFail: false });
		const bare = new NodeApiError(node, { message: 'Request failed with status code 503' } as JsonObject, {
			httpCode: '503',
		});

		expect(() => parseApiProblem(ctx as never, bare)).toThrow(/^503: /);
		try {
			parseApiProblem(ctx as never, bare);
		} catch (error) {
			expect((error as NodeApiError).httpCode).toBe('503');
		}
	});
});
