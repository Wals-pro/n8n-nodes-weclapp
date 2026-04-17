/**
 * documentUpload — composite actions for binary multipart uploads.
 *
 * Declarative routing cannot send multipart/form-data with a binary attachment,
 * so both `document.upload` (new document) and `document.uploadNewVersion`
 * (new version on an existing document) are handled programmatically here.
 *
 * weclapp endpoint:
 *   POST /document/upload                      — new document attached to an entity
 *   POST /document/id/{documentId}/upload      — new version of an existing document
 *
 * The file binary is sent as a `multipart/form-data` field named `file`.
 * Metadata (entityName, entityId, name, description, documentType) are query params.
 *
 * NOTE: Uses the global `FormData` and `Blob` available in Node.js ≥ 20 (the
 * minimum required by this package). No third-party import needed — this keeps
 * the package cloud-compatible per the n8n community node restrictions.
 */

import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Global types — Node.js 20 ships FormData and Blob as globals.
// TypeScript targeting es2019 doesn't know about them, so we declare them
// minimally here. At runtime they resolve to the actual Node.js built-ins.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const FormData: {
	new (): {
		append(name: string, value: any, filename?: string): void;
		getHeaders?(): Record<string, string>;
	};
};

declare const Blob: {
	new (parts: unknown[], options?: { type?: string }): any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

/**
 * Build the query-param object for a document upload request.
 * Returns only non-empty string values so weclapp ignores omitted optional fields.
 */
function buildUploadQs(fields: Record<string, string | undefined>): IDataObject {
	const qs: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined && value !== '') {
			qs[key] = value;
		}
	}
	return qs;
}

/**
 * Execute a multipart POST to a weclapp document upload endpoint.
 *
 * Uses `helpers.httpRequestWithAuthentication` with a global `FormData` body.
 * n8n's underlying HTTP client (axios) handles the `Content-Type: multipart/form-data`
 * header and boundary generation automatically when it receives a `FormData` body.
 *
 * @param ctx         n8n IExecuteFunctions context
 * @param endpoint    Relative API path (e.g. `/document/upload`)
 * @param qs          Query-string parameters (name, entityName, etc.)
 * @param binaryData  Raw binary buffer to attach as the `file` field
 * @param filename    Filename to embed in the multipart part
 * @param mimeType    MIME type of the file
 * @param itemIndex   Item index for error reporting
 */
async function postMultipart(
	ctx: IExecuteFunctions,
	endpoint: string,
	qs: IDataObject,
	binaryData: Buffer,
	filename: string,
	mimeType: string,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Resolve the absolute URL.
	// customOperations bypass the declarative routing engine, so requestDefaults.baseURL
	// is NOT automatically prepended — we must fetch it from the credential ourselves.
	const creds = await ctx.getCredentials('weclappApi');
	const baseUrl = (creds.baseUrl as string).replace(/\/$/, '');
	const absoluteUrl = `${baseUrl}${endpoint}`;

	// Build multipart form using the Node.js 20 global FormData + Blob.
	// The Blob wraps the raw binary buffer; FormData handles boundary encoding.
	const blob = new Blob([binaryData], { type: mimeType });
	const form = new FormData();
	form.append('file', blob, filename);

	let response: unknown;
	try {
		response = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'weclappApi', {
			method: 'POST',
			url: absoluteUrl,
			qs,
			// Cast needed: n8n types reference npm FormData, runtime is Node.js global FormData.
			// Both are structurally compatible with axios's expectations.
			body: form as unknown as Parameters<typeof ctx.helpers.httpRequestWithAuthentication>[1]['body'],
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new NodeOperationError(ctx.getNode(), `Document upload failed: ${msg}`, { itemIndex });
	}

	// weclapp wraps the created document in { result: { ... } }
	const typedResponse = response as { result?: IDataObject } | IDataObject;
	const result = (typedResponse as { result?: IDataObject }).result ?? (typedResponse as IDataObject);

	return {
		json: result as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

// ---------------------------------------------------------------------------
// executeDocumentUpload — POST /document/upload
// ---------------------------------------------------------------------------

/**
 * Upload a new document file attached to a weclapp entity.
 *
 * Called from Weclapp.node.ts customOperations when
 * resource === 'document' && operation === 'upload'.
 */
export async function executeDocumentUpload(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const binaryPropertyName = this.getNodeParameter(
		'uploadBinaryPropertyName',
		itemIndex,
		'data',
	) as string;
	const entityName = this.getNodeParameter('uploadEntityName', itemIndex) as string;
	const entityId = this.getNodeParameter('uploadEntityId', itemIndex) as string;
	const documentName = this.getNodeParameter('uploadDocumentName', itemIndex) as string;
	const additionalOptions = this.getNodeParameter(
		'uploadAdditionalOptions',
		itemIndex,
		{},
	) as IDataObject;

	const description = (additionalOptions.description as string | undefined) ?? '';
	const documentType = (additionalOptions.documentType as string | undefined) ?? '';

	if (!entityName.trim()) {
		throw new NodeOperationError(this.getNode(), 'Entity Name is required for document upload.', {
			itemIndex,
		});
	}
	if (!entityId.trim()) {
		throw new NodeOperationError(this.getNode(), 'Entity ID is required for document upload.', {
			itemIndex,
		});
	}
	if (!documentName.trim()) {
		throw new NodeOperationError(this.getNode(), 'Document Name is required for document upload.', {
			itemIndex,
		});
	}

	const binaryMeta = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const binaryBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	const qs = buildUploadQs({
		entityName: entityName.trim(),
		entityId: entityId.trim(),
		name: documentName.trim(),
		description,
		documentType,
	});

	return postMultipart(
		this,
		'/document/upload',
		qs,
		binaryBuffer,
		binaryMeta.fileName ?? documentName,
		binaryMeta.mimeType ?? 'application/octet-stream',
		itemIndex,
	);
}

// ---------------------------------------------------------------------------
// executeDocumentUploadNewVersion — POST /document/id/{documentId}/upload
// ---------------------------------------------------------------------------

/**
 * Upload a new file version to an existing weclapp document.
 *
 * Called from Weclapp.node.ts customOperations when
 * resource === 'document' && operation === 'uploadNewVersion'.
 */
export async function executeDocumentUploadNewVersion(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const documentId = this.getNodeParameter('documentId', itemIndex) as string;
	const binaryPropertyName = this.getNodeParameter(
		'uploadNewVersionBinaryPropertyName',
		itemIndex,
		'data',
	) as string;
	const comment = this.getNodeParameter('uploadNewVersionComment', itemIndex, '') as string;

	if (!documentId.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			'Document ID is required for upload new version.',
			{ itemIndex },
		);
	}

	const binaryMeta = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const binaryBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	const qs = buildUploadQs({ comment });

	return postMultipart(
		this,
		`/document/id/${documentId.trim()}/upload`,
		qs,
		binaryBuffer,
		binaryMeta.fileName ?? 'upload',
		binaryMeta.mimeType ?? 'application/octet-stream',
		itemIndex,
	);
}
