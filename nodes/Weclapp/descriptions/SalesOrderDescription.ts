import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFields,
	filtersCollection,
	returnAllOrLimit,
	simplifyField,
} from '../SharedFields';

// ─── Operation selector ───────────────────────────────────────────────────────

export const salesOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['salesOrder'],
			},
		},
		options: [
			{
				name: 'Activate Project View',
				value: 'activateProjectView',
				description: 'Activate project view for a sales order',
				action: 'Activate project view',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/activateProjectView',
					},
				},
			},
			{
				name: 'Calculate Sales Prices',
				value: 'calculateSalesPrices',
				description: 'Calculate item prices based on calculation mode and percentage',
				action: 'Calculate sales prices',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/calculateSalesPrices',
					},
				},
			},
			{
				name: 'Cancel or Manually Close',
				value: 'cancelOrManuallyClose',
				description: 'Cancel or manually close a sales order',
				action: 'Cancel or manually close a sales order',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/cancelOrManuallyClose',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sales order',
				action: 'Create a sales order',
				routing: {
					request: {
						method: 'POST',
						url: '/salesOrder',
					},
				},
			},
			{
				name: 'Create Advance Payment Request',
				value: 'createAdvancePaymentRequest',
				description: 'Create an advance payment request (sales invoice) for this order',
				action: 'Create advance payment request',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createAdvancePaymentRequest',
					},
				},
			},
			{
				name: 'Create Customer Return',
				value: 'createCustomerReturn',
				description: 'Create a customer return (incoming goods) for this order',
				action: 'Create customer return',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createCustomerReturn',
					},
				},
			},
			{
				name: 'Create Dropshipping',
				value: 'createDropshipping',
				description: 'Create a dropshipping purchase order for this sales order',
				action: 'Create dropshipping',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createDropshipping',
					},
				},
			},
			{
				name: 'Create Part Payment Invoice',
				value: 'createPartPaymentInvoice',
				description: 'Create a part payment sales invoice for this order',
				action: 'Create part payment invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createPartPaymentInvoice',
					},
				},
			},
			{
				name: 'Create Performance Record',
				value: 'createPerformanceRecord',
				description: 'Create a performance record for this sales order',
				action: 'Create performance record',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createPerformanceRecord',
					},
				},
			},
			{
				name: 'Create Prepayment Final Invoice',
				value: 'createPrepaymentFinalInvoice',
				description: 'Create the final invoice for a prepayment sales order',
				action: 'Create prepayment final invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createPrepaymentFinalInvoice',
					},
				},
			},
			{
				name: 'Create Production Orders',
				value: 'createProductionOrders',
				description: 'Create production orders for this sales order',
				action: 'Create production orders',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createProductionOrders',
					},
				},
			},
			{
				name: 'Create Purchase Order',
				value: 'createPurchaseOrder',
				description: 'Create one or more purchase orders for this sales order',
				action: 'Create purchase order',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createPurchaseOrder',
					},
				},
			},
			{
				name: 'Create Purchase Order Request',
				value: 'createPurchaseOrderRequest',
				description: 'Create a purchase order request for this sales order',
				action: 'Create purchase order request',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createPurchaseOrderRequest',
					},
				},
			},
			{
				name: 'Create Return Labels',
				value: 'createReturnLabels',
				description: 'Create return shipping labels for this order',
				action: 'Create return labels',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createReturnLabels',
					},
				},
			},
			{
				name: 'Create Sales Invoice',
				value: 'createSalesInvoice',
				description: 'Create a sales invoice for this order',
				action: 'Create sales invoice',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createSalesInvoice',
					},
				},
			},
			{
				name: 'Create Shipment',
				value: 'createShipment',
				description: 'Create a shipment for this sales order',
				action: 'Create shipment',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createShipment',
					},
				},
			},
			{
				name: 'Create Shipping Labels',
				value: 'createShippingLabels',
				description: 'Generate shipping labels for this order',
				action: 'Create shipping labels',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/createShippingLabels',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a sales order by ID',
				action: 'Delete a sales order',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true, "id": $parameter.salesOrderId } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Download Order Confirmation PDF',
				value: 'downloadLatestOrderConfirmationPdf',
				description: 'Download the latest order confirmation as a PDF',
				action: 'Download order confirmation PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/downloadLatestOrderConfirmationPdf',
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a sales order by ID',
				action: 'Get a sales order',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List sales orders with optional filters and pagination',
				action: 'List sales orders',
				routing: {
					request: {
						method: 'GET',
						url: '/salesOrder',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'result',
								},
							},
						],
					},
				},
			},
			{
				name: 'Manually Close',
				value: 'manuallyClose',
				description: 'Manually close a sales order',
				action: 'Manually close a sales order',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/manuallyClose',
					},
				},
			},
			{
				name: 'Preview Order Confirmation PDF',
				value: 'previewSalesOrderConfirmation',
				description: 'Download a preview of the sales order confirmation as a PDF',
				action: 'Preview order confirmation PDF',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/previewSalesOrderConfirmation',
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Print Label',
				value: 'printLabel',
				description: 'Print item labels for this sales order',
				action: 'Print label',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/printLabel',
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Print Order Data',
				value: 'printOrderData',
				description: 'Download order data as a PDF',
				action: 'Print order data',
				routing: {
					request: {
						method: 'GET',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/printOrderData',
						encoding: 'arraybuffer',
					},
					output: {
						postReceive: [
							{
								type: 'binaryData',
								properties: {
									destinationProperty: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Recalculate Costs',
				value: 'recalculateCosts',
				description: 'Recalculate item and order costs from current environment',
				action: 'Recalculate costs',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/recalculateCosts',
					},
				},
			},
			{
				name: 'Reset Taxes',
				value: 'resetTaxes',
				description: 'Reset order item taxes to defaults',
				action: 'Reset taxes',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/resetTaxes',
					},
				},
			},
			{
				name: 'Set Costs for Items Without Cost',
				value: 'setCostsForItemsWithoutCost',
				description: 'Set unit cost for all order items that currently have no cost',
				action: 'Set costs for items without cost',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/setCostsForItemsWithoutCost',
					},
				},
			},
			{
				name: 'Ship Order for External Fulfillment',
				value: 'shipOrderForExternalFulfillment',
				description: 'Mark this order as shipped via external fulfillment',
				action: 'Ship order for external fulfillment',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/shipOrderForExternalFulfillment',
					},
				},
			},
			{
				name: 'Toggle Project Team',
				value: 'toggleProjectTeam',
				description: 'Toggle the project team for a sales order',
				action: 'Toggle project team',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/toggleProjectTeam',
					},
				},
			},
			{
				name: 'Toggle Services Finished',
				value: 'toggleServicesFinished',
				description: 'Toggle the services-finished state for a sales order',
				action: 'Toggle services finished',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/toggleServicesFinished',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a sales order by ID (PUT with ignoreMissingProperties)',
				action: 'Update a sales order',
				routing: {
					request: {
						method: 'PUT',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}',
						qs: {
							ignoreMissingProperties: true,
						},
					},
				},
			},
			{
				name: 'Update Prices',
				value: 'updatePrices',
				description: 'Refresh order item prices from current article prices',
				action: 'Update prices',
				routing: {
					request: {
						method: 'POST',
						url: '=/salesOrder/id/{{$parameter.salesOrderId}}/updatePrices',
					},
				},
			},
		],
		default: 'list',
	},
];

