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

	icon: Icon = 'file:weclapp.svg';

	documentationUrl = 'https://github.com/Wals-pro/n8n-nodes-weclapp#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://tenant.weclapp.com/webapp/api/v2',
			placeholder: 'https://yourcompany.weclapp.com/webapp/api/v2',
			description: 'The base URL of your weclapp tenant (including /webapp/api/v2)',
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
			description: 'Your weclapp API key (Settings → User → API key)',
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
		},
	};
}
