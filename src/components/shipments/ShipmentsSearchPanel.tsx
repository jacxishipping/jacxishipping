'use client';

import Link from 'next/link';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button } from '@/components/design-system';
import { Package, Plus } from 'lucide-react';

type ShipmentsSearchPanelProps = {
	onSearch: (filters: SearchFilters) => void;
	onScan?: (scanned: string) => void;
	canManageShipments?: boolean;
	isAdmin: boolean;
	showBreadcrumbs?: boolean;
	showDeliveryFilter?: boolean;
	hideHeader?: boolean;
};

export default function ShipmentsSearchPanel({
	onSearch,
	onScan,
	canManageShipments,
	isAdmin,
	showBreadcrumbs = false,
	showDeliveryFilter = false,
	hideHeader = false,
}: ShipmentsSearchPanelProps) {
	return (
		<>
			{showBreadcrumbs && !hideHeader && (
				<div style={{marginBottom: '12px'}}>
					<Breadcrumbs />
				</div>
			)}
			<DashboardPanel
				title={
					!hideHeader ? (
						<div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
							<Package className="h-[18px] w-[18px]" style={{ color: 'var(--accent-gold)' }}/>
							<span>Shipments</span>
						</div>
					) : undefined
				}
				description={!hideHeader ? "Search, filter, and manage your shipments" : undefined}
				noBodyPadding
				className="overflow-hidden"
				actions={
					!hideHeader && canManageShipments ? (
						<Button
							href="/dashboard/shipments/new"
							variant="primary"
							size="sm"
							icon={<Plus className="h-5 w-5" />}
							iconPosition="start"
						>
							New shipment
						</Button>
					) : null
				}
			>
				<div style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '12px'}}>
					<SmartSearch
						onSearch={onSearch}
						onScan={onScan}
						placeholder="Search shipments by tracking number, VIN, origin, destination..."
						showTypeFilter={false}
						showStatusFilter={false}
						showWorkflowStageFilter={false}
						showYardFilter
						showDateFilter
						showPriceFilter
						showUserFilter={isAdmin}
						showDeliveryFilter={showDeliveryFilter}
						defaultType="shipments"
					/>
				</div>
			</DashboardPanel>
		</>
	);
}
