/**
 * Regression test: every list operation in every descriptor must include
 * a postReceive step of type 'rootProperty' with property === 'result'.
 *
 * This prevents a recurrence of the bug where weclapp's {result: [...]}
 * envelope was not unwrapped, causing list ops to return 0 items.
 */

import { describe, it, expect } from 'vitest';
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { articleOperations } from '../../nodes/Weclapp/descriptions/ArticleDescription';
import { bankAccountOperations, bankTransactionOperations } from '../../nodes/Weclapp/descriptions/BankDescription';
import { documentOperations } from '../../nodes/Weclapp/descriptions/DocumentDescription';
import { productionOrderOperations } from '../../nodes/Weclapp/descriptions/ProductionOrderDescription';
import { purchaseInvoiceOperations } from '../../nodes/Weclapp/descriptions/PurchaseInvoiceDescription';
import { purchaseOrderOperations } from '../../nodes/Weclapp/descriptions/PurchaseOrderDescription';
import { quotationOperations } from '../../nodes/Weclapp/descriptions/QuotationDescription';
import { salesInvoiceOperations } from '../../nodes/Weclapp/descriptions/SalesInvoiceDescription';
import { salesOrderOperations } from '../../nodes/Weclapp/descriptions/SalesOrderDescription';
import { shipmentOperations } from '../../nodes/Weclapp/descriptions/ShipmentDescription';
import {
	tagOperations,
	unitOperations,
	userOperations,
	customAttributeDefinitionOperations,
} from '../../nodes/Weclapp/descriptions/TagUnitUserDescription';
import { ticketOperations, commentOperations } from '../../nodes/Weclapp/descriptions/TicketDescription';
import {
	warehouseOperations,
	warehouseStockOperations,
	warehouseStockMovementOperations,
} from '../../nodes/Weclapp/descriptions/WarehouseDescription';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type OperationOption = INodePropertyOptions & {
	routing?: {
		output?: {
			postReceive?: Array<{
				type: string;
				properties?: { property?: string };
			}>;
		};
	};
};

/**
 * Returns true when the option's routing.output.postReceive array contains
 * a rootProperty step with property === 'result'.
 */
function hasRootPropertyUnwrap(option: OperationOption): boolean {
	const steps = option.routing?.output?.postReceive ?? [];
	return steps.some(
		(step) => step.type === 'rootProperty' && step.properties?.property === 'result',
	);
}

/**
 * Given an operations INodeProperties[], finds the option with value === 'list'
 * and asserts it has the rootProperty postReceive step.
 */
function assertListHasRootProperty(
	label: string,
	operations: INodeProperties[],
): void {
	it(`${label}: list op has rootProperty postReceive with property "result"`, () => {
		const opField = operations[0];
		expect(opField).toBeDefined();

		const options = opField.options as OperationOption[];
		expect(options).toBeDefined();

		const listOp = options.find((o) => o.value === 'list');
		expect(listOp, `No list operation found in ${label}`).toBeDefined();

		expect(
			hasRootPropertyUnwrap(listOp!),
			`${label} list op is missing postReceive rootProperty {property: "result"}`,
		).toBe(true);
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rootProperty postReceive on list operations', () => {
	// These must all pass. Any new resource descriptor added to the node MUST
	// also be listed here or the coverage will silently drop.

	assertListHasRootProperty('article', articleOperations);
	assertListHasRootProperty('bankAccount', bankAccountOperations);
	assertListHasRootProperty('bankTransaction', bankTransactionOperations);
	assertListHasRootProperty('comment', commentOperations);
	assertListHasRootProperty('customAttributeDefinition', customAttributeDefinitionOperations);
	assertListHasRootProperty('document', documentOperations);
	assertListHasRootProperty('productionOrder', productionOrderOperations);
	assertListHasRootProperty('purchaseInvoice', purchaseInvoiceOperations);
	assertListHasRootProperty('purchaseOrder', purchaseOrderOperations);
	assertListHasRootProperty('quotation', quotationOperations);
	assertListHasRootProperty('salesInvoice', salesInvoiceOperations);
	assertListHasRootProperty('salesOrder', salesOrderOperations);
	assertListHasRootProperty('shipment', shipmentOperations);
	assertListHasRootProperty('tag', tagOperations);
	assertListHasRootProperty('ticket', ticketOperations);
	assertListHasRootProperty('unit', unitOperations);
	assertListHasRootProperty('user', userOperations);
	assertListHasRootProperty('warehouse', warehouseOperations);
	assertListHasRootProperty('warehouseStock', warehouseStockOperations);
	assertListHasRootProperty('warehouseStockMovement', warehouseStockMovementOperations);
});
