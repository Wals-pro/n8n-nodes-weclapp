/**
 * Article price sync composite action.
 *
 * Ports the relevant subset of tests/helpers/gross1-price-sync.mjs into TypeScript
 * for use as a programmatic n8n action.
 *
 * Key weclapp price API rules enforced here (from CLAUDE.md):
 * - Never modify endDate on a price that already has one.
 * - Close overlapping prices by setting endDate only when not already set.
 * - Timestamps rounded to second precision: floor for floor boundaries,
 *   ceil for ceil boundaries (Math.floor(ms/1000)*1000 and Math.ceil(ms/1000)*1000).
 * - Always include ALL existing prices (with id+version) in the PUT body.
 * - PUT to /article/id/{id}?ignoreMissingProperties=true.
 */

import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { weclappApiRequest } from '../GenericFunctions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticlePriceRow {
	id?: string;
	version?: string;
	currencyId?: string;
	customerId?: string | null;
	description?: string;
	endDate?: number | null;
	price?: string;
	priceScaleType?: string;
	priceScaleValue?: string;
	reductionAdditions?: unknown[];
	salesChannel?: string;
	startDate?: number | null;
}

export interface UpdatePricesInput {
	articleId: string;
	grossPrice: number;
	salesChannel?: string;
	currencyId: string;
	/** Milliseconds since epoch. Defaults to Date.now(). */
	validFrom?: number;
}

