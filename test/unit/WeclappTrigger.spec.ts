import { describe, it, expect, vi } from 'vitest';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { WeclappTrigger } from '../../nodes/WeclappTrigger/WeclappTrigger.node';

// ---------------------------------------------------------------------------
// Helpers: minimal IHookFunctions mock factory
// ---------------------------------------------------------------------------

interface StaticData {
	weclappWebhookId?: string;
}

function makeMockHook(overrides: {
	baseUrl?: string;
	webhookUrl?: string;
	entityName?: string;
	events?: string[];
	listResponse?: object;
	postResponse?: object;
	deleteResponse?: object;
	staticData?: StaticData;
}): IHookFunctions {
	const {
		baseUrl = 'https://test.weclapp.com/webapp/api/v2',
		webhookUrl = 'https://n8n.example.com/webhook/abc123',
		entityName = 'salesOrder',
		events = ['created', 'updated'],
		listResponse = { result: [] },
		postResponse = { id: 'wh-1' },
		deleteResponse = {},
		staticData = {},
	} = overrides;

	const httpRequestWithAuthentication = vi.fn().mockImplementation(
		(_credType: string, opts: { method: string }) => {
			if (opts.method === 'GET') return Promise.resolve(listResponse);
			if (opts.method === 'POST') return Promise.resolve(postResponse);
			if (opts.method === 'DELETE') return Promise.resolve(deleteResponse);
			return Promise.resolve({});
		},
	);

	return {
		getCredentials: vi.fn().mockResolvedValue({ baseUrl }),
		getNodeWebhookUrl: vi.fn().mockReturnValue(webhookUrl),
		getNodeParameter: vi.fn().mockImplementation((name: string) => {
			if (name === 'entityName') return entityName;
			if (name === 'events') return events;
			return undefined;
		}),
		getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
		getNode: vi.fn().mockReturnValue({ name: 'weclapp Trigger' }),
		helpers: {
			httpRequestWithAuthentication,
		},
	} as unknown as IHookFunctions;
}

// ---------------------------------------------------------------------------
// Tests: node description shape
// ---------------------------------------------------------------------------

