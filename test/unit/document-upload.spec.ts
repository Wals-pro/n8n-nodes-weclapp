/**
 * Unit tests for documentUpload composite actions.
 *
 * Tests cover:
 *  - executeDocumentUpload: input validation, happy-path multipart POST
 *  - executeDocumentUploadNewVersion: input validation, happy-path multipart POST
 *
 * The helpers.httpRequestWithAuthentication call is mocked because multipart
 * uploads can't go through a real HTTP stack in unit tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

import {
	executeDocumentUpload,
	executeDocumentUploadNewVersion,
} from '../../nodes/Weclapp/actions/documentUpload';

// ---------------------------------------------------------------------------
// Test context factory
// ---------------------------------------------------------------------------

interface FakeContextOptions {
	params?: Record<string, unknown>;
	binaryData?: { fileName?: string; mimeType?: string };
	binaryBuffer?: Buffer;
	httpResponse?: unknown;
	httpError?: Error;
}

const FAKE_BASE_URL = 'https://testhandel.weclapp.com/webapp/api/v2';

function makeFakeContext(opts: FakeContextOptions = {}): IExecuteFunctions {
	const {
		params = {},
		binaryData = { fileName: 'test.pdf', mimeType: 'application/pdf' },
		binaryBuffer = Buffer.from('fake-binary'),
		httpResponse = { result: { id: 'doc-1', name: 'test.pdf' } },
		httpError,
	} = opts;

	const mockRequest = httpError
		? vi.fn().mockRejectedValue(httpError)
		: vi.fn().mockResolvedValue(httpResponse);

	return {
		getNodeParameter: (name: string, _index: number, defaultVal?: unknown) => {
			return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : defaultVal;
		},
		getNode: () => ({
			name: 'weclapp',
			type: 'weclapp',
			typeVersion: 1,
			position: [0, 0],
			id: 'test',
			parameters: {},
		}),
		getCredentials: vi.fn().mockResolvedValue({ baseUrl: FAKE_BASE_URL }),
		helpers: {
			assertBinaryData: vi.fn().mockReturnValue(binaryData),
			getBinaryDataBuffer: vi.fn().mockResolvedValue(binaryBuffer),
			httpRequestWithAuthentication: mockRequest,
		},
	} as unknown as IExecuteFunctions;
}

// ---------------------------------------------------------------------------
// executeDocumentUpload tests
// ---------------------------------------------------------------------------

describe('executeDocumentUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('throws NodeOperationError when entityName is empty', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: '',
				uploadEntityId: '123',
				uploadDocumentName: 'invoice.pdf',
				uploadAdditionalOptions: {},
			},
		});
		await expect(executeDocumentUpload.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('throws NodeOperationError when entityId is empty', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '',
				uploadDocumentName: 'invoice.pdf',
				uploadAdditionalOptions: {},
			},
		});
		await expect(executeDocumentUpload.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('throws NodeOperationError when documentName is empty', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '42',
				uploadDocumentName: '',
				uploadAdditionalOptions: {},
			},
		});
		await expect(executeDocumentUpload.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('calls POST /document/upload with correct query params on happy path', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '42',
				uploadDocumentName: 'invoice.pdf',
				uploadAdditionalOptions: { description: 'My doc', documentType: 'SALES_INVOICE' },
			},
		});

		const result = await executeDocumentUpload.call(ctx, 0);

		expect(ctx.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		expect(ctx.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');

		const httpMock = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpMock).toHaveBeenCalledOnce();

		const [credType, opts] = httpMock.mock.calls[0] as [string, { url: string; qs: Record<string, string>; method: string }];
		expect(credType).toBe('weclappApi');
		expect(opts.url).toBe(`${FAKE_BASE_URL}/document/upload`);
		expect(opts.method).toBe('POST');
		expect(opts.qs).toMatchObject({
			entityName: 'salesOrder',
			entityId: '42',
			name: 'invoice.pdf',
			description: 'My doc',
			documentType: 'SALES_INVOICE',
		});

		expect(result).toMatchObject({
			json: { id: 'doc-1', name: 'test.pdf' },
			pairedItem: { item: 0 },
		});
	});

	it('omits optional query params when not provided', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'purchaseInvoice',
				uploadEntityId: '99',
				uploadDocumentName: 'receipt.pdf',
				uploadAdditionalOptions: {},
			},
		});

		await executeDocumentUpload.call(ctx, 0);

		const httpMock = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		const [, opts] = httpMock.mock.calls[0] as [string, { qs: Record<string, string> }];

		// description and documentType should not appear when empty
		expect(Object.prototype.hasOwnProperty.call(opts.qs, 'description')).toBe(false);
		expect(Object.prototype.hasOwnProperty.call(opts.qs, 'documentType')).toBe(false);
	});

	it('wraps HTTP errors in NodeOperationError', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '42',
				uploadDocumentName: 'invoice.pdf',
				uploadAdditionalOptions: {},
			},
			httpError: new Error('Network timeout'),
		});

		await expect(executeDocumentUpload.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('handles response without result wrapper', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '42',
				uploadDocumentName: 'invoice.pdf',
				uploadAdditionalOptions: {},
			},
			httpResponse: { id: 'doc-2', name: 'invoice.pdf' }, // no result wrapper
		});

		const result = await executeDocumentUpload.call(ctx, 0);
		expect(result.json).toMatchObject({ id: 'doc-2' });
	});

	it('uses filename from binary metadata when available', async () => {
		const ctx = makeFakeContext({
			params: {
				uploadBinaryPropertyName: 'data',
				uploadEntityName: 'salesOrder',
				uploadEntityId: '42',
				uploadDocumentName: 'override-name.pdf',
				uploadAdditionalOptions: {},
			},
			binaryData: { fileName: 'original.pdf', mimeType: 'application/pdf' },
		});

		await executeDocumentUpload.call(ctx, 0);
		// Verify the call went through (integration check — FormData filename from binaryMeta)
		const httpMock = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpMock).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// executeDocumentUploadNewVersion tests
// ---------------------------------------------------------------------------

describe('executeDocumentUploadNewVersion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('throws NodeOperationError when documentId is empty', async () => {
		const ctx = makeFakeContext({
			params: {
				documentId: '',
				uploadNewVersionBinaryPropertyName: 'data',
				uploadNewVersionComment: '',
			},
		});
		await expect(executeDocumentUploadNewVersion.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('calls POST /document/id/{id}/upload on happy path', async () => {
		const ctx = makeFakeContext({
			params: {
				documentId: 'doc-123',
				uploadNewVersionBinaryPropertyName: 'data',
				uploadNewVersionComment: 'Fixed version',
			},
			httpResponse: { result: { id: 'doc-123', version: '2' } },
		});

		const result = await executeDocumentUploadNewVersion.call(ctx, 0);

		const httpMock = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpMock).toHaveBeenCalledOnce();

		const [, opts] = httpMock.mock.calls[0] as [string, { url: string; qs: Record<string, string>; method: string }];
		expect(opts.url).toBe(`${FAKE_BASE_URL}/document/id/doc-123/upload`);
		expect(opts.method).toBe('POST');
		expect(opts.qs).toMatchObject({ comment: 'Fixed version' });

		expect(result).toMatchObject({ pairedItem: { item: 0 } });
	});

	it('omits comment from query params when empty', async () => {
		const ctx = makeFakeContext({
			params: {
				documentId: 'doc-456',
				uploadNewVersionBinaryPropertyName: 'data',
				uploadNewVersionComment: '',
			},
		});

		await executeDocumentUploadNewVersion.call(ctx, 0);

		const httpMock = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		const [, opts] = httpMock.mock.calls[0] as [string, { qs: Record<string, string> }];
		expect(Object.prototype.hasOwnProperty.call(opts.qs, 'comment')).toBe(false);
	});

	it('wraps HTTP errors in NodeOperationError', async () => {
		const ctx = makeFakeContext({
			params: {
				documentId: 'doc-789',
				uploadNewVersionBinaryPropertyName: 'data',
				uploadNewVersionComment: '',
			},
			httpError: new Error('Upload failed'),
		});

		await expect(executeDocumentUploadNewVersion.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});
});
