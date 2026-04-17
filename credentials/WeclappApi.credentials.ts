/**
 * weclapp API credential — AuthenticationToken header auth.
 *
 * Maintained by Wals-pro (https://wals.pro).
 * AI copilot: https://dev.weclapp-ai.wals.pro (Beta).
 */
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class WeclappApi implements ICredentialType {
	name = 'weclappApi';

	displayName = 'Weclapp API';

	icon: Icon = {
		light: 'file:weclapp.light.svg',
		dark: 'file:weclapp.dark.svg',
	};

	documentationUrl = 'https://www.weclapp.com/api-docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://tenant.weclapp.com/webapp/api/v2',
			placeholder: 'https://yourcompany.weclapp.com/webapp/api/v2',
			description:
				"Your weclapp API base URL. Replace 'tenant' with your subdomain.",
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'API token from weclapp User Settings → API token.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				AuthenticationToken: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/currency',
			qs: {
				pageSize: 1,
			},
			method: 'GET',
		},
	};
}