describe('WeclappTrigger – description', () => {
	const node = new WeclappTrigger();

	it('has the correct name and group', () => {
		expect(node.description.name).toBe('weclappTrigger');
		expect(node.description.group).toContain('trigger');
	});

	it('has empty inputs and one main output', () => {
		expect(node.description.inputs).toHaveLength(0);
		expect(node.description.outputs).toContain('main');
	});

	it('webhook path is "webhook"', () => {
		const wh = node.description.webhooks?.[0];
		expect(wh?.path).toBe('webhook');
		expect(wh?.httpMethod).toBe('POST');
		expect(wh?.responseMode).toBe('onReceived');
	});

	it('entityName property has at least 10 options', () => {
		const prop = node.description.properties.find((p) => p.name === 'entityName');
		expect(prop).toBeDefined();
		expect(prop?.type).toBe('options');
		expect((prop as { options?: unknown[] }).options?.length).toBeGreaterThanOrEqual(10);
	});

	it('events property has created, updated, deleted', () => {
		const prop = node.description.properties.find((p) => p.name === 'events');
		expect(prop?.type).toBe('multiOptions');
		const opts = (prop as { options?: Array<{ value: string }> }).options ?? [];
		const values = opts.map((o) => o.value);
		expect(values).toContain('created');
		expect(values).toContain('updated');
		expect(values).toContain('deleted');
	});

	it('has additionalOptions collection with includeHistory', () => {
		const prop = node.description.properties.find((p) => p.name === 'additionalOptions');
		expect(prop?.type).toBe('collection');
		const opts = (prop as { options?: Array<{ name: string }> }).options ?? [];
		expect(opts.some((o) => o.name === 'includeHistory')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tests: webhookMethods.default.checkExists
// ---------------------------------------------------------------------------

describe('WeclappTrigger – checkExists', () => {
	const node = new WeclappTrigger();

	it('returns false when no matching webhooks exist', async () => {
		const mock = makeMockHook({ listResponse: { result: [] } });
		const result = await node.webhookMethods.default.checkExists.call(mock);
		expect(result).toBe(false);
	});

	it('returns true when a webhook with the same URL and entityName is found', async () => {
		const url = 'https://n8n.example.com/webhook/abc123';
		const mock = makeMockHook({
			webhookUrl: url,
			entityName: 'salesOrder',
			listResponse: {
				result: [
					{
						id: 'wh-42',
						url,
						entityName: 'salesOrder',
						requestMethod: 'POST',
						atCreate: true,
						atUpdate: false,
						atDelete: false,
					},
				],
			},
		});
		const result = await node.webhookMethods.default.checkExists.call(mock);
		expect(result).toBe(true);
	});

	it('returns false when URL matches but entityName differs', async () => {
		const url = 'https://n8n.example.com/webhook/abc123';
		const mock = makeMockHook({
			webhookUrl: url,
			entityName: 'party',
			listResponse: {
				result: [
					{
						id: 'wh-42',
						url,
						entityName: 'salesOrder', // different entity
						requestMethod: 'POST',
						atCreate: true,
						atUpdate: false,
						atDelete: false,
					},
				],
			},
		});
		const result = await node.webhookMethods.default.checkExists.call(mock);
		expect(result).toBe(false);
	});

	it('returns false when a different URL is in results', async () => {
		const mock = makeMockHook({
			webhookUrl: 'https://n8n.example.com/webhook/abc123',
			entityName: 'salesOrder',
			listResponse: {
				result: [
					{
						id: 'wh-99',
						url: 'https://other.example.com/webhook/xyz',
						entityName: 'salesOrder',
						requestMethod: 'POST',
						atCreate: true,
						atUpdate: false,
						atDelete: false,
					},
				],
			},
		});
		const result = await node.webhookMethods.default.checkExists.call(mock);
		expect(result).toBe(false);
	});

	it('calls GET /webhook with both url-eq and entityName-eq filters', async () => {
		const webhookUrl = 'https://n8n.example.com/webhook/abc123';
		const mock = makeMockHook({ webhookUrl, entityName: 'party' });
		await node.webhookMethods.default.checkExists.call(mock);

		const callArg = (mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mock
			.calls[0];
		expect(callArg[0]).toBe('weclappApi');
		expect(callArg[1].method).toBe('GET');
		expect(callArg[1].url).toContain('/webhook');
		expect(callArg[1].qs?.['url-eq']).toBe(webhookUrl);
		expect(callArg[1].qs?.['entityName-eq']).toBe('party');
	});

	it('returns false when webhookUrl is undefined', async () => {
		const mock = makeMockHook({ webhookUrl: undefined as unknown as string });
		(mock.getNodeWebhookUrl as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
		const result = await node.webhookMethods.default.checkExists.call(mock);
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tests: webhookMethods.default.create
// ---------------------------------------------------------------------------

describe('WeclappTrigger – create', () => {
	const node = new WeclappTrigger();

	it('POSTs exactly ONE webhook row and stores the returned ID', async () => {
		const staticData: StaticData = {};
		let postCallCount = 0;
		const mock = makeMockHook({
			entityName: 'salesOrder',
			events: ['created', 'updated'],
			staticData,
		});

		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { method: string }) => {
				if (opts.method === 'POST') {
					postCallCount++;
					return Promise.resolve({ id: 'wh-1' });
				}
				return Promise.resolve({});
			},
		);

		const result = await node.webhookMethods.default.create.call(mock);
		expect(result).toBe(true);
		expect(postCallCount).toBe(1); // ONE row, not one per event
		expect(staticData.weclappWebhookId).toBe('wh-1');
	});

	it('sends correct POST body with entityName, requestMethod, and boolean flags', async () => {
		const calls: Array<{ body: Record<string, unknown> }> = [];
		const mock = makeMockHook({
			entityName: 'article',
			events: ['created', 'deleted'],
			staticData: {},
		});
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { method: string; body: Record<string, unknown> }) => {
				calls.push(opts);
				return Promise.resolve({ id: 'wh-x' });
			},
		);

		await node.webhookMethods.default.create.call(mock);

		expect(calls).toHaveLength(1);
		const body = calls[0].body;
		expect(body.entityName).toBe('article');
		expect(body.requestMethod).toBe('POST');
		expect(body.atCreate).toBe(true);
		expect(body.atUpdate).toBe(false); // not in events array
		expect(body.atDelete).toBe(true);
		expect(body.url).toBe('https://n8n.example.com/webhook/abc123');
	});

	it('sets atUpdate=true when updated is in events', async () => {
		const calls: Array<{ body: Record<string, unknown> }> = [];
		const mock = makeMockHook({ events: ['updated'], staticData: {} });
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { body: Record<string, unknown> }) => {
				calls.push(opts);
				return Promise.resolve({ id: 'wh-1' });
			},
		);

		await node.webhookMethods.default.create.call(mock);
		expect(calls[0].body.atCreate).toBe(false);
		expect(calls[0].body.atUpdate).toBe(true);
		expect(calls[0].body.atDelete).toBe(false);
	});

	it('does NOT send event string or active field (old broken schema)', async () => {
		const calls: Array<{ body: Record<string, unknown> }> = [];
		const mock = makeMockHook({ events: ['created'], staticData: {} });
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { body: Record<string, unknown> }) => {
				calls.push(opts);
				return Promise.resolve({ id: 'wh-1' });
			},
		);

		await node.webhookMethods.default.create.call(mock);
		expect(calls[0].body).not.toHaveProperty('event');
		expect(calls[0].body).not.toHaveProperty('active');
	});

	it('strips trailing slash from baseUrl before posting', async () => {
		const calls: Array<{ url: string }> = [];
		const mock = makeMockHook({
			baseUrl: 'https://tenant.weclapp.com/webapp/api/v2/',
			events: ['created'],
			staticData: {},
		});
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { url: string }) => {
				calls.push(opts);
				return Promise.resolve({ id: 'wh-1' });
			},
		);
		await node.webhookMethods.default.create.call(mock);
		expect(calls[0].url).not.toContain('//webhook');
		expect(calls[0].url).toMatch(/\/webhook$/);
	});
});

// ---------------------------------------------------------------------------
// Tests: webhookMethods.default.delete
// ---------------------------------------------------------------------------

describe('WeclappTrigger – delete', () => {
	const node = new WeclappTrigger();

	it('DELETEs the stored webhook ID', async () => {
		const deletedPaths: string[] = [];
		const staticData: StaticData = { weclappWebhookId: 'wh-1' };
		const mock = makeMockHook({ staticData });
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockImplementation(
			(_cred: string, opts: { method: string; url: string }) => {
				if (opts.method === 'DELETE') deletedPaths.push(opts.url);
				return Promise.resolve({});
			},
		);

		const result = await node.webhookMethods.default.delete.call(mock);
		expect(result).toBe(true);
		expect(deletedPaths).toHaveLength(1);
		expect(deletedPaths[0]).toContain('wh-1');
	});

	it('clears stored ID after deletion', async () => {
		const staticData: StaticData = { weclappWebhookId: 'wh-1' };
		const mock = makeMockHook({ staticData });
		await node.webhookMethods.default.delete.call(mock);
		expect(staticData.weclappWebhookId).toBeUndefined();
	});

	it('returns true even when no ID is stored', async () => {
		const staticData: StaticData = {};
		const mock = makeMockHook({ staticData });
		const result = await node.webhookMethods.default.delete.call(mock);
		expect(result).toBe(true);
	});

	it('continues and returns true when DELETE call fails (cleanup resilience)', async () => {
		const staticData: StaticData = { weclappWebhookId: 'wh-missing' };
		const mock = makeMockHook({ staticData });
		(mock.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('404 Not Found'),
		);

		const result = await node.webhookMethods.default.delete.call(mock);
		expect(result).toBe(true);
		expect(staticData.weclappWebhookId).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Tests: webhook() handler
// ---------------------------------------------------------------------------

describe('WeclappTrigger – webhook handler', () => {
	const node = new WeclappTrigger();

	it('emits body data as json output', async () => {
		const payload = { entityName: 'salesOrder', id: '99', event: 'CREATED' };
		const mock = {
			getBodyData: vi.fn().mockReturnValue(payload),
			getHeaderData: vi.fn().mockReturnValue({ 'content-type': 'application/json' }),
		} as unknown as IWebhookFunctions;

		const result = await node.webhook.call(mock);
		expect(result.workflowData).toBeDefined();
		const item = result.workflowData![0][0];
		expect(item.json).toMatchObject(payload);
	});

	it('includes headers under _headers to avoid body field collision', async () => {
		const mock = {
			getBodyData: vi.fn().mockReturnValue({ id: '1' }),
			getHeaderData: vi.fn().mockReturnValue({ 'x-weclapp-signature': 'abc' }),
		} as unknown as IWebhookFunctions;

		const result = await node.webhook.call(mock);
		const item = result.workflowData![0][0];
		expect((item.json as Record<string, unknown>)._headers).toMatchObject({
			'x-weclapp-signature': 'abc',
		});
	});

	it('body fields are not overwritten by headers namespace', async () => {
		// If the weclapp payload happened to have a "headers" key, it should survive
		// because we use "_headers" instead.
		const mock = {
			getBodyData: vi.fn().mockReturnValue({ id: '1', headers: 'some-entity-field' }),
			getHeaderData: vi.fn().mockReturnValue({ 'content-type': 'application/json' }),
		} as unknown as IWebhookFunctions;

		const result = await node.webhook.call(mock);
		const json = result.workflowData![0][0].json as Record<string, unknown>;
		expect(json.headers).toBe('some-entity-field');
		expect(json._headers).toMatchObject({ 'content-type': 'application/json' });
	});
});
