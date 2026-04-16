import { describe, it, expect } from 'vitest';

import {
	simplifyTicket,
	simplifyComment,
	TICKET_SIMPLE_FIELDS,
	COMMENT_SIMPLE_FIELDS,
} from '../../nodes/Weclapp/descriptions/TicketDescription';

describe('simplifyTicket', () => {
	it('keeps only whitelisted fields', () => {
		const raw = {
			id: 'T-1',
			version: '3',
			status: 'OPEN',
			title: 'Bug report',
			assigneeId: 'U-42',
			requesterId: 'U-7',
			createdDate: 1700000000000,
			dueDate: 1710000000000,
			lastModifiedDate: 1700001000000,
			someInternalField: 'should be dropped',
		};
		const result = simplifyTicket(raw);
		expect(Object.keys(result)).toHaveLength(TICKET_SIMPLE_FIELDS.size);
		expect(result.id).toBe('T-1');
		expect(result.status).toBe('OPEN');
		expect(result.title).toBe('Bug report');
		expect(result.assigneeId).toBe('U-42');
		expect(result.requesterId).toBe('U-7');
		expect(result.createdDate).toBe(1700000000000);
		expect(result.dueDate).toBe(1710000000000);
		expect(result.version).toBe('3');
		expect(result.lastModifiedDate).toBeUndefined();
		expect(result.someInternalField).toBeUndefined();
	});

	it('handles missing optional fields gracefully', () => {
		const raw = { id: 'T-2', status: 'CLOSED' };
		const result = simplifyTicket(raw);
		expect(result.id).toBe('T-2');
		expect(result.status).toBe('CLOSED');
		expect(result.title).toBeUndefined();
	});

	it('returns empty object for empty input', () => {
		expect(simplifyTicket({})).toEqual({});
	});
});

describe('simplifyComment', () => {
	it('keeps only whitelisted fields', () => {
		const raw = {
			id: 'C-1',
			version: '1',
			entityName: 'ticket',
			entityId: 'T-1',
			comment: 'This is a comment',
			createdUserId: 'U-10',
			createdDate: 1700000000000,
			authorName: 'John Doe',
			htmlComment: '<p>HTML</p>',
			privateComment: false,
			publicComment: true,
			solution: false,
		};
		const result = simplifyComment(raw);
		expect(Object.keys(result)).toHaveLength(COMMENT_SIMPLE_FIELDS.size);
		expect(result.id).toBe('C-1');
		expect(result.entityName).toBe('ticket');
		expect(result.entityId).toBe('T-1');
		expect(result.comment).toBe('This is a comment');
		expect(result.createdUserId).toBe('U-10');
		expect(result.createdDate).toBe(1700000000000);
		expect(result.version).toBe('1');
		expect(result.authorName).toBeUndefined();
		expect(result.htmlComment).toBeUndefined();
	});

	it('handles missing optional fields gracefully', () => {
		const raw = { id: 'C-2', entityName: 'salesOrder' };
		const result = simplifyComment(raw);
		expect(result.id).toBe('C-2');
		expect(result.entityName).toBe('salesOrder');
		expect(result.comment).toBeUndefined();
	});

	it('returns empty object for empty input', () => {
		expect(simplifyComment({})).toEqual({});
	});
});
