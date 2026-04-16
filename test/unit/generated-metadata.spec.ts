import { describe, it, expect } from 'vitest';
import { weclappEntities, entityFields, enumValues } from '../../nodes/Weclapp/generated/entityMetadata';
import { openapiEntities, entityActions, binaryEndpoints } from '../../nodes/Weclapp/generated/openapiMetadata';

describe('entityMetadata (vendor-sdk-metadata.ts output)', () => {
	it('exports more than 50 entities', () => {
		expect(weclappEntities.length).toBeGreaterThan(50);
	});

	it('includes core entities', () => {
		expect(weclappEntities).toContain('article');
		expect(weclappEntities).toContain('party');
		expect(weclappEntities).toContain('salesOrder');
		expect(weclappEntities).toContain('purchaseOrder');
		expect(weclappEntities).toContain('salesInvoice');
	});

	it('exports entityFields with non-empty field lists for core entities', () => {
		expect(entityFields['article']).toBeDefined();
		expect(entityFields['article'].length).toBeGreaterThan(10);
		expect(entityFields['article']).toContain('id');
		expect(entityFields['article']).toContain('articleNumber');
		expect(entityFields['salesOrder']).toBeDefined();
		expect(entityFields['salesOrder'].length).toBeGreaterThan(5);
	});

	it('exports enumValues with non-empty values for known enums', () => {
		expect(enumValues['articleType']).toBeDefined();
		expect(enumValues['articleType']).toContain('STORABLE');
		expect(enumValues['articleType'].length).toBeGreaterThan(3);
		expect(Object.keys(enumValues).length).toBeGreaterThan(10);
	});
});

describe('openapiMetadata (generate-descriptors.ts output)', () => {
	it('exports more than 50 entities', () => {
		expect(openapiEntities.length).toBeGreaterThan(50);
	});

	it('includes article, party, and salesOrder', () => {
		expect(openapiEntities).toContain('article');
		expect(openapiEntities).toContain('party');
		expect(openapiEntities).toContain('salesOrder');
	});

	it('exports entityActions with actions for known entities', () => {
		expect(entityActions['article']).toBeDefined();
		expect(entityActions['article']).toContain('createDatasheetPdf');
		expect(entityActions['salesOrder']).toBeDefined();
		expect(entityActions['salesOrder']).toContain('createSalesInvoice');
	});

	it('exports binaryEndpoints with PDF and image paths', () => {
		expect(binaryEndpoints.length).toBeGreaterThan(5);
		expect(binaryEndpoints.some((p) => p.includes('createDatasheetPdf'))).toBe(true);
	});
});
