'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { toast, StatusBadge, ConfirmDialog } from '@/components/design-system';
import ShipmentsResultsPanel from '@/components/shipments/ShipmentsResultsPanel';
import ShipmentsSearchPanel from '@/components/shipments/ShipmentsSearchPanel';
import type { Shipment, ShipmentTableRow } from '@/components/shipments/shipment-list-types';
import { Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

export default function ShipmentsListPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [shipments, setShipments] = useState<Shipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [showBulkTable, setShowBulkTable] = useState(false);
	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: '',
		type: 'shipments',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const fetchShipments = useCallback(async () => {
		try {
			setLoading(true);
			
			// Build query params from search filters
			const params = new URLSearchParams();
			params.append('page', currentPage.toString());
			params.append('limit', '10');
			
			if (searchFilters.query) params.append('query', searchFilters.query);
			if (searchFilters.status) params.append('status', searchFilters.status);
			if (searchFilters.workflowStage) params.append('workflowStage', searchFilters.workflowStage);
			if (searchFilters.yardReceived) params.append('yardReceived', searchFilters.yardReceived);
			if (searchFilters.delivery) params.append('delivery', searchFilters.delivery);
			if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
			if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
			if (searchFilters.minPrice) params.append('minPrice', searchFilters.minPrice);
			if (searchFilters.maxPrice) params.append('maxPrice', searchFilters.maxPrice);

			const response = await fetch(`/api/search?${params.toString()}&type=shipments&sortBy=createdAt&sortOrder=desc`, { cache: 'no-store' });
			const data = await response.json();
			
			setShipments(data.shipments ?? []);
			setTotalPages(Math.ceil((data.totalShipments ?? 0) / 10) || 1);
		} catch (error) {
			console.error('Error fetching shipments:', error);
			toast.error('Failed to load shipments', {
				description: 'Please try again or refresh the page'
			});
			setShipments([]);
		} finally {
			setLoading(false);
		}
	}, [searchFilters, currentPage]);

	useEffect(() => {
		fetchShipments();
	}, [fetchShipments]);

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
		setCurrentPage(1); // Reset to first page on new search
	};

	const isAdmin = session?.user?.role === 'admin';
	const canManageShipments = hasPermission(session?.user?.role, 'shipments:manage');
	const canMoveWorkflow = hasPermission(session?.user?.role, 'workflow:move') && canManageShipments;
	const canUseBulkMode = canManageShipments || canMoveWorkflow;

	const formatDate = (value: string) => new Date(value).toLocaleDateString();

	const shipmentTableRows: ShipmentTableRow[] = shipments.map((shipment) => {
		const vehicleInfo =
			[shipment.vehicleMake, shipment.vehicleModel, shipment.vehicleYear]
				.filter(Boolean)
				.join(' ') || shipment.vehicleType;

		return {
			id: shipment.id,
			vehicle: vehicleInfo,
			vin: shipment.vehicleVIN ?? '-',
			purchasePrice: shipment.purchasePrice ?? null,
			purchasePricePaid: shipment.purchasePricePaid ?? null,
			status: shipment.status,
			yardReceived: Boolean(shipment.yardReceived),
			paymentStatus: shipment.paymentStatus ?? '-',
			container: shipment.transit?.referenceNumber
				? `Transit ${shipment.transit.referenceNumber}`
				: shipment.container?.containerNumber
					? `Container ${shipment.container.containerNumber}`
					: shipment.dispatch?.referenceNumber
						? `Dispatch ${shipment.dispatch.referenceNumber}`
						: 'Warehouse',
			createdAt: shipment.createdAt,
			customer: shipment.user?.name || shipment.user?.email || '-',
		};
	});

	const canViewFinance = hasPermission(session?.user?.role, 'finance:manage');

	const shipmentColumns: Column<ShipmentTableRow>[] = [
		{ key: 'vehicle', header: 'Vehicle', sortable: true },
		...(canViewFinance ? [{
			key: 'purchasePrice' as const,
			header: 'Purchase Price',
			sortable: true,
			render: (_: unknown, row: ShipmentTableRow) => {
				if (row.purchasePrice == null) {
					return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
				}

				const total = Math.max(0, row.purchasePrice);
				const paid = Math.max(0, row.purchasePricePaid || 0);
				const remaining = Math.max(0, total - paid);
				const isPaidOff = total > 0 && remaining <= 0;

				return (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
						<span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
							${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</span>
						{paid > 0 ? (
							<>
								<span style={{ fontSize: '0.74rem', fontWeight: 700, color: isPaidOff ? 'rgb(34, 197, 94)' : 'rgb(251, 191, 36)' }}>
									Paid ${Math.min(paid, total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</span>
								<span style={{ fontSize: '0.72rem', fontWeight: 600, color: isPaidOff ? 'rgb(34, 197, 94)' : 'var(--text-secondary)' }}>
									{isPaidOff ? '✓ Paid Off' : `Remaining $${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
								</span>
							</>
						) : (
							<span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Unpaid</span>
						)}
					</Box>
				);
			},
		}] : []),
		{ key: 'vin', header: 'VIN', sortable: true },
		{
			key: 'status',
			header: 'Status',
			render: (value, row) => (
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
					<StatusBadge status={String(value)} size="sm" />
					{row.yardReceived && (
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								px: 1,
								py: 0.35,
								borderRadius: 999,
								fontSize: '0.72rem',
								fontWeight: 700,
								bgcolor: 'rgba(34, 197, 94, 0.12)',
								color: 'rgb(21, 128, 61)',
								border: '1px solid rgba(34, 197, 94, 0.28)',
							}}
						>
							Yard Received
						</Box>
					)}
				</Box>
			),
		},
		{
			key: 'paymentStatus',
			header: 'Payment',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{ key: 'container', header: 'Workflow', sortable: true },
		{
			key: 'createdAt',
			header: 'Created',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
	];

	const shipmentStatusOptions = [
		{ value: 'ON_HAND', label: 'On Hand' },
		{ value: 'IN_TRANSIT', label: 'In Transit' },
		{ value: 'RELEASED', label: 'Released' },
	];

const confirmAction = useConfirmAction();

        const handleBulkDelete = async (shipmentIds: string[]) => {
                if (!canManageShipments) return;
                if (!(await confirmAction({
                        message: `Delete ${shipmentIds.length} shipment(s)? This cannot be undone.`,
                        confirmText: 'Delete shipments',
                        severity: 'error',
                }))) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', shipmentIds }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data?.message || 'Bulk delete failed');
			}

			const data = await response.json();
			toast.success('Shipments deleted', {
				description: `${data.count || 0} shipment(s) removed`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error deleting shipments:', error);
			toast.error('Failed to delete shipments');
		}
	};

	const handleBulkExport = (rows: ShipmentTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows,
				[
					{ key: 'vehicle', label: 'Vehicle' },
					{ key: 'vin', label: 'VIN' },
					{ key: 'status', label: 'Status' },
					{ key: 'paymentStatus', label: 'Payment' },
						{ key: 'container', label: 'Workflow' },
					{ key: 'createdAt', label: 'Created' },
					...(isAdmin ? [{ key: 'customer' as const, label: 'Customer' }] : []),
				],
				'shipments'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting shipments:', error);
			toast.error('Failed to export shipments');
		}
	};

	const handleBulkStatusUpdate = async (shipmentIds: string[], status: string) => {
		if (!canMoveWorkflow) return;

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', shipmentIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Shipments updated', {
				description: `${data.count || 0} shipment(s) updated`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error updating shipments:', error);
			toast.error('Failed to update shipments');
		}
	};

	return (
		<DashboardSurface className="overflow-hidden">
			<ShipmentsSearchPanel
				showBreadcrumbs
				onSearch={handleSearch}
				canManageShipments={canManageShipments}
				isAdmin={isAdmin}
				showDeliveryFilter
			/>

			<ShipmentsResultsPanel
				loading={loading}
				shipments={shipments}
				searchQuery={searchFilters.query}
				canManageShipments={canManageShipments}
				canUseBulkMode={canUseBulkMode}
				showBulkTable={showBulkTable}
				onToggleBulkMode={() => setShowBulkTable((prev) => !prev)}
				shipmentTableRows={shipmentTableRows}
				shipmentColumns={shipmentColumns}
				onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
				onBulkDelete={canManageShipments ? handleBulkDelete : undefined}
				onBulkExport={canUseBulkMode ? handleBulkExport : undefined}
				bulkStatusOptions={shipmentStatusOptions}
				onBulkStatusChange={canMoveWorkflow ? handleBulkStatusUpdate : undefined}
				isAdmin={isAdmin}
				canViewFinance={canViewFinance}
				currentPage={currentPage}
				totalPages={totalPages}
				onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
				onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
			/>
		</DashboardSurface>
	);
}