export interface UpdatePricesResult {
	articleId: string;
	changed: boolean;
	pricesBefore: ArticlePriceRow[];
	pricesAfter: ArticlePriceRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SALES_CHANNEL = 'GROSS1';
const DEFAULT_SCALE_VALUE = '0';

/** Minimal field projection for GET /article/id/{id} — only what price sync needs. */
const ARTICLE_PRICE_PROPERTIES = [
	'id',
	'version',
	'articlePrices.id',
	'articlePrices.version',
	'articlePrices.currencyId',
	'articlePrices.customerId',
	'articlePrices.description',
	'articlePrices.endDate',
	'articlePrices.price',
	'articlePrices.priceScaleType',
	'articlePrices.priceScaleValue',
	'articlePrices.reductionAdditions',
	'articlePrices.salesChannel',
	'articlePrices.startDate',
].join(',');

const WRITEABLE_PRICE_KEYS: Array<keyof ArticlePriceRow> = [
	'id',
	'version',
	'currencyId',
	'customerId',
	'description',
	'endDate',
	'price',
	'priceScaleType',
	'priceScaleValue',
	'reductionAdditions',
	'salesChannel',
	'startDate',
];

// ─── Timestamp helpers ────────────────────────────────────────────────────────

/**
 * Round a millisecond timestamp DOWN to the nearest whole second.
 * Required by weclapp's second-level overlap check (CLAUDE.md rule).
 */
export function floorToSecond(ms: number): number {
	return Math.floor(ms / 1000) * 1000;
}

/**
 * Round a millisecond timestamp UP to the nearest whole second.
 * Required by weclapp's second-level overlap check (CLAUDE.md rule).
 */
export function ceilToSecond(ms: number): number {
	return Math.ceil(ms / 1000) * 1000;
}

// ─── Date boundary helpers (Europe/Berlin, same as reference mjs) ─────────────

const _berlinDtf = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
const _fmtBerlinDate = (ms: number): string => _berlinDtf.format(new Date(ms));

function startOfDayBerlin(ms: number): number {
	const dateStr = _fmtBerlinDate(ms);
	const parts = dateStr.split('-').map(Number);
	const [y, m, d] = parts as [number, number, number];
	const utcMidnight = Date.UTC(y, m - 1, d);
	const candidates: number[] = [];
	for (const offsetMs of [3600000, 7200000]) {
		const candidate = utcMidnight - offsetMs;
		if (_fmtBerlinDate(candidate) === dateStr) candidates.push(candidate);
	}
	return candidates.length > 0 ? Math.min(...candidates) : utcMidnight - 3600000;
}

function startOfNextDayBerlin(ms: number): number {
	const dateStr = _fmtBerlinDate(ms);
	const parts = dateStr.split('-').map(Number);
	const [y, m, d] = parts as [number, number, number];
	const nextDayNoon = Date.UTC(y, m - 1, d + 1, 12);
	return startOfDayBerlin(nextDayNoon);
}

function endOfDayBerlin(ms: number): number {
	return startOfNextDayBerlin(ms) - 1;
}

// ─── Price row helpers ────────────────────────────────────────────────────────

function toFiniteNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriceString(value: unknown, precision = 5): string | null {
	const parsed = toFiniteNumber(value);
	if (parsed === null) return null;
	const factor = 10 ** precision;
	const rounded = Math.round((parsed || 0) * factor) / factor;
	const fixed = rounded.toFixed(precision);
	return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

function normalizeScaleValue(value: unknown): string {
	const result = normalizePriceString(
		value === null || value === undefined ? DEFAULT_SCALE_VALUE : value,
		5,
	);
	return result === null ? DEFAULT_SCALE_VALUE : result;
}

function sanitizePriceRow(row: ArticlePriceRow): ArticlePriceRow {
	const output: ArticlePriceRow = {};
	for (const key of WRITEABLE_PRICE_KEYS) {
		const val = row[key];
		if (val !== null && val !== undefined) {
			if (key === 'reductionAdditions') {
				(output as Record<string, unknown>)[key] = Array.isArray(val)
					? JSON.parse(JSON.stringify(val))
					: [];
			} else {
				(output as Record<string, unknown>)[key] = val;
			}
		}
	}
	return output;
}

/** A price is a "general tier-zero" price (no customer lock, scale value 0). */
function isGeneralTierZero(row: ArticlePriceRow): boolean {
	if (row.customerId !== null && row.customerId !== undefined && row.customerId !== '') {
		return false;
	}
	return normalizeScaleValue(row.priceScaleValue) === DEFAULT_SCALE_VALUE;
}

function isPastAt(row: ArticlePriceRow, ts: number): boolean {
	const endDate = toFiniteNumber(row.endDate);
	return endDate !== null && endDate < ts;
}

function isFutureAt(row: ArticlePriceRow, ts: number): boolean {
	const startDate = toFiniteNumber(row.startDate);
	return startDate !== null && startDate > ts;
}

// ─── Core price mutation logic ────────────────────────────────────────────────

/**
 * Given the existing prices for one (channel, currencyId) combination, compute
 * the new price array.
 *
 * Rules:
 * - If a single current row already matches desired price + currency → no change.
 * - Rows WITHOUT endDate → close at end of today (Europe/Berlin).
 * - Rows WITH endDate already → leave untouched (CLAUDE.md: never modify endDate).
 * - New price starts at beginning of next day Berlin time.
 * - If future rows exist, cap new price endDate to the day before first future start.
 */
export function buildChannelPriceRows({
	channel,
	desiredPrice,
	currencyId,
	effectiveTimestamp,
	existingRows,
}: {
	channel: string;
	desiredPrice: number | string;
	currencyId: string;
	effectiveTimestamp: number;
	existingRows: ArticlePriceRow[];
}): { rows: ArticlePriceRow[]; changed: boolean } {
	const pastRows: ArticlePriceRow[] = [];
	const currentRows: ArticlePriceRow[] = [];
	const futureRows: ArticlePriceRow[] = [];

	for (const row of existingRows) {
		const sanitized = sanitizePriceRow(row);
		if (isPastAt(row, effectiveTimestamp)) {
			pastRows.push(sanitized);
		} else if (isFutureAt(row, effectiveTimestamp)) {
			futureRows.push(sanitized);
		} else {
			currentRows.push(sanitized);
		}
	}

	const normalizedDesired = normalizePriceString(desiredPrice, 5);

	// Check if single current row already matches desired state
	if (currentRows.length === 1) {
		const cur = currentRows[0];
		const samePrice = normalizePriceString(cur.price, 5) === normalizedDesired;
		const sameCurrency = String(cur.currencyId ?? '') === String(currencyId);
		const sameScaleType = String(cur.priceScaleType ?? '') === 'SCALE_FROM';
		const sameScaleValue = normalizeScaleValue(cur.priceScaleValue) === DEFAULT_SCALE_VALUE;
		if (samePrice && sameCurrency && sameScaleType && sameScaleValue) {
			return { rows: [...pastRows, cur, ...futureRows], changed: false };
		}
	}

	// Need a new price row. Process current rows.
	let maxImmutableEndDate: number | null = null;
	const processedCurrentRows: ArticlePriceRow[] = [];

	for (const row of currentRows) {
		const existingEndDate = toFiniteNumber(row.endDate);
		if (existingEndDate !== null) {
			// Already has endDate — NEVER modify it (CLAUDE.md rule)
			processedCurrentRows.push(row);
			if (maxImmutableEndDate === null || existingEndDate > maxImmutableEndDate) {
				maxImmutableEndDate = existingEndDate;
			}
		} else {
			// Close it at end of today (Berlin)
			row.endDate = floorToSecond(endOfDayBerlin(effectiveTimestamp));
			processedCurrentRows.push(row);
		}
	}

	// New price starts beginning of next Berlin day (or after latest immutable endDate)
	let newStartDate = ceilToSecond(startOfNextDayBerlin(effectiveTimestamp));
	if (maxImmutableEndDate !== null && maxImmutableEndDate >= effectiveTimestamp) {
		newStartDate = ceilToSecond(startOfNextDayBerlin(maxImmutableEndDate));
	}

	// Sort future rows by startDate ascending to find the nearest one
	futureRows.sort((a, b) => {
		const as = toFiniteNumber(a.startDate) ?? Number.MIN_SAFE_INTEGER;
		const bs = toFiniteNumber(b.startDate) ?? Number.MIN_SAFE_INTEGER;
		return as - bs;
	});
	const nextFutureStart =
		futureRows.length > 0 ? toFiniteNumber(futureRows[0].startDate) : null;

	const newRow: ArticlePriceRow = {
		currencyId,
		price: normalizedDesired ?? String(desiredPrice),
		priceScaleType: 'SCALE_FROM',
		priceScaleValue: DEFAULT_SCALE_VALUE,
		reductionAdditions: [],
		salesChannel: channel,
		startDate: newStartDate,
	};

	if (nextFutureStart !== null) {
		if (nextFutureStart <= newStartDate) {
			// No room — return unchanged
			return { rows: [...pastRows, ...processedCurrentRows, ...futureRows], changed: false };
		}
		const cappedEndDate = floorToSecond(startOfDayBerlin(nextFutureStart) - 1);
		if (cappedEndDate < newStartDate) {
			// Same day — no room
			return { rows: [...pastRows, ...processedCurrentRows, ...futureRows], changed: false };
		}
		newRow.endDate = cappedEndDate;
	}

	return {
		rows: [...pastRows, ...processedCurrentRows, newRow, ...futureRows],
		changed: true,
	};
}

// ─── Main action function ─────────────────────────────────────────────────────

/**
 * Execute the updatePrices composite action.
 *
 * Workflow:
 * 1. GET /article/id/{articleId}?properties=<minimal set> to fetch current prices.
 * 2. Compute new price array using buildChannelPriceRows.
 * 3. PUT /article/id/{articleId}?ignoreMissingProperties=true with full price array.
 * 4. Return { articleId, changed, pricesBefore, pricesAfter }.
 */
export async function executeUpdatePrices(
	this: IExecuteFunctions,
	input: UpdatePricesInput,
): Promise<UpdatePricesResult> {
	const { articleId, grossPrice, currencyId, validFrom } = input;
	const salesChannel = input.salesChannel ?? DEFAULT_SALES_CHANNEL;
	const effectiveTimestamp = validFrom ?? Date.now();

	// 1. Fetch current article prices via minimal field projection
	const article = (await weclappApiRequest.call(this, 'GET', `/article/id/${articleId}`, {}, {
		properties: ARTICLE_PRICE_PROPERTIES,
	})) as IDataObject;

	const pricesBefore: ArticlePriceRow[] = Array.isArray(article.articlePrices)
		? (article.articlePrices as ArticlePriceRow[])
		: [];

	// Separate: rows for our target (salesChannel + tier-zero) vs. everything else
	const targetRows = pricesBefore.filter(
		(r) => r.salesChannel === salesChannel && isGeneralTierZero(r),
	);
	const preservedRows = pricesBefore
		.filter((r) => !(r.salesChannel === salesChannel && isGeneralTierZero(r)))
		.map(sanitizePriceRow);

	// 2. Compute new price array for the target channel
	const { rows: channelRows, changed } = buildChannelPriceRows({
		channel: salesChannel,
		desiredPrice: grossPrice,
		currencyId,
		effectiveTimestamp,
		existingRows: targetRows,
	});

	if (!changed) {
		return {
			articleId,
			changed: false,
			pricesBefore,
			pricesAfter: pricesBefore,
		};
	}

	const pricesAfter: ArticlePriceRow[] = [...preservedRows, ...channelRows];

	// 3. PUT article with updated prices
	await weclappApiRequest.call(
		this,
		'PUT',
		`/article/id/${articleId}`,
		{ articlePrices: pricesAfter } as IDataObject,
		{ ignoreMissingProperties: true },
	);

	return {
		articleId,
		changed: true,
		pricesBefore,
		pricesAfter,
	};
}
