/**
 * Auto Invoice Generation Service
 * Automatically creates invoices when containers are completed
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { allocateExpenses } from '@/lib/expense-allocation';
import { createInvoiceWithUniqueNumber } from '@/lib/shipment-invoice';
import {
  buildInvoiceLineItemFromCharge,
  markInvoiceShipmentChargesInvoiced,
  markInvoiceShipmentChargesPaid,
} from '@/lib/billing/shipment-charges';
import { materializeContainerShipmentCharges } from '@/lib/billing/container-shipment-charge-materialization';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';

interface InvoiceGenerationResult {
	success: boolean;
	invoiceId?: string;
	invoiceIds?: string[];
	amount?: number;
	message: string;
}

export class AutoInvoiceService {
	/**
	 * Generate invoice for container when status changes to DELIVERED or CLOSED
	 */
	async generateInvoiceForContainer(
		containerId: string
	): Promise<InvoiceGenerationResult> {
		try {
			// Get container with shipments
			const container = await prisma.container.findUnique({
				where: { id: containerId },
				include: {
					shipments: {
						include: {
							user: true,
						},
					},
					expenses: true,
				},
			});

			if (!container) {
				return {
					success: false,
					message: 'Container not found',
				};
			}

			// Filter cash-paid shipments in code
			const cashShipments = container.shipments.filter(
				(s) => s.paymentMode === 'CASH' && s.paymentStatus === 'COMPLETED'
			);

			// Check if container is in completed status
			if (container.status !== 'RELEASED' && container.status !== 'CLOSED') {
				return {
					success: false,
					message: 'Container is not in completed status',
				};
			}

			// Check if there are any CASH paid shipments
			if (cashShipments.length === 0) {
				return {
					success: false,
					message: 'No cash-paid shipments found in this container',
				};
			}

			const allocationMethod = container.expenseAllocationMethod || 'EQUAL';
			const expenseAllocations = allocateExpenses(cashShipments, container.expenses, allocationMethod);
			const shipmentIds = cashShipments.map((shipment) => shipment.id);

			const [shipmentLedgerEntries, shipmentDamageRecords] = await Promise.all([
				shipmentIds.length
					? prisma.ledgerEntry.findMany({
							where: {
								shipmentId: { in: shipmentIds },
								type: 'DEBIT',
							},
							select: {
								id: true,
								userId: true,
								shipmentId: true,
								description: true,
								type: true,
								amount: true,
								transactionDate: true,
								transactionInfoType: true,
								notes: true,
								metadata: true,
							},
						})
					: [],
				shipmentIds.length
					? prisma.containerDamage.findMany({
							where: {
								shipmentId: { in: shipmentIds },
								damageType: 'WE_PAY',
							},
							select: {
								shipmentId: true,
								amount: true,
							},
						})
					: [],
			]);

			const auditLogs: Array<{
				invoiceId: string;
				action: string;
				description: string;
				performedBy: string;
				metadata?: Prisma.InputJsonValue;
			}> = [];

			const invoices = await prisma.$transaction(async (tx) => {
				await materializeContainerShipmentCharges(tx, {
					actorId: 'system',
					allocationMethod,
					containerId,
					expenseAllocations,
					shipmentDamageRecords,
					shipmentLedgerEntries: shipmentLedgerEntries.map((entry) => ({
						...entry,
						type: entry.type as 'DEBIT' | 'CREDIT',
						transactionInfoType: entry.transactionInfoType as 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null,
						metadata: (entry.metadata ?? {}) as Prisma.JsonValue,
					})),
					shipments: cashShipments.map((shipment) => ({
						id: shipment.id,
						userId: shipment.userId,
						serviceType: shipment.serviceType,
						purchasePrice: shipment.purchasePrice,
						price: shipment.price,
						priceListPricingSnapshot: shipment.priceListPricingSnapshot as Prisma.JsonValue | null,
						insuranceValue: shipment.insuranceValue,
						damageCredit: shipment.damageCredit,
						vehicleYear: shipment.vehicleYear,
						vehicleMake: shipment.vehicleMake,
						vehicleModel: shipment.vehicleModel,
						vehicleVIN: shipment.vehicleVIN,
					})),
				});

				const chargesByUser = cashShipments.reduce<Record<string, typeof cashShipments>>((accumulator, shipment) => {
					const shipmentsForUser = accumulator[shipment.userId] || [];
					shipmentsForUser.push(shipment);
					accumulator[shipment.userId] = shipmentsForUser;
					return accumulator;
				}, {});

				const generatedInvoices: Array<{ id: string; invoiceNumber: string; total: number; userId: string }> = [];

				for (const [userId, shipments] of Object.entries(chargesByUser)) {
					const charges = await tx.shipmentCharge.findMany({
						where: {
							userId,
							shipmentId: { in: shipments.map((shipment) => shipment.id) },
							status: 'APPROVED',
							invoiceId: null,
						},
						orderBy: [{ billableAt: 'asc' }, { createdAt: 'asc' }],
						select: {
							id: true,
							chargeCode: true,
							category: true,
							description: true,
							quantity: true,
							unitAmount: true,
							totalAmount: true,
							shipmentId: true,
						},
					});

					if (!charges.length) {
						continue;
					}

					const subtotal = charges.reduce((sum, charge) => sum + charge.totalAmount, 0);
					const lineItems = charges.map((charge) => buildInvoiceLineItemFromCharge(charge));

					const invoice = await createInvoiceWithUniqueNumber(
						tx,
						async (invoiceNumber) =>
							tx.userInvoice.create({
								data: {
									invoiceNumber,
									userId,
									containerId: container.id,
									status: 'PAID',
									issueDate: new Date(),
									dueDate: new Date(),
									paidDate: new Date(),
									subtotal,
									discount: 0,
									tax: 0,
									total: subtotal,
									amountPaid: subtotal,
									amountRemaining: 0,
									paymentMethod: 'CASH',
									internalNotes: 'Auto-generated from completed cash shipment charges',
									lineItems: {
										create: lineItems,
									},
								},
								select: {
									id: true,
									invoiceNumber: true,
									total: true,
								},
							}),
						'AUTO-INV',
					);

					await markInvoiceShipmentChargesInvoiced(tx, invoice.id, charges.map((charge) => charge.id));
					await markInvoiceShipmentChargesPaid(tx, invoice.id);

					auditLogs.push({
						invoiceId: invoice.id,
						action: 'AUTO_INVOICE_CREATED',
						description: `Auto-paid invoice ${invoice.invoiceNumber} created from shipment charges`,
						performedBy: 'system',
						metadata: {
							containerId: container.id,
							shipmentIds: shipments.map((shipment) => shipment.id),
						},
					});

					generatedInvoices.push({
						id: invoice.id,
						invoiceNumber: invoice.invoiceNumber,
						total: invoice.total,
						userId,
					});
				}

				return generatedInvoices;
			});

			if (!invoices.length) {
				return {
					success: false,
					message: 'No approved uninvoiced shipment charges found for completed cash shipments',
				};
			}

			await createInvoiceAuditLogs(auditLogs);

			const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

			return {
				success: true,
				invoiceId: invoices[0]?.id,
				invoiceIds: invoices.map((invoice) => invoice.id),
				amount: totalAmount,
				message: `Generated ${invoices.length} auto-paid invoice(s) for $${totalAmount.toFixed(2)}`,
			};
		} catch (error) {
			console.error('Error generating invoice:', error);
			return {
				success: false,
				message: `Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Auto-generate invoices for all completed containers without invoices
	 */
	async generateInvoicesForCompletedContainers(): Promise<{
		processed: number;
		successful: number;
		failed: number;
		results: InvoiceGenerationResult[];
	}> {
		try {
			// Find completed containers
			const containers = await prisma.container.findMany({
				where: {
					status: {
						in: ['RELEASED', 'CLOSED'],
					},
				},
				include: {
					shipments: true,
				},
			});

			// Filter to only include containers with cash-paid shipments
			const containersWithCash = containers.map((container) => ({
				...container,
				shipments: container.shipments.filter(
					(s) => s.paymentMode === 'CASH' && s.paymentStatus === 'COMPLETED'
				),
			})).filter((c) => c.shipments.length > 0);

			const results: InvoiceGenerationResult[] = [];
			let successful = 0;
			let failed = 0;

			for (const container of containersWithCash) {
				// Skip if no cash shipments
				if (container.shipments.length === 0) {
					continue;
				}

				const result = await this.generateInvoiceForContainer(container.id);
				results.push(result);

				if (result.success) {
					successful++;
				} else {
					failed++;
				}

				// Add delay to avoid overwhelming the database
				await this.sleep(100);
			}

			return {
				processed: results.length,
				successful,
				failed,
				results,
			};
		} catch (error) {
			console.error('Error generating invoices for completed containers:', error);
			return {
				processed: 0,
				successful: 0,
				failed: 0,
				results: [],
			};
		}
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Singleton instance
export const autoInvoice = new AutoInvoiceService();
