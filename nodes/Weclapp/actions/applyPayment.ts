/**
 * applyPayment — composite action for purchaseInvoice.
 *
 * API path for payment application lives on purchaseOpenItem, not purchaseInvoice:
 *   POST /purchaseOpenItem/id/{id}/createPaymentApplication
 *
 * Constraint: no partial allocation, no FX — amounts must match exactly.
 * weclapp rejects createPaymentApplication when amounts differ.
 */

import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { weclappApiRequest, weclappApiRequestAllItems } from '../GenericFunctions';

export interface ApplyPaymentResult {
	applied: boolean;
	invoice: IDataObject;
	transaction: IDataObject;
	openItem: IDataObject;
}

/**
 * Validate that two decimal amount strings are numerically equal (within floating-point noise).
 * Operates on raw string values — caller is responsible for any sign normalisation.
 */
export function amountsMatch(invoiceAmount: string, transactionAmount: string): boolean {
	const inv = parseFloat(invoiceAmount);
	const trx = parseFloat(transactionAmount);
	if (isNaN(inv) || isNaN(trx)) return false;
	return Math.abs(inv - trx) < 0.0001;
}

/**
 * Execute the applyPayment composite for a purchaseInvoice item.
 * Called from the node's execute() when operation === 'applyPayment'.
 */
export async function executeApplyPayment(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<ApplyPaymentResult> {
	const purchaseInvoiceId = this.getNodeParameter('purchaseInvoiceId', itemIndex) as string;
	const bankTransactionId = this.getNodeParameter('bankTransactionId', itemIndex) as string;

	if (!purchaseInvoiceId) {
		throw new NodeOperationError(this.getNode(), 'Purchase Invoice ID is required', {
			itemIndex,
		});
	}
	if (!bankTransactionId) {
		throw new NodeOperationError(this.getNode(), 'Bank Transaction ID is required', {
			itemIndex,
		});
	}

	// Fetch invoice and transaction concurrently — independent reads with no ordering constraint.
	const [invoice, transaction] = (await Promise.all([
		weclappApiRequest.call(this, 'GET', `/purchaseInvoice/id/${purchaseInvoiceId}`),
		weclappApiRequest.call(this, 'GET', `/bankTransaction/id/${bankTransactionId}`),
	])) as [IDataObject, IDataObject];

	const invoiceGross = invoice.grossAmount as string | undefined;
	const transactionAmount = transaction.amount as string | undefined;

	if (!invoiceGross) {
		throw new NodeOperationError(
			this.getNode(),
			`Purchase invoice ${purchaseInvoiceId} has no grossAmount. Cannot validate payment match.`,
			{ itemIndex },
		);
	}
	if (!transactionAmount) {
		throw new NodeOperationError(
			this.getNode(),
			`Bank transaction ${bankTransactionId} has no amount. Cannot validate payment match.`,
			{ itemIndex },
		);
	}

	// weclapp purchase invoices carry a negative grossAmount (payable); bank debits are positive.
	// Compare absolute values to allow for sign difference between the two entities.
	const invAbs = String(Math.abs(parseFloat(invoiceGross)));
	const trxAbs = String(Math.abs(parseFloat(transactionAmount)));
	if (!amountsMatch(invAbs, trxAbs)) {
		throw new NodeOperationError(
			this.getNode(),
			`Amount mismatch: invoice grossAmount ${invoiceGross} does not match bank transaction amount ${transactionAmount}. ` +
				`weclapp requires exact match — partial allocation and FX conversion are not supported.`,
			{ itemIndex },
		);
	}

	// purchaseOpenItem is the weclapp entity that tracks the open payable.
	// Filter by purchaseInvoiceId to find the right open item.
	const openItems = await weclappApiRequestAllItems.call(
		this,
		'GET',
		'/purchaseOpenItem',
		{ 'purchaseInvoiceId-eq': purchaseInvoiceId },
		1000,
	);

	if (openItems.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`No open item found for purchase invoice ${purchaseInvoiceId}. The invoice may already be fully paid or not yet booked.`,
			{ itemIndex },
		);
	}

	// Prefer an uncleared item; fall back to the first if all are cleared (edge case).
	const openItem = openItems.find((item) => item.cleared === false) ?? openItems[0];

	const openItemId = openItem.id as string;
	if (!openItemId) {
		throw new NodeOperationError(
			this.getNode(),
			`Open item for invoice ${purchaseInvoiceId} has no ID. This is unexpected — please check weclapp data integrity.`,
			{ itemIndex },
		);
	}

	const result = (await weclappApiRequest.call(
		this,
		'POST',
		`/purchaseOpenItem/id/${openItemId}/createPaymentApplication`,
		{ bankTransactionId },
	)) as IDataObject;

	// Endpoint returns { result: purchaseOpenItem }
	const updatedOpenItem = (result.result as IDataObject) ?? result;

	return {
		applied: true,
		invoice,
		transaction,
		openItem: updatedOpenItem,
	};
}
