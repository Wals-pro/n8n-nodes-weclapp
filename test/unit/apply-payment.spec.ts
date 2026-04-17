import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';

// Hoist the mock so it intercepts the static import in applyPayment.ts.
// vi.mock is always hoisted to the top of the file by Vitest's transformer,
// regardless of where it appears in the source.
vi.mock('../../nodes/Weclapp/GenericFunctions', () => ({
	weclappApiRequest: vi.fn(),
	weclappApiRequestAllItems: vi.fn(),
}));

import { amountsMatch, executeApplyPayment } from '../../nodes/Weclapp/actions/applyPayment';
import { weclappApiRequest, weclappApiRequestAllItems } from '../../nodes/Weclapp/GenericFunctions';

const mockApiRequest = vi.mocked(weclappApiRequest);
const mockApiRequestAllItems = vi.mocked(weclappApiRequestAllItems);

function makeFakeContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _index: number) => params[name],
		getNode: () => ({ name: 'weclapp', type: 'weclapp', typeVersion: 1, position: [0, 0], id: 'test', parameters: {} }),
	} as unknown as IExecuteFunctions;
}

describe('amountsMatch', () => {
	it('returns true when amounts are exactly equal', () => {
		expect(amountsMatch('100.00', '100.00')).toBe(true);
	});

	it('returns true when trailing zeros differ', () => {
		expect(amountsMatch('100', '100.00')).toBe(true);
	});

	it('returns true when difference is within float noise tolerance', () => {
		expect(amountsMatch('100.00001', '100.00000')).toBe(true);
	});

	it('returns false when amounts differ by more than tolerance', () => {
		expect(amountsMatch('100.00', '99.99')).toBe(false);
	});

	it('returns false for clearly different amounts', () => {
		expect(amountsMatch('500.00', '250.00')).toBe(false);
	});

	it('returns false when first argument is not a number', () => {
		expect(amountsMatch('', '100.00')).toBe(false);
	});

	it('returns false when second argument is not a number', () => {
		expect(amountsMatch('100.00', 'not-a-number')).toBe(false);
	});

	it('returns false when both arguments are not numbers', () => {
		expect(amountsMatch('', '')).toBe(false);
	});

	it('treats positive and negative as different (caller normalises signs)', () => {
		// executeApplyPayment passes abs() strings to amountsMatch; raw sign difference → mismatch
		expect(amountsMatch('100.00', '-100.00')).toBe(false);
	});

	it('matches two negative amounts', () => {
		expect(amountsMatch('-100.00', '-100.00')).toBe(true);
	});
});

describe('executeApplyPayment', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('throws NodeOperationError when purchaseInvoiceId is empty', async () => {
		const ctx = makeFakeContext({ purchaseInvoiceId: '', bankTransactionId: 'bt1' });
		await expect(executeApplyPayment.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('throws NodeOperationError when bankTransactionId is empty', async () => {
		const ctx = makeFakeContext({ purchaseInvoiceId: 'pi1', bankTransactionId: '' });
		await expect(executeApplyPayment.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('throws NodeOperationError on amount mismatch', async () => {
		mockApiRequest
			.mockResolvedValueOnce({ id: 'pi1', grossAmount: '500.00' })
			.mockResolvedValueOnce({ id: 'bt1', amount: '250.00' });
		mockApiRequestAllItems.mockResolvedValue([]);

		const ctx = makeFakeContext({ purchaseInvoiceId: 'pi1', bankTransactionId: 'bt1' });
		await expect(executeApplyPayment.call(ctx, 0)).rejects.toThrow(/Amount mismatch/);
	});

	it('throws NodeOperationError when no open items are found', async () => {
		mockApiRequest
			.mockResolvedValueOnce({ id: 'pi1', grossAmount: '100.00' })
			.mockResolvedValueOnce({ id: 'bt1', amount: '100.00' });
		mockApiRequestAllItems.mockResolvedValue([]);

		const ctx = makeFakeContext({ purchaseInvoiceId: 'pi1', bankTransactionId: 'bt1' });
		await expect(executeApplyPayment.call(ctx, 0)).rejects.toThrow(/No open item found/);
	});

	it('returns applied result on happy path', async () => {
		const fakeOpenItem = { id: 'oi1', cleared: false, amountOpen: '100.00', purchaseInvoiceId: 'pi1' };
		const fakePaymentResult = { result: { ...fakeOpenItem, cleared: true } };

		mockApiRequest
			.mockResolvedValueOnce({ id: 'pi1', grossAmount: '100.00' })
			.mockResolvedValueOnce({ id: 'bt1', amount: '100.00' })
			.mockResolvedValueOnce(fakePaymentResult);
		mockApiRequestAllItems.mockResolvedValue([fakeOpenItem]);

		const ctx = makeFakeContext({ purchaseInvoiceId: 'pi1', bankTransactionId: 'bt1' });
		const result = await executeApplyPayment.call(ctx, 0);

		expect(result.applied).toBe(true);
		expect(result.invoice).toMatchObject({ id: 'pi1' });
		expect(result.transaction).toMatchObject({ id: 'bt1' });
	});

	it('picks uncleared open item when multiple open items exist', async () => {
		const clearedItem = { id: 'oi-cleared', cleared: true, purchaseInvoiceId: 'pi1' };
		const unclearedItem = { id: 'oi-open', cleared: false, purchaseInvoiceId: 'pi1' };
		const fakePaymentResult = { result: { ...unclearedItem, cleared: true } };

		mockApiRequest
			.mockResolvedValueOnce({ id: 'pi1', grossAmount: '200.00' })
			.mockResolvedValueOnce({ id: 'bt1', amount: '200.00' })
			.mockResolvedValueOnce(fakePaymentResult);
		mockApiRequestAllItems.mockResolvedValue([clearedItem, unclearedItem]);

		const ctx = makeFakeContext({ purchaseInvoiceId: 'pi1', bankTransactionId: 'bt1' });
		const result = await executeApplyPayment.call(ctx, 0);

		expect(result.applied).toBe(true);
	});
});
