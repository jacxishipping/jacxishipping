'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckSquare, ChevronLeft, ChevronRight, Download, Kanban, LayoutGrid, Package, Plus, Square, Table2 } from 'lucide-react';
import ShipmentRow from '@/components/dashboard/ShipmentRow';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { BatchActionsHUD, type BatchItem } from '@/components/dashboard/BatchActionsHUD';
import { CustomerNotificationModal, type CustomerNotificationPayload } from '@/components/dashboard/CustomerNotificationModal';
import { addWorkspaceItem } from '@/components/dashboard/WorkspaceTray';
import { ShipmentKanbanBoard } from '@/components/shipments/ShipmentKanbanBoard';
import { BatchAssignContainerModal } from '@/components/shipments/BatchAssignContainerModal';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';
import type { Shipment, ShipmentTableRow } from '@/components/shipments/shipment-list-types';

export type ShipmentViewMode = 'cards' | 'table' | 'kanban';

type BulkStatusOption = {
	value: string;
	label: string;
};

type ShipmentsResultsPanelProps = {
	loading: boolean;
	shipments: Shipment[];
	searchQuery: string;
	canManageShipments: boolean;
	canUseBulkMode: boolean;
	showBulkTable: boolean;
	onToggleBulkMode: () => void;
	shipmentTableRows: ShipmentTableRow[];
	shipmentColumns: Column<ShipmentTableRow>[];
	onRowClick: (row: ShipmentTableRow) => void;
	onBulkDelete?: (shipmentIds: string[]) => void;
	onBulkExport?: (rows: ShipmentTableRow[]) => void;
	bulkStatusOptions: BulkStatusOption[];
	onBulkStatusChange?: (shipmentIds: string[], status: string) => void;
	isAdmin: boolean;
	canViewFinance: boolean;
	currentPage: number;
	totalPages: number;
	onPreviousPage: () => void;
	onNextPage: () => void;
	onQuickPeek?: (id: string) => void;
	onOpenQR?: (shipment: any) => void;
	onClearFilters?: () => void;
	onRefresh?: () => void;
};

