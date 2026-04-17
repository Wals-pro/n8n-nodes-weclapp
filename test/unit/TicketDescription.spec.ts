import { describe, it, expect } from 'vitest';

import {
	simplifyTicket,
	simplifyComment,
	TICKET_SIMPLE_FIELDS,
	COMMENT_SIMPLE_FIELDS,
	ticketFields,
	commentFields,
} from '../../nodes/Weclapp/descriptions/TicketDescription';

describe('simplifyTicket', () => {
	it('keeps only whitelisted fields', () => {
		const raw = {
			id: 'T-1',
			version: '3',
			ticketStatusId: 'TS-1',
			subject: 'Bug report',
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
		expect(result.ticketStatusId).toBe('TS-1');
		expect(result.subject).toBe('Bug report');
		expect(result.assigneeId).toBe('U-42');
		expect(result.requesterId).toBe('U-7');
		expect(result.createdDate).toBe(1700000000000);
		expect(result.dueDate).toBe(1710000000000);
		expect(result.version).toBe('3');
		expect(result.lastModifiedDate).toBeUndefined();
		expect(result.someInternalField).toBeUndefined();
	});

	it('uses subject (not title) — weclapp v2 field name', () => {
		const raw = { id: 'T-2', subject: 'New subject', title: 'old title field' };
		const result = simplifyTicket(raw);
		expect(result.subject).toBe('New subject');
		// title is NOT in the whitelist; it must be dropped
		expect(result.title).toBeUndefined();
	});

	it('uses ticketStatusId (not status) — weclapp v2 FK field', () => {
		const raw = { id: 'T-3', ticketStatusId: 'TS-99', status: 'OPEN' };
		const result = simplifyTicket(raw);
		expect(result.ticketStatusId).toBe('TS-99');
		// status is NOT in the whitelist; it must be dropped
		expect(result.status).toBeUndefined();
	});

	it('handles missing optional fields gracefully', () => {
		const raw = { id: 'T-4', ticketStatusId: 'TS-2' };
		const result = simplifyTicket(raw);
		expect(result.id).toBe('T-4');
		expect(result.ticketStatusId).toBe('TS-2');
		expect(result.subject).toBeUndefined();
	});

	it('returns empty object for empty input', () => {
		expect(simplifyTicket({})).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Field descriptor tests
// ---------------------------------------------------------------------------

describe('ticketFields: create subject field', () => {
	it('uses "subject" as the field name and body property (not "title")', () => {
		const subjectField = ticketFields.find(
			(f) => f.name === 'subject' && f.displayOptions?.show?.operation?.includes('create'),
		);
		expect(subjectField).toBeDefined();
		expect(subjectField!.routing?.send?.property).toBe('subject');
		expect(subjectField!.routing?.send?.type).toBe('body');
	});

	it('does not have a "title" create field', () => {
		const titleField = ticketFields.find(
			(f) => f.name === 'title' && f.displayOptions?.show?.operation?.includes('create'),
		);
		expect(titleField).toBeUndefined();
	});
});

describe('ticketFields: ticketStatusId (no status enum)', () => {
	it('has ticketStatusId field on create with body routing', () => {
		const statusField = ticketFields.find(
			(f) => f.name === 'ticketStatusId' && f.displayOptions?.show?.operation?.includes('create'),
		);
		expect(statusField).toBeDefined();
		expect(statusField!.routing?.send?.property).toBe('ticketStatusId');
		expect(statusField!.routing?.send?.type).toBe('body');
	});

	it('does not have a top-level "status" enum field', () => {
		// There must be no root-level field named "status" (not inside a collection)
		const statusField = ticketFields.find((f) => f.name === 'status');
		expect(statusField).toBeUndefined();
	});
});

describe('commentFields: entityName on create routed as body', () => {
	it('create entityName field (entityNameCreate) uses type: body', () => {
		const createEntityNameField = commentFields.find(
			(f) => f.name === 'entityNameCreate',
		);
		expect(createEntityNameField).toBeDefined();
		expect(createEntityNameField!.routing?.send?.type).toBe('body');
		expect(createEntityNameField!.routing?.send?.property).toBe('entityName');
	});

	it('list entityName field (entityName) uses type: query', () => {
		const listEntityNameField = commentFields.find((f) => f.name === 'entityName');
		expect(listEntityNameField).toBeDefined();
		expect(listEntityNameField!.routing?.send?.type).toBe('query');
		expect(listEntityNameField!.routing?.send?.property).toBe('entityName');
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
