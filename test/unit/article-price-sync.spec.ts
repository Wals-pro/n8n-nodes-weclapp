/**
 * Unit tests for nodes/Weclapp/actions/articlePriceSync.ts
 *
 * Tests:
 * 1. floorToSecond / ceilToSecond round correctly.
 * 2. Overlap closure only sets endDate when existing price has no endDate.
 * 3. Existing price with endDate already set is left unchanged.
 * 4. No change when single current row already matches desired state.
 * 5. executeUpdatePrices: calls GET then PUT with correct body; returns changed=true.
 * 6. executeUpdatePrices: returns changed=false and skips PUT when no change needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	floorToSecond,
	ceilToSecond,
	buildChannelPriceRows,
	executeUpdatePrices,
} from '../../nodes/Weclapp/actions/articlePriceSync';
import type { ArticlePriceRow } from '../../nodes/Weclapp/actions/articlePriceSync';

// ─── Timestamp helpers ────────────────────────────────────────────────────────

describe('floorToSecond', () => {
	it('rounds whole seconds unchanged', () => {
		expect(floorToSecond(1_000_000_000_000)).toBe(1_000_000_000_000);
	});

	it('truncates sub-second component (floor)', () => {
		expect(floorToSecond(1_000_000_000_999)).toBe(1_000_000_000_000);
		expect(floorToSecond(1_000_000_000_001)).toBe(1_000_000_000_000);
	});

	it('does not round up even at 999ms', () => {
		expect(floorToSecond(1_000_000_000_999)).toBe(1_000_000_000_000);
	});
});

describe('ceilToSecond', () => {
	it('leaves whole seconds unchanged', () => {
		expect(ceilToSecond(1_000_000_000_000)).toBe(1_000_000_000_000);
	});

	it('rounds up any sub-second component', () => {
		expect(ceilToSecond(1_000_000_000_001)).toBe(1_000_000_001_000);
		expect(ceilToSecond(1_000_000_000_999)).toBe(1_000_000_001_000);
	});

	it('ceil of an already-whole-second is unchanged', () => {
		expect(ceilToSecond(5_000)).toBe(5_000);
	});
});

// ─── buildChannelPriceRows ────────────────────────────────────────────────────

// Use a fixed "today" in Berlin time so tests are deterministic.
// 2026-03-18 10:00:00 UTC = 11:00:00 Berlin (CET, UTC+1)
const EFFECTIVE_TS = Date.parse('2026-03-18T10:00:00Z');
const CHANNEL = 'GROSS1';
const CURRENCY = '256';

function makeRow(overrides: Partial<ArticlePriceRow> = {}): ArticlePriceRow {
	return {
		id: '999',
		version: '1',
		currencyId: CURRENCY,
		customerId: null,
		price: '100.00000',
		priceScaleType: 'SCALE_FROM',
		priceScaleValue: '0',
		reductionAdditions: [],
		salesChannel: CHANNEL,
		startDate: Date.parse('2026-01-01T00:00:00Z'),
		endDate: null,
		...overrides,
	};
}

describe('buildChannelPriceRows — no change when already correct', () => {
	it('returns changed=false when single current row has same price/currency', () => {
		const row = makeRow({ price: '200.00000' });
		const { changed, rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 200,
			currencyId: CURRENCY,
			effectiveTimestamp: EFFECTIVE_TS,
			existingRows: [row],
		});
		expect(changed).toBe(false);
		// Original row is returned as-is
		expect(rows).toHaveLength(1);
		expect(rows[0].price).toBe('200.00000');
	});
});

describe('buildChannelPriceRows — closes current row that has no endDate', () => {
	it('sets endDate on the current open row and creates a new price row', () => {
		const row = makeRow({ price: '100.00000', endDate: null });
		const { changed, rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 150,
			currencyId: CURRENCY,
			effectiveTimestamp: EFFECTIVE_TS,
			existingRows: [row],
		});
		expect(changed).toBe(true);
		// Two rows: closed old + new
		expect(rows).toHaveLength(2);

		const closedRow = rows.find((r) => r.id === '999');
		expect(closedRow).toBeDefined();
		// endDate must be set (was null before)
		expect(closedRow!.endDate).not.toBeNull();
		// endDate must be floored to second boundary
		expect(closedRow!.endDate! % 1000).toBe(0);

		const newRow = rows.find((r) => !r.id);
		expect(newRow).toBeDefined();
		expect(newRow!.price).toBe('150');
		expect(newRow!.salesChannel).toBe(CHANNEL);
		expect(newRow!.currencyId).toBe(CURRENCY);
		// startDate must be ceiled to second boundary
		expect(newRow!.startDate! % 1000).toBe(0);
	});
});

describe('buildChannelPriceRows — NEVER modifies endDate on price that already has one', () => {
	it('leaves existing endDate unchanged when already set', () => {
		const existingEndDate = Date.parse('2026-03-20T23:59:59Z');
		const row = makeRow({ price: '100.00000', endDate: existingEndDate });
		const { changed, rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 150,
			currencyId: CURRENCY,
			effectiveTimestamp: EFFECTIVE_TS,
			existingRows: [row],
		});
		expect(changed).toBe(true);

		const existingRow = rows.find((r) => r.id === '999');
		expect(existingRow).toBeDefined();
		// endDate must NOT have been changed
		expect(existingRow!.endDate).toBe(existingEndDate);
	});
});

describe('buildChannelPriceRows — past and future rows are preserved', () => {
	it('preserves past rows unchanged', () => {
		const pastRow = makeRow({
			id: 'past',
			price: '50.00000',
			startDate: Date.parse('2025-01-01T00:00:00Z'),
			endDate: Date.parse('2025-12-31T23:59:59Z'),
		});
		const currentRow = makeRow({ id: 'cur', price: '100.00000', endDate: null });
		const { rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 150,
			currencyId: CURRENCY,
			effectiveTimestamp: EFFECTIVE_TS,
			existingRows: [pastRow, currentRow],
		});
		const foundPast = rows.find((r) => r.id === 'past');
		expect(foundPast).toBeDefined();
		// Past row endDate unchanged
		expect(foundPast!.endDate).toBe(Date.parse('2025-12-31T23:59:59Z'));
	});
});

describe('buildChannelPriceRows — second-precision rounding on date boundaries', () => {
	it('new startDate is ceiled to second', () => {
		const row = makeRow({ price: '100.00000', endDate: null });
		// Use a timestamp that has sub-second component
		const ts = EFFECTIVE_TS + 500; // +500ms
		const { rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 999,
			currencyId: CURRENCY,
			effectiveTimestamp: ts,
			existingRows: [row],
		});
		const newRow = rows.find((r) => !r.id);
		expect(newRow).toBeDefined();
		expect(newRow!.startDate! % 1000).toBe(0);
	});

	it('closed-row endDate is floored to second', () => {
		const row = makeRow({ price: '100.00000', endDate: null });
		const ts = EFFECTIVE_TS + 500;
		const { rows } = buildChannelPriceRows({
			channel: CHANNEL,
			desiredPrice: 999,
			currencyId: CURRENCY,
			effectiveTimestamp: ts,
			existingRows: [row],
		});
		const closedRow = rows.find((r) => r.id === '999');
		expect(closedRow).toBeDefined();
		expect(closedRow!.endDate! % 1000).toBe(0);
	});
});

// ─── executeUpdatePrices (mocked weclappApiRequest) ──────────────────────────

vi.mock('../../nodes/Weclapp/GenericFunctions', () => ({
	weclappApiRequest: vi.fn(),
}));

describe('executeUpdatePrices', () => {
	let mockThis: { call: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.clearAllMocks();
		mockThis = { call: vi.fn() };
	});

	it('fetches article, computes new prices, and PUTs when changed=true', async () => {
		const { weclappApiRequest } = await import('../../nodes/Weclapp/GenericFunctions');
		const mockGet = vi.mocked(weclappApiRequest);

		const existingPrice: ArticlePriceRow = makeRow({ price: '100.00000', endDate: null });

		// First call = GET
		mockGet.mockResolvedValueOnce({ id: 'art-1', articlePrices: [existingPrice] });
		// Second call = PUT
		mockGet.mockResolvedValueOnce({});

		const result = await executeUpdatePrices.call(
			// IExecuteFunctions context — mock as any for simplicity
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			mockThis as any,
			{
				articleId: 'art-1',
				grossPrice: 200,
				currencyId: CURRENCY,
				salesChannel: CHANNEL,
				validFrom: EFFECTIVE_TS,
			},
		);

		expect(result.articleId).toBe('art-1');
		expect(result.changed).toBe(true);
		// pricesBefore contains the original row
		expect(result.pricesBefore).toHaveLength(1);
		// pricesAfter contains closed old + new
		expect(result.pricesAfter).toHaveLength(2);

		// Verify GET call
		expect(mockGet).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/article/id/art-1',
			{},
			expect.objectContaining({ properties: expect.any(String) }),
		);

		// Verify PUT call
		expect(mockGet).toHaveBeenNthCalledWith(
			2,
			'PUT',
			'/article/id/art-1',
			expect.objectContaining({ articlePrices: expect.any(Array) }),
			expect.objectContaining({ ignoreMissingProperties: true }),
		);
	});

	it('returns changed=false and skips PUT when price already matches', async () => {
		const { weclappApiRequest } = await import('../../nodes/Weclapp/GenericFunctions');
		const mockGet = vi.mocked(weclappApiRequest);

		const existingPrice: ArticlePriceRow = makeRow({ price: '200', endDate: null });
		mockGet.mockResolvedValueOnce({ id: 'art-2', articlePrices: [existingPrice] });

		const result = await executeUpdatePrices.call(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			mockThis as any,
			{
				articleId: 'art-2',
				grossPrice: 200,
				currencyId: CURRENCY,
				salesChannel: CHANNEL,
				validFrom: EFFECTIVE_TS,
			},
		);

		expect(result.changed).toBe(false);
		// Only GET, no PUT
		expect(mockGet).toHaveBeenCalledTimes(1);
	});
});
