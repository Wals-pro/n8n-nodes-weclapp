import { describe, it, expect } from 'vitest';
import { WeclappApi } from '../../credentials/WeclappApi.credentials';

describe('WeclappApi credential', () => {
	const credential = new WeclappApi();

	it('has the correct name', () => {
		expect(credential.name).toBe('weclappApi');
	});

	it('has the correct displayName', () => {
		// n8n community-node linter enforces Title Case; 'Weclapp API' satisfies both
		expect(credential.displayName).toBe('Weclapp API');
	});

	it('has the correct documentationUrl', () => {
		expect(credential.documentationUrl).toBe('https://www.weclapp.com/api-docs/');
	});

	it('properties contains a baseUrl entry', () => {
		const baseUrlProp = credential.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrlProp).toBeDefined();
		expect(baseUrlProp?.type).toBe('string');
		expect(baseUrlProp?.required).toBe(true);
	});

	it('properties contains an apiKey entry with password type', () => {
		const apiKeyProp = credential.properties.find((p) => p.name === 'apiKey');
		expect(apiKeyProp).toBeDefined();
		expect(apiKeyProp?.type).toBe('string');
		expect(apiKeyProp?.typeOptions).toMatchObject({ password: true });
		expect(apiKeyProp?.required).toBe(true);
	});

	it('authenticate uses AuthenticationToken header with $credentials.apiKey', () => {
		expect(credential.authenticate.type).toBe('generic');
		const headers = credential.authenticate.properties.headers as Record<string, string>;
		expect(headers.AuthenticationToken).toContain('$credentials.apiKey');
	});

	it('test request targets /currency', () => {
		expect(credential.test.request.url).toBe('/currency');
	});

	it('test request uses baseUrl as baseURL', () => {
		expect(credential.test.request.baseURL).toContain('$credentials.baseUrl');
	});

	it('test request uses GET method', () => {
		expect(credential.test.request.method).toBe('GET');
	});

	it('test request sends pageSize: 1 query param', () => {
		expect(credential.test.request.qs).toMatchObject({ pageSize: 1 });
	});
});