export default function ShipmentsResultsPanel({
	loading,
	shipments,
	searchQuery,
	canManageShipments,
	canUseBulkMode,
	showBulkTable,
	onToggleBulkMode,
	shipmentTableRows,
	shipmentColumns,
	onRowClick,
	onBulkDelete,
	onBulkExport,
	bulkStatusOptions,
	onBulkStatusChange,
	isAdmin,
	canViewFinance,
	currentPage,
	totalPages,
	onPreviousPage,
	onNextPage,
	onQuickPeek,
	onOpenQR,
	onClearFilters,
	onRefresh,
}: ShipmentsResultsPanelProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [notificationPayload, setNotificationPayload] = useState<CustomerNotificationPayload | null>(null);
	const [assignContainerModalOpen, setAssignContainerModalOpen] = useState(false);
	const [viewMode, setViewMode] = useState<ShipmentViewMode>(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('jacxi.shipments_view_mode') as ShipmentViewMode | null;
			if (saved === 'cards' || saved === 'table' || saved === 'kanban') return saved;
		}
		return showBulkTable ? 'table' : 'cards';
	});

	const handleViewModeChange = (mode: ShipmentViewMode) => {
		setViewMode(mode);
		if (typeof window !== 'undefined') {
			localStorage.setItem('jacxi.shipments_view_mode', mode);
		}
		if (mode === 'table' && !showBulkTable) {
			onToggleBulkMode();
		} else if (mode !== 'table' && showBulkTable) {
			onToggleBulkMode();
		}
	};

	const selectedBatchItems: BatchItem[] = shipments
		.filter((s) => selectedIds.has(s.id))
		.map((s) => ({
			id: s.id,
			title: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || 'Vehicle'}`.trim(),
			subtitle: `VIN: ${s.vehicleVIN || 'N/A'}`,
			status: s.status,
			consignee: s.user?.name || s.user?.email,
			vin: s.vehicleVIN || undefined,
		}));

	const handleRowQuickPeek = (id: string) => {
		const target = shipments.find((s) => s.id === id);
		if (target) {
			addWorkspaceItem({
				id: target.id,
				type: 'shipment',
				title: `${target.vehicleYear || ''} ${target.vehicleMake || ''} ${target.vehicleModel || 'Shipment'}`.trim(),
				subtitle: target.vehicleVIN ? `VIN: ${target.vehicleVIN}` : target.status,
				url: `/dashboard/shipments/${target.id}`,
			});
		}
		if (onQuickPeek) onQuickPeek(id);
	};

	const handleOpenNotification = (shipment: Shipment) => {
		setNotificationPayload({
			shipmentId: shipment.id,
			customerName: shipment.user?.name || 'Customer',
			customerEmail: shipment.user?.email || '',
			vehicleDetails: `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle',
			vin: shipment.vehicleVIN || 'N/A',
			containerNumber: shipment.container?.containerNumber || 'PENDING',
			portOfOrigin: shipment.dispatch?.origin || 'US Export Yard',
			destinationPort: shipment.container?.currentLocation || 'Middle East Port',
			trackingLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking?vin=${shipment.vehicleVIN || shipment.id}`,
			eta: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : '3-4 Weeks',
		});
	};

	return (
		<DashboardPanel
			title={
				<div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
					<span>Results</span>
					<span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '999px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold-text)', border: '1px solid rgba(var(--accent-gold-rgb), 0.25)', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.2}}>
						{loading ? '…' : shipments.length}
					</span>
				</div>
			}
			description={
				loading
					? 'Loading shipments…'
					: shipments.length
						? `Showing ${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`
						: 'No shipments found'
			}
			fullHeight
			className="overflow-hidden"
			bodyClassName="overflow-hidden"
			actions={
				<div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
					<div style={{display: 'inline-flex', alignItems: 'center', padding: '3px', borderRadius: '12px', backgroundColor: 'rgba(var(--text-primary-rgb), 0.04)', border: '1px solid var(--border)'}}>
						<button
							type="button"
							onClick={() => handleViewModeChange('cards')}
							className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
								viewMode === 'cards'
									? 'bg-[var(--accent-gold)] text-white shadow-sm'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
							}`}
							title="Card View"
						>
							<LayoutGrid className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Cards</span>
						</button>
						<button
							type="button"
							onClick={() => handleViewModeChange('table')}
							className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
								viewMode === 'table'
									? 'bg-[var(--accent-gold)] text-white shadow-sm'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
							}`}
							title="Table / Bulk Mode"
						>
							<Table2 className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Table</span>
						</button>
						<button
							type="button"
							onClick={() => handleViewModeChange('kanban')}
							className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
								viewMode === 'kanban'
									? 'bg-[var(--accent-gold)] text-white shadow-sm'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
							}`}
							title="Pipeline Kanban Board"
						>
							<Kanban className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Kanban</span>
						</button>
					</div>

					{/* Quick Panel Export Button */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => openUniversalShipmentExport({
							shipmentIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
							filters: searchQuery ? { query: searchQuery } : undefined,
							title: selectedIds.size > 0 ? `Export Selected (${selectedIds.size}) Shipments` : 'Export Shipments',
						})}
						icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
						iconPosition="start"
					>
						Export
					</Button>
				</div>
			}
		>
			{loading ? (
				<SkeletonTable rows={5} columns={6} />
			) : shipments.length === 0 ? (
				<EmptyState
					icon={<Package />}
					title="No shipments found"
					description={searchQuery ? 'No shipments match your search criteria' : 'Get started by creating your first shipment'}
					action={
						onClearFilters && searchQuery ? (
							<div style={{display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}}>
								<Button variant="outline" size="sm" onClick={onClearFilters}>
									Clear Filters
								</Button>
								{canManageShipments ? (
									<Button href="/dashboard/shipments/new" variant="primary" size="sm" icon={<Plus />} iconPosition="start">
										Create shipment
									</Button>
								) : null}
							</div>
						) : canManageShipments ? (
							<Button href="/dashboard/shipments/new" variant="primary" icon={<Plus />} iconPosition="start">
								Create shipment
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					{viewMode === 'table' && (
						<div style={{width: '100%', overflowX: 'auto'}}>
							<DataTable
								data={shipmentTableRows}
								columns={shipmentColumns}
								keyField="id"
								selectable={canUseBulkMode}
								onRowClick={(row) => {
									addWorkspaceItem({
										id: row.id,
										type: 'shipment',
										title: row.vehicle || 'Shipment',
										subtitle: row.vin ? `VIN: ${row.vin}` : row.status,
										url: `/dashboard/shipments/${row.id}`,
									});
									onRowClick(row);
								}}
								onDelete={onBulkDelete}
								onExport={onBulkExport}
								bulkStatusOptions={bulkStatusOptions}
								onBulkStatusChange={onBulkStatusChange}
								currentPage={currentPage}
								totalPages={totalPages}
							/>
						</div>
					)}

					{viewMode === 'kanban' && (
						<div style={{width: '100%', minWidth: 0, paddingTop: '8px', paddingBottom: '8px'}}>
							<ShipmentKanbanBoard
								shipments={shipments}
								onMoveShipment={async (shipmentId, newStatus) => {
									if (onBulkStatusChange) {
										await onBulkStatusChange([shipmentId], newStatus);
									} else {
										try {
											const res = await fetch(`/api/shipments/${shipmentId}`, {
												method: 'PUT',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ status: newStatus }),
											});
											if (!res.ok) throw new Error('Status update failed');
											toast.success(`Shipment updated to ${newStatus.replace(/_/g, ' ')}`);
											if (onRefresh) onRefresh();
										} catch {
											toast.error('Failed to move shipment status');
										}
									}
								}}
								onQuickPeek={handleRowQuickPeek}
								canManageShipments={canManageShipments}
							/>
						</div>
					)}

					{viewMode === 'cards' && (
						<div style={{display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, width: '100%', overflow: 'hidden'}}>
							{/* Select All Quick Bar */}
							{canUseBulkMode && shipments.length > 0 && (
								<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px', paddingTop: '2px', paddingBottom: '2px'}}>
									<button
										type="button"
										onClick={() => {
											if (selectedIds.size === shipments.length) {
												setSelectedIds(new Set());
											} else {
												setSelectedIds(new Set(shipments.map((s) => s.id)));
											}
										}}
										className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors inline-flex items-center gap-1.5"
									>
										{selectedIds.size === shipments.length ? (
											<>
												<CheckSquare className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
												<span>Deselect all ({shipments.length})</span>
											</>
										) : (
											<>
												<Square className="w-3.5 h-3.5" />
												<span>Select all on page ({shipments.length})</span>
											</>
										)}
									</button>
									{selectedIds.size > 0 && (
										<span className="text-xs font-bold text-[var(--accent-gold)]">
											{selectedIds.size} selected
										</span>
									)}
								</div>
							)}

							{shipments.map((shipment, index) => (
								<ShipmentRow
									key={shipment.id}
									{...shipment}
									purchasePrice={canViewFinance ? (shipment.purchasePrice ?? null) : null}
									purchasePricePaid={canViewFinance ? (shipment.purchasePricePaid ?? null) : null}
									showCustomer={isAdmin}
									delay={index * 0.05}
									onQuickPeek={handleRowQuickPeek}
									onOpenQR={onOpenQR}
									onNotify={(id) => {
										const target = shipments.find((s) => s.id === id);
										if (target) handleOpenNotification(target);
									}}
									selectable={canUseBulkMode}
									selected={selectedIds.has(shipment.id)}
									onToggleSelect={(id) => {
										setSelectedIds((prev) => {
											const next = new Set(prev);
											if (next.has(id)) next.delete(id);
											else next.add(id);
											return next;
										});
									}}
								/>
							))}
						</div>
					)}

					{/* Floating Batch Actions HUD */}
					<BatchActionsHUD
						selectedItems={selectedBatchItems}
						entityName="Shipments"
						onClearSelection={() => setSelectedIds(new Set())}
						onBulkThermalPrint={() => {
							window.print();
							toast.success(`Printing batch thermal QR labels for ${selectedBatchItems.length} vehicles`);
						}}
						onBulkAssignContainer={canManageShipments ? () => setAssignContainerModalOpen(true) : undefined}
						onBulkMessage={() => {
							if (selectedBatchItems.length > 0) {
								const batchPayloads = selectedBatchItems
									.map((item) => shipments.find((s) => s.id === item.id))
									.filter(Boolean)
									.map((shipment) => ({
										shipmentId: shipment!.id,
										customerName: shipment!.user?.name || 'Customer',
										customerEmail: shipment!.user?.email || '',
										vehicleDetails: `${shipment!.vehicleYear || ''} ${shipment!.vehicleMake || ''} ${shipment!.vehicleModel || ''}`.trim() || 'Vehicle',
										vin: shipment!.vehicleVIN || 'N/A',
										containerNumber: shipment!.container?.containerNumber || 'PENDING',
										portOfOrigin: shipment!.dispatch?.origin || 'US Export Yard',
										destinationPort: shipment!.container?.currentLocation || 'Destination Port',
										trackingLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking?vin=${shipment!.vehicleVIN || shipment!.id}`,
										eta: shipment!.estimatedDelivery ? new Date(shipment!.estimatedDelivery).toLocaleDateString() : 'On Schedule',
									}));
								if (batchPayloads.length > 0) {
									setNotificationPayload({
										...batchPayloads[0],
										batchRecipients: batchPayloads,
									});
								}
							}
						}}
					/>

					{/* Batch Container Assignment Modal */}
					<BatchAssignContainerModal
						open={assignContainerModalOpen}
						onClose={() => setAssignContainerModalOpen(false)}
						selectedShipmentIds={Array.from(selectedIds)}
						onSuccess={() => {
							setSelectedIds(new Set());
							if (onRefresh) onRefresh();
						}}
					/>

					{/* Customer Notification Studio Modal */}
					{notificationPayload && (
						<CustomerNotificationModal
							open={Boolean(notificationPayload)}
							onClose={() => setNotificationPayload(null)}
							payload={notificationPayload}
						/>
					)}

					{totalPages > 1 && (
						<div style={{marginTop: '16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%'}}>
							<Button
								variant="outline"
								size="sm"
								icon={<ChevronLeft className="h-3.5 w-3.5"/>}
								iconPosition="start"
								onClick={onPreviousPage}
								disabled={currentPage === 1}
								style={{width: 'auto', minHeight: '40px', borderRadius: '999px'}}
							>
								Previous
							</Button>
							<div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '10px', paddingRight: '10px', paddingTop: '4px', paddingBottom: '4px', borderRadius: '999px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', border: '1px solid rgba(var(--accent-gold-rgb), 0.2)'}}>
								<p style={{fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700}}>
									Page {currentPage} of {totalPages}
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								icon={<ChevronRight className="h-3.5 w-3.5"/>}
								iconPosition="end"
								onClick={onNextPage}
								disabled={currentPage === totalPages}
								style={{width: 'auto', minHeight: '40px', borderRadius: '999px'}}
							>
								Next
							</Button>
						</div>
					)}
				</>
			)}
		</DashboardPanel>
	);
}