// ─── Fields ───────────────────────────────────────────────────────────────────

export const salesOrderFields: INodeProperties[] = [
	// ── Shared ID field (all ops except list/create) ──────────────────────────
	{
		displayName: 'Sales Order ID',
		name: 'salesOrderId',
		type: 'string',
		required: true,
		default: '',
		description: 'The internal weclapp ID of the sales order',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: [
					'get',
					'update',
					'delete',
					'activateProjectView',
					'calculateSalesPrices',
					'cancelOrManuallyClose',
					'createAdvancePaymentRequest',
					'createCustomerReturn',
					'createDropshipping',
					'createPartPaymentInvoice',
					'createPerformanceRecord',
					'createPrepaymentFinalInvoice',
					'createProductionOrders',
					'createPurchaseOrder',
					'createPurchaseOrderRequest',
					'createReturnLabels',
					'createSalesInvoice',
					'createShipment',
					'createShippingLabels',
					'downloadLatestOrderConfirmationPdf',
					'manuallyClose',
					'previewSalesOrderConfirmation',
					'printLabel',
					'printOrderData',
					'recalculateCosts',
					'resetTaxes',
					'setCostsForItemsWithoutCost',
					'shipOrderForExternalFulfillment',
					'toggleProjectTeam',
					'toggleServicesFinished',
					'updatePrices',
				],
			},
		},
	},

	// ── List: pagination + filters ────────────────────────────────────────────
	...returnAllOrLimit.map((f) => ({
		...f,
		displayOptions: { show: { resource: ['salesOrder'], operation: ['list'] } },
	})),
	{
		...filtersCollection,
		description:
			'Filter sales orders using weclapp filter operators. Common fields: orderNumber, commission, salesOrderPaymentType, orderDate, status, customerId, recordCurrencyId.',
		displayOptions: { show: { resource: ['salesOrder'], operation: ['list'] } },
	},

	// ── List / Get: simplify ──────────────────────────────────────────────────
	{
		...simplifyField,
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['list', 'get'],
			},
		},
	},

	// ── Create / Update: body JSON ────────────────────────────────────────────
	{
		displayName: 'Body (JSON)',
		name: 'body',
		type: 'json',
		default: '{}',
		description: 'Sales order fields to send in the request body (JSON object)',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			request: {
				body: '={{ JSON.parse($value) }}',
			},
		},
	},

	// ── Additional fields (list / get / create / update) ─────────────────────
	{
		...additionalFields,
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['list', 'get', 'create', 'update'],
			},
		},
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// Action-specific parameter fields
	// ═══════════════════════════════════════════════════════════════════════════

	// ── calculateSalesPrices ──────────────────────────────────────────────────
	{
		displayName: 'Calculation Mode',
		name: 'calculationMode',
		type: 'options',
		required: true,
		default: 'COST_SURCHARGE',
		description: 'Determines how new item prices are calculated',
		options: [
			{
				name: 'Cost Surcharge',
				value: 'COST_SURCHARGE',
				description: 'Net price = purchase cost + cost × surcharge %',
			},
			{
				name: 'Target Margin',
				value: 'TARGET_MARGIN',
				description: 'Net price = purchase cost × 100 / (100 − target margin %)',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					calculationMode: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Percentage',
		name: 'percentage',
		type: 'string',
		required: true,
		default: '',
		description: 'Surcharge or target margin percentage (decimal string, e.g. "15.5")',
		placeholder: 'e.g. 15.5',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					percentage: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Order Item IDs',
		name: 'orderItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of order item IDs to recalculate (leave empty to recalculate all items)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['calculateSalesPrices'],
			},
		},
		routing: {
			request: {
				body: {
					orderItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},

	// ── createCustomerReturn ──────────────────────────────────────────────────
	{
		displayName: 'Item IDs',
		name: 'customerReturnItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of order item IDs to include in the return (leave empty for all items)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createCustomerReturn'],
			},
		},
		routing: {
			request: {
				body: {
					itemIds: '={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
				},
			},
		},
	},

	// ── createDropshipping ────────────────────────────────────────────────────
	{
		displayName: 'Supplier ID',
		name: 'dropshippingSupplierId',
		type: 'string',
		required: true,
		default: '',
		description: 'The weclapp ID of the supplier to create the dropshipping order with',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createDropshipping'],
			},
		},
		routing: {
			request: {
				body: {
					supplierId: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Order Item IDs (Dropshipping)',
		name: 'dropshippingOrderItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of order item IDs to include in dropshipping (leave empty for all)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createDropshipping'],
			},
		},
		routing: {
			request: {
				body: {
					orderItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
				},
			},
		},
	},

	// ── createProductionOrders ────────────────────────────────────────────────
	{
		displayName: 'Order Item IDs (Production)',
		name: 'productionOrderItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of order item IDs to create production orders for (leave empty for all)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createProductionOrders'],
			},
		},
		routing: {
			request: {
				body: {
					orderItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
				},
			},
		},
	},

	// ── createPurchaseOrder ───────────────────────────────────────────────────
	{
		displayName: 'Create Multiple Purchase Orders',
		name: 'multiplePurchaseOrders',
		type: 'boolean',
		default: false,
		description: 'Whether to create one purchase order per supplier instead of a combined one',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrder'],
			},
		},
		routing: {
			request: {
				body: {
					multiplePurchaseOrders: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Supplier ID (Purchase Order)',
		name: 'purchaseOrderSupplierId',
		type: 'string',
		default: '',
		description: 'Optional supplier ID to restrict the purchase order to a specific supplier',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrder'],
			},
		},
		routing: {
			request: {
				body: {
					supplierId: '={{ $value || null }}',
				},
			},
		},
	},
	{
		displayName: 'Warehouse ID (Purchase Order)',
		name: 'purchaseOrderWarehouseId',
		type: 'string',
		default: '',
		description: 'Optional warehouse ID to associate with the purchase order',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrder'],
			},
		},
		routing: {
			request: {
				body: {
					warehouseId: '={{ $value || null }}',
				},
			},
		},
	},

	// ── createPurchaseOrderRequest ────────────────────────────────────────────
	{
		displayName: 'Request Type',
		name: 'requestType',
		type: 'options',
		required: true,
		default: 'PURCHASE_ORDER_REQUEST',
		description: 'The type of purchase order request to create',
		options: [
			{ name: 'Blanket Order Request', value: 'BLANKET_ORDER_REQUEST' },
			{ name: 'Blanket Purchase Order Request', value: 'BLANKET_PURCHASE_ORDER_REQUEST' },
			{ name: 'Drop Shipping Request', value: 'DROP_SHIPPING_REQUEST' },
			{ name: 'Purchase Order Request', value: 'PURCHASE_ORDER_REQUEST' },
			{ name: 'Sales Order Commission Request', value: 'SALES_ORDER_COMMISSION_REQUEST' },
		],
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					requestType: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Warehouse ID (PO Request)',
		name: 'purchaseOrderRequestWarehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The weclapp ID of the warehouse for this purchase order request',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					warehouseId: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Order Item IDs (PO Request)',
		name: 'purchaseOrderRequestItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of order item IDs to include (leave empty for all items)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					orderItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Supplier IDs (PO Request)',
		name: 'purchaseOrderRequestSupplierIds',
		type: 'string',
		default: '',
		description: 'Comma-separated list of supplier IDs to restrict the request to',
		placeholder: 'e.g. 11111,22222',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					supplierIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Use Item Quantity',
		name: 'useItemQuantity',
		type: 'boolean',
		default: false,
		description:
			'Whether to use the item quantity from the order (only for PURCHASE_ORDER_REQUEST and BLANKET_ORDER_REQUEST types)',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					useItemQuantity: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Merge Items',
		name: 'mergeItems',
		type: 'boolean',
		default: false,
		description:
			'Whether to merge items with the same article (only valid when Use Item Quantity is enabled)',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createPurchaseOrderRequest'],
			},
		},
		routing: {
			request: {
				body: {
					mergeItems: '={{$value}}',
				},
			},
		},
	},

	// ── createSalesInvoice ────────────────────────────────────────────────────
	{
		displayName: 'Additional Sales Order IDs',
		name: 'additionalSalesOrderIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of additional sales order IDs to combine into the invoice',
		placeholder: 'e.g. 99991,99992',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createSalesInvoice'],
			},
		},
		routing: {
			request: {
				body: {
					additionalSalesOrderIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
				},
			},
		},
	},

	// ── createShipment ────────────────────────────────────────────────────────
	{
		displayName: 'Additional Sales Order IDs (Shipment)',
		name: 'additionalSalesOrderIdsShipment',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of additional sales order IDs to include in the shipment',
		placeholder: 'e.g. 99991,99992',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['createShipment'],
			},
		},
		routing: {
			request: {
				body: {
					additionalSalesOrderIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : [] }}',
				},
			},
		},
	},

	// ── printLabel ────────────────────────────────────────────────────────────
	{
		displayName: 'Item Label Quantity Print Setting',
		name: 'itemLabelQuantityPrintSetting',
		type: 'options',
		required: true,
		default: 'ITEM_QUANTITY',
		description: 'How many labels to print per item',
		options: [
			{
				name: 'Item Quantity',
				value: 'ITEM_QUANTITY',
				description: 'Print one label per unit of quantity',
			},
			{
				name: 'Only One Label per Booking Record',
				value: 'ONLY_ONE_LABEL_PER_BOOKING_RECORD',
				description: 'Print one label per booking record regardless of quantity',
			},
			{
				name: 'Only One Label per Item',
				value: 'ONLY_ONE_LABEL_PER_ITEM',
				description: 'Print one label per order item',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					itemLabelQuantityPrintSetting: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Sales Order Item IDs (Print Label)',
		name: 'printLabelItemIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of sales order item IDs to print labels for (leave empty for all)',
		placeholder: 'e.g. 12345,67890',
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['printLabel'],
			},
		},
		routing: {
			request: {
				body: {
					salesOrderItemIds:
						'={{ $value ? $value.split(",").map(s => s.trim()).filter(Boolean) : undefined }}',
				},
			},
		},
	},

	// ── setCostsForItemsWithoutCost ───────────────────────────────────────────
	{
		displayName: 'Cost Update Mode',
		name: 'costUpdateMode',
		type: 'options',
		required: true,
		default: 'SET_TO_NET_UNIT_PRICE',
		description: 'How to set the unit cost for items that currently have no cost',
		options: [
			{
				name: 'Set to Net Unit Price',
				value: 'SET_TO_NET_UNIT_PRICE',
				description: 'Use the net unit price of the item as the unit cost',
			},
			{
				name: 'Set to Zero',
				value: 'SET_TO_ZERO',
				description: 'Set unit cost to zero',
			},
		],
		displayOptions: {
			show: {
				resource: ['salesOrder'],
				operation: ['setCostsForItemsWithoutCost'],
			},
		},
		routing: {
			request: {
				body: {
					costUpdateMode: '={{$value}}',
				},
			},
		},
	},
];

// ─── Bundled export ───────────────────────────────────────────────────────────

export const salesOrderDescription: INodeProperties[] = [
	...salesOrderOperations,
	...salesOrderFields,
];
