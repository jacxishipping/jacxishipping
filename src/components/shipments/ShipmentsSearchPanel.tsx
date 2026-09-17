'use client';

import Link from 'next/link';
import { Add, Inventory2 } from '@mui/icons-material';
import { Box } from '@mui/material';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button } from '@/components/design-system';

type ShipmentsSearchPanelProps = {
	onSearch: (filters: SearchFilters) => void;
	canManageShipments: boolean;
	isAdmin: boolean;
	showBreadcrumbs?: boolean;
	showDeliveryFilter?: boolean;
};

export default function ShipmentsSearchPanel({
	onSearch,
	canManageShipments,
	isAdmin,
	showBreadcrumbs = false,
	showDeliveryFilter = false,
}: ShipmentsSearchPanelProps) {
	return (
		<>
			{showBreadcrumbs && (
				<Box sx={{ mb: 1.5 }}>
					<Breadcrumbs />
				</Box>
			)}
			<DashboardPanel
				title={
					<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
						<Inventory2 sx={{ fontSize: 18, color: 'var(--accent-gold)' }} />
						<span>Shipments</span>
					</Box>
				}
				description="Search, filter, and manage your shipments"
				noBodyPadding
				className="overflow-hidden"
				actions={
					canManageShipments ? (
						<Link href="/dashboard/shipments/new" style={{ textDecoration: 'none' }}>
							<Button
								variant="primary"
								size="sm"
								icon={<Add fontSize="small" />}
								iconPosition="start"
							>
								New shipment
							</Button>
						</Link>
					) : null
				}
			>
				<Box sx={{ px: { xs: 1, sm: 1.25, md: 1.5 }, py: { xs: 1, sm: 1.25, md: 1.5 } }}>
					<SmartSearch
						onSearch={onSearch}
						placeholder="Search shipments by tracking number, VIN, origin, destination..."
						showTypeFilter={false}
						showStatusFilter
						showWorkflowStageFilter
						showYardFilter
						showDateFilter
						showPriceFilter
						showUserFilter={isAdmin}					showDeliveryFilter={showDeliveryFilter}						defaultType="shipments"
					/>
				</Box>
			</DashboardPanel>
		</>
	);
}
