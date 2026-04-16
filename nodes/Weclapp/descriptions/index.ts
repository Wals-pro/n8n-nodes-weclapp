import type { INodeProperties } from 'n8n-workflow';

// REGISTER_RESOURCE: each resource worker adds one import + one spread entry below.
// Keep entries alphabetized. One export per line to minimise merge conflicts.
import { articleDescription } from './ArticleDescription';
import { bankDescription } from './BankDescription';
import { customApiFields, customApiOperations } from './CustomApiDescription';
export { executeCustomApiCall } from './CustomApiDescription';
import { documentDescription } from './DocumentDescription';
import { partyDescription } from './PartyDescription';
import { productionOrderDescription } from './ProductionOrderDescription';
import { purchaseInvoiceFields, purchaseInvoiceOperations } from './PurchaseInvoiceDescription';
import { purchaseOrderFields, purchaseOrderOperations } from './PurchaseOrderDescription';
import { quotationFields, quotationOperations } from './QuotationDescription';
import { salesInvoiceFields, salesInvoiceOperations } from './SalesInvoiceDescription';
import { salesOrderDescription } from './SalesOrderDescription';

export const resources: INodeProperties[] = [
	// RESOURCE_ENTRIES_START — workers append here, one line each, alphabetized
	...articleDescription,
	...bankDescription,
	...customApiOperations,
	...customApiFields,
	...documentDescription,
	...partyDescription,
	...productionOrderDescription,
	...purchaseInvoiceOperations,
	...purchaseInvoiceFields,
	...purchaseOrderOperations,
	...purchaseOrderFields,
	...quotationOperations,
	...quotationFields,
	...salesInvoiceOperations,
	...salesInvoiceFields,
	...salesOrderDescription,
	// RESOURCE_ENTRIES_END
];
