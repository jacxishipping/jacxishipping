"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import type { SvgIconComponent } from '@mui/icons-material';
import { Dashboard, Inventory2, Description, Search, Analytics, Group, AllInbox, Receipt, ReceiptLong, AccountBalance, Payment, Business, LocalShipping, SmartToy, Hub, PhoneInTalk, Route, ExpandLess, ExpandMore, AdminPanelSettings, CompareArrows, SwapHoriz, Settings, Timer, ChevronLeft, ChevronRight, Logout, Close } from '@mui/icons-material';
import { signOut, useSession } from 'next-auth/react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Collapse, Avatar, Tooltip } from '@mui/material';
import { JXBox, JXButton, JXDivider, SpringButton } from '@jacxishippingorg/jx-ui-react';
import { hasPermission, type Permission } from '@/lib/rbac';
import { useTheme } from '@/hooks/useTheme';
import SiteLogo from '@/components/brand/SiteLogo';

type NavigationItem = {
	name: string;
	href: string;
	icon: SvgIconComponent;
	requiredPermission?: Permission;
	allowedRoles?: string[];
};

type NavBadges = {
	agingShipments: number;
	overdueInvoices: number;
};

type BadgeColor = 'warning' | 'error';

type BadgeMap = Record<string, { count: number; color: BadgeColor }>;

const mainNavigation: NavigationItem[] = [
	{
		name: 'Dashboard',
		href: '/dashboard',
		icon: Dashboard,
	},
];

const shipmentNavigation: NavigationItem[] = [
	{
		name: 'Shipments',
		href: '/dashboard/shipments',
		icon: Inventory2,
		requiredPermission: 'shipments:view',
	},
	{
		name: 'Company Getpasses',
		href: '/dashboard/company-getpasses',
		icon: Timer,
		requiredPermission: 'shipments:manage',
	},
	{
		name: 'Containers',
		href: '/dashboard/containers',
		icon: AllInbox,
		requiredPermission: 'containers:view',
	},
	{
		name: 'Dispatches',
		href: '/dashboard/dispatches',
		icon: LocalShipping,
		requiredPermission: 'dispatches:manage',
	},
	{
		name: 'Operations Board',
		href: '/dashboard/operations',
		icon: CompareArrows,
		requiredPermission: 'shipments:manage',
	},
	{
		name: 'Transits',
		href: '/dashboard/transits',
		icon: Route,
		requiredPermission: 'transits:manage',
	},
	{
		name: 'Track Shipments',
		href: '/dashboard/tracking',
		icon: Search,
		requiredPermission: 'tracking:view',
	},
	{
		name: 'Tracking Diagnostics',
		href: '/dashboard/tracking-diagnostics',
		icon: Analytics,
		requiredPermission: 'shipments:read_all',
	},
];

const financeNavigation: NavigationItem[] = [
	{
		name: 'Finance',
		href: '/dashboard/finance',
		icon: AccountBalance,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Office Expenses',
		href: '/dashboard/finance/office-expenses',
		icon: ReceiptLong,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Banking',
		href: '/dashboard/finance/banking',
		icon: Payment,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Invoices',
		href: '/dashboard/invoices',
		icon: Receipt,
		requiredPermission: 'invoices:view',
	},
	{
		name: 'Company Ledgers',
		href: '/dashboard/finance/companies',
		icon: Business,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Ledger Transfers',
		href: '/dashboard/finance/transfers',
		icon: SwapHoriz,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Price Comparison',
		href: '/dashboard/finance/price-comparison',
		icon: CompareArrows,
		requiredPermission: 'finance:view',
	},
];

const companyNavigation: NavigationItem[] = [
	{
		name: 'Customers',
		href: '/dashboard/customers',
		icon: Group,
		requiredPermission: 'customers:view',
	},
	{
		name: 'Partner Portals',
		href: '/dashboard/partner-portals',
		icon: Group,
		requiredPermission: 'customers:manage',
	},
];

const aiDocumentNavigation: NavigationItem[] = [
	{
		name: 'Documents',
		href: '/dashboard/documents',
		icon: Description,
		requiredPermission: 'documents:view',
	},
	{
		name: 'MCP Server',
		href: '/dashboard/mcp',
		icon: Hub,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'AI Logs',
		href: '/dashboard/ai-logs',
		icon: SmartToy,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'Call Agent',
		href: '/dashboard/settings/call-agent',
		icon: PhoneInTalk,
		requiredPermission: 'users:manage',
		allowedRoles: ['admin'],
	},
];

const settingsNavigation: NavigationItem[] = [
	{
		name: 'My Profile',
		href: '/dashboard/settings',
		icon: Settings,
	},
];

const adminNavigation: NavigationItem[] = [
	{
		name: 'Analytics',
		href: '/dashboard/analytics',
		icon: Analytics,
		requiredPermission: 'analytics:view',
	},
	{
		name: 'Users',
		href: '/dashboard/users',
		icon: Group,
		requiredPermission: 'users:manage',
	},
];

interface SidebarProps {
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
	const pathname = usePathname();
	const { data: session } = useSession();
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;
	const visibleAdminItems = filterNavigationItems(adminNavigation, userRole);
	const hasActiveAdminItem = visibleAdminItems.some((item) => isNavigationItemActive(pathname, item.href));
	const [adminCollapsedPreference, setAdminCollapsedPreference] = useState(false);
	const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

	const adminCollapsed = hasActiveAdminItem ? false : adminCollapsedPreference;
	const desktopDrawerWidth = isDesktopCollapsed ? 72 : 260;

	useEffect(() => {
		setAdminCollapsedPreference(window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY) === 'true');
		try {
			setIsDesktopCollapsed(window.localStorage.getItem('jacxi.sidebar_collapsed') === 'true');
		} catch {
			// ignore storage errors
		}
	}, []);

	const toggleAdminCollapsed = () => {
		setAdminCollapsedPreference((prev) => {
			const next = !prev;
			window.localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, String(next));
			return next;
		});
	};

	const toggleDesktopCollapsed = () => {
		setIsDesktopCollapsed((prev) => {
			const next = !prev;
			try {
				window.localStorage.setItem('jacxi.sidebar_collapsed', String(next));
			} catch {
				// ignore storage errors
			}
			return next;
		});
	};

	return (
		<>
			{/* Mobile Drawer */}
			<Drawer
				variant="temporary"
				open={mobileOpen}
				onClose={onMobileClose}
				ModalProps={{
					keepMounted: true,
				}}
				sx={{
					display: { xs: 'block', lg: 'none' },
					'& .MuiDrawer-paper': {
						width: 'min(300px, 85vw)',
						height: '100%',
						boxSizing: 'border-box',
						background: 'linear-gradient(180deg, var(--panel) 0%, rgba(var(--panel-rgb), 0.97) 100%)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						boxShadow: '0 10px 30px rgba(var(--text-primary-rgb),0.2)',
					},
				}}
			>
				<SidebarContent
					pathname={pathname}
					session={session}
					adminCollapsed={adminCollapsed}
					onToggleAdminCollapsed={toggleAdminCollapsed}
					onNavClick={onMobileClose}
					isMobile
				/>
			</Drawer>

			{/* Desktop Drawer */}
			<Drawer
				variant="permanent"
				sx={{
					display: { xs: 'none', lg: 'block' },
					width: desktopDrawerWidth,
					flexShrink: 0,
					transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
					'& .MuiDrawer-paper': {
						width: desktopDrawerWidth,
						boxSizing: 'border-box',
						background: 'linear-gradient(180deg, var(--panel) 0%, rgba(var(--panel-rgb), 0.97) 100%)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.15)',
						boxShadow: 'inset -1px 0 0 var(--border)',
						position: 'relative',
						height: '100%',
						overflow: 'hidden',
						transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
					},
				}}
			>
				<SidebarContent
					pathname={pathname}
					session={session}
					adminCollapsed={adminCollapsed}
					onToggleAdminCollapsed={toggleAdminCollapsed}
					collapsed={isDesktopCollapsed}
					onToggleCollapse={toggleDesktopCollapsed}
				/>
			</Drawer>
		</>
	);
}

type NavItemProps = {
	item: NavigationItem;
	isActive: (href: string) => boolean;
	badge?: number;
	badgeColor?: BadgeColor;
	onNavClick?: () => void;
	collapsed?: boolean;
};

function NavItem({ item, isActive, badge, badgeColor, onNavClick, collapsed }: NavItemProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const Icon = item.icon;
	const active = isActive(item.href);
	const router = useRouter();

	// Prefetch on hover/focus so the target route's chunk and data are ready
	// before the click, making navigation feel instant after first visit.
	const handlePrefetch = () => {
		router.prefetch(item.href);
	};

	const badgeStyles: Record<BadgeColor, { background: string; color: string; border: string }> = {
		warning: {
			background: 'rgba(var(--warning-rgb), 0.15)',
			color: 'var(--warning)',
			border: '1px solid rgba(var(--warning-rgb), 0.3)',
		},
		error: {
			background: 'rgba(var(--error-rgb), 0.15)',
			color: 'var(--error)',
			border: '1px solid rgba(var(--error-rgb), 0.3)',
		},
	};
	const badgeStyle = badgeColor ? badgeStyles[badgeColor] : null;
	const badgeLabel = typeof badge === 'number' && badge > 99 ? '99+' : badge;

	const itemButton = (
		<ListItemButton
			component={Link}
			href={item.href}
			onClick={onNavClick}
			onMouseEnter={handlePrefetch}
			onFocus={handlePrefetch}
			selected={active}
			aria-current={active ? 'page' : undefined}
			sx={{
				position: 'relative',
				borderRadius: isCompact ? 1.25 : 1.5,
				mx: collapsed ? 0.5 : (isCompact ? 0.75 : 1),
				my: isCompact ? 0.125 : 0.25,
				py: isCompact ? 0.45 : 0.75,
				px: collapsed ? (isCompact ? 0.75 : 1) : (isCompact ? 1.25 : 1.5),
				justifyContent: collapsed ? 'center' : 'initial',
				minHeight: 0,
				transition: 'all 150ms ease',
				color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
				bgcolor: active ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'transparent',
				boxShadow: active ? 'inset 0 0 0 1px rgba(var(--accent-gold-rgb), 0.2)' : 'none',
				'&:hover': {
					bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
					color: 'var(--text-primary)',
				},
				'&::before': active
					? {
							content: '""',
							position: 'absolute',
							left: 0,
							top: 4,
							bottom: 4,
							width: 4,
							borderRadius: '0 2px 2px 0',
							backgroundColor: 'var(--accent-gold)',
							boxShadow: '2px 0 8px rgba(var(--accent-gold-rgb), 0.4)',
					  }
					: {},
			}}
		>
			<ListItemIcon
				sx={{
					minWidth: collapsed ? 0 : 32,
					justifyContent: 'center',
					color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
					'.MuiListItemButton-root:hover &': {
						color: 'var(--text-primary)',
					},
				}}
			>
				<Icon sx={{ fontSize: 18, filter: active ? 'drop-shadow(0 0 4px rgba(var(--accent-gold-rgb), 0.5))' : 'none' }} />
				{collapsed && typeof badge === 'number' && badge > 0 && (
					<Box
						component="span"
						sx={{
							position: 'absolute',
							top: 6,
							right: 14,
							width: 7,
							height: 7,
							borderRadius: '50%',
							bgcolor: badgeColor === 'error' ? 'var(--error)' : 'var(--warning)',
						}}
					/>
				)}
			</ListItemIcon>
			{!collapsed && (
				<ListItemText
					primary={item.name}
					primaryTypographyProps={{
						fontSize: isCompact ? '0.8125rem' : '0.9rem',
						fontWeight: 500,
						color: 'inherit',
					}}
				/>
			)}
			{!collapsed && typeof badge === 'number' && badge > 0 && badgeStyle && (
				<Box
					component="span"
					sx={{
						borderRadius: '999px',
						px: 0.75,
						py: 0.125,
						fontSize: '0.625rem',
						fontWeight: 800,
						lineHeight: 1.6,
						minWidth: '18px',
						textAlign: 'center',
						ml: 'auto',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
						background: badgeStyle.background,
						color: badgeStyle.color,
						border: badgeStyle.border,
					}}
				>
					{badgeLabel}
				</Box>
			)}
		</ListItemButton>
	);

	if (collapsed) {
		return (
			<Tooltip title={item.name} placement="right" arrow>
				{itemButton}
			</Tooltip>
		);
	}

	return itemButton;
}

type NavSectionProps = {
	title?: string;
	items: NavigationItem[];
	role?: string;
	isActive: (href: string) => boolean;
	badgeMap?: BadgeMap;
	onNavClick?: () => void;
	collapsed?: boolean;
};

const ADMIN_SECTION_STORAGE_KEY = 'sidebar_admin_collapsed';

const sectionIcons: Partial<Record<string, typeof Inventory2>> = {
	Operations: Inventory2,
	Finance: AccountBalance,
	'Companies & Customers': Business,
	'AI & Documents': SmartToy,
	Settings,
	Admin: AdminPanelSettings,
};

function isNavigationItemActive(pathname: string, href: string) {
	if (href === '/dashboard') {
		return pathname === '/dashboard';
	}

	if (href === '/dashboard/finance' || href === '/dashboard/settings') {
		return pathname === href;
	}

	return pathname.startsWith(href);
}

function filterNavigationItems(items: NavigationItem[], role?: string) {
	return items.filter(
		(item) =>
			(!item.requiredPermission || hasPermission(role, item.requiredPermission)) &&
			(!item.allowedRoles || (role ? item.allowedRoles.includes(role) : false))
	);
}

function NavSection({ title, items, role, isActive, badgeMap, onNavClick, collapsed }: NavSectionProps) {
	const SectionIcon = title ? sectionIcons[title] : undefined;

	return (
		<Box sx={{ mb: 0.5 }}>
			{title && !collapsed && (
				<Box sx={{ px: 2, py: 0.5, mt: 1 }}>
					<Typography
						variant="caption"
						sx={{
							fontSize: '0.6875rem',
							fontWeight: 600,
							color: 'var(--text-secondary)',
							textTransform: 'uppercase',
							letterSpacing: 0.5,
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.5,
						}}
					>
						{SectionIcon && <SectionIcon sx={{ fontSize: 12 }} />}
						{title}
					</Typography>
				</Box>
			)}
			{title && collapsed && (
				<JXDivider className="my-1.5 mx-2.5 !border-[var(--border)]" />
			)}
			<List sx={{ py: 0 }}>
				{filterNavigationItems(items, role).map((item) => (
					<NavItem
						key={item.name}
						item={item}
						isActive={isActive}
						badge={badgeMap?.[item.href]?.count}
						badgeColor={badgeMap?.[item.href]?.color}
						onNavClick={onNavClick}
						collapsed={collapsed}
					/>
				))}
			</List>
		</Box>
	);
}

function CollapsibleAdminSection({
	items,
	role,
	isActive,
	badgeMap,
	onNavClick,
	collapsed,
	onToggleCollapsed,
	isSidebarCollapsed,
}: NavSectionProps & {
	collapsed: boolean;
	onToggleCollapsed: () => void;
	isSidebarCollapsed?: boolean;
}) {
	const visibleItems = filterNavigationItems(items, role);
	const SectionIcon = sectionIcons.Admin;

	if (isSidebarCollapsed) {
		return (
			<Box sx={{ mb: 0.5 }}>
				<JXDivider className="my-1.5 mx-2.5 !border-[var(--border)]" />
				<List sx={{ py: 0 }}>
					{visibleItems.map((item) => (
						<NavItem
							key={item.name}
							item={item}
							isActive={isActive}
							badge={badgeMap?.[item.href]?.count}
							badgeColor={badgeMap?.[item.href]?.color}
							onNavClick={onNavClick}
							collapsed={true}
						/>
					))}
				</List>
			</Box>
		);
	}

	return (
		<Box sx={{ mb: 0.5 }}>
			<Box
				sx={{
					px: 2,
					py: 0.5,
					mt: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					cursor: 'pointer',
				}}
				onClick={onToggleCollapsed}
			>
				<Typography
					variant="caption"
					sx={{
						fontSize: '0.6875rem',
						fontWeight: 600,
						color: 'var(--text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: 0.5,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.5,
					}}
				>
					{SectionIcon && <SectionIcon sx={{ fontSize: 12 }} />}
					Admin
				</Typography>
				<SpringButton
					type="button"
					variant="outline"
					tone="primary"
					onClick={(event) => {
						event.stopPropagation();
						onToggleCollapsed();
					}}
					style={{ fontFamily: 'inherit' }}
					className="!h-6 !w-6 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-0.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--text-primary)] !shadow-none"
					aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'}
				>
					{collapsed ? <ExpandMore sx={{ fontSize: 14 }} /> : <ExpandLess sx={{ fontSize: 14 }} />}
				</SpringButton>
			</Box>
			<Collapse in={!collapsed}>
				<List sx={{ py: 0 }}>
					{visibleItems.map((item) => (
						<NavItem
							key={item.name}
							item={item}
							isActive={isActive}
							badge={badgeMap?.[item.href]?.count}
							badgeColor={badgeMap?.[item.href]?.color}
							onNavClick={onNavClick}
						/>
					))}
				</List>
			</Collapse>
		</Box>
	);
}

function SidebarContent({
	pathname,
	session,
	adminCollapsed,
	onToggleAdminCollapsed,
	onNavClick,
	collapsed = false,
	onToggleCollapse,
	isMobile = false,
}: {
	pathname: string;
	session: Session | null;
	adminCollapsed: boolean;
	onToggleAdminCollapsed: () => void;
	onNavClick?: () => void;
	collapsed?: boolean;
	onToggleCollapse?: () => void;
	isMobile?: boolean;
}) {
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;
	const userName = appUser?.name || 'User';
	const userInitial = userName.charAt(0).toUpperCase();
	const userImage = appUser?.image || undefined;
	const [navBadges, setNavBadges] = useState<NavBadges | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadNavBadges = async () => {
			try {
				const response = await fetch('/api/nav-badges');

				if (!response.ok) {
					return;
				}

				const data = (await response.json()) as NavBadges;

				if (isMounted) {
					setNavBadges(data);
				}
			} catch {
				// Gracefully omit badges if this request fails.
			}
		};

		void loadNavBadges();

		return () => {
			isMounted = false;
		};
	}, []);

	const badgeMap: BadgeMap | undefined = navBadges
		? {
				'/dashboard/shipments': { count: navBadges.agingShipments, color: 'warning' },
				'/dashboard/invoices': { count: navBadges.overdueInvoices, color: 'error' },
		  }
		: undefined;

	const isActive = (href: string) => {
		return isNavigationItemActive(pathname, href);
	};

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			{/* Mobile Drawer Header */}
			{isMobile && (
				<JXBox
					padding="none"
					border={false}
					className="flex items-center justify-between px-4 py-3 !rounded-none"
					style={{
						borderBottom: '1px solid var(--border)',
						background: 'rgba(var(--panel-rgb), 0.95)',
						fontFamily: 'inherit',
					}}
				>
					<SiteLogo variant="dashboard" className="w-[84px]" priority />
					<SpringButton
						type="button"
						variant="outline"
						tone="primary"
						onClick={onNavClick}
						aria-label="Close menu"
						style={{ fontFamily: 'inherit' }}
						className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.3)] hover:!text-[var(--text-primary)] !shadow-none"
					>
						<Close sx={{ fontSize: 20 }} />
					</SpringButton>
				</JXBox>
			)}

			{/* Navigation - scrollable */}
			<Box
				sx={{
					flex: 1,
					px: 0.5,
					py: 1.5,
					overflow: 'auto',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Main */}
				<NavSection items={mainNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Operations */}
				<NavSection title="Operations" items={shipmentNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Finance */}
				<NavSection title="Finance" items={financeNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Companies & Customers */}
				<NavSection title="Companies & Customers" items={companyNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* AI & Documents */}
				<NavSection title="AI & Documents" items={aiDocumentNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Settings */}
				<NavSection title="Settings" items={settingsNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={collapsed} />

				{/* Admin / Internal Section */}
				<CollapsibleAdminSection items={adminNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={adminCollapsed} onToggleCollapsed={onToggleAdminCollapsed} isSidebarCollapsed={collapsed} />

			</Box>
			{collapsed ? (
				<JXBox
					padding="none"
					border={false}
					className="flex flex-col items-center gap-2 p-2 !rounded-none"
					style={{
						borderTop: '1px solid var(--border)',
						background: 'rgba(var(--panel-rgb), 0.92)',
						fontFamily: 'inherit',
					}}
				>
					<Tooltip title={`${userName} (${userRole || 'user'})`} placement="right">
						<Avatar
							src={userImage}
							sx={{
								width: 32,
								height: 32,
								bgcolor: 'var(--accent-gold)',
								fontSize: '0.875rem',
								fontWeight: 600,
								color: 'var(--background)',
								flexShrink: 0,
							}}
						>
							{userInitial}
						</Avatar>
					</Tooltip>
					{onToggleCollapse && (
						<Tooltip title="Expand sidebar" placement="right">
							<span className="inline-flex">
								<SpringButton
									type="button"
									variant="outline"
									tone="primary"
									onClick={onToggleCollapse}
									aria-label="Expand sidebar"
									style={{ fontFamily: 'inherit' }}
									className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--accent-gold-text)] !shadow-none"
								>
									<ChevronRight sx={{ fontSize: 18 }} />
								</SpringButton>
							</span>
						</Tooltip>
					)}
					<Tooltip title="Sign Out" placement="right">
						<span className="inline-flex">
							<SpringButton
								type="button"
								variant="outline"
								tone="danger"
								onClick={() => signOut({ callbackUrl: '/auth/signin' })}
								aria-label="Sign out"
								style={{ fontFamily: 'inherit' }}
								className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(239,68,68,0.1)] hover:!text-[var(--error,#ef4444)] !shadow-none"
							>
								<Logout sx={{ fontSize: 18 }} />
							</SpringButton>
						</span>
					</Tooltip>
				</JXBox>
			) : (
				<JXBox
					padding="none"
					border={false}
					className="px-3 py-3 !rounded-none"
					style={{
						borderTop: '1px solid var(--border)',
						paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : '12px',
						background: 'rgba(var(--panel-rgb), 0.92)',
						fontFamily: 'inherit',
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
							<Avatar
								src={userImage}
								sx={{
									width: 32,
									height: 32,
									bgcolor: 'var(--accent-gold)',
									fontSize: '0.875rem',
									fontWeight: 600,
									color: 'var(--background)',
									flexShrink: 0,
								}}
							>
								{userInitial}
							</Avatar>
							<Box sx={{ minWidth: 0 }}>
								<Typography
									sx={{
										fontSize: '0.875rem',
										fontWeight: 600,
										color: 'var(--text-primary)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{userName}
								</Typography>
								<Typography
									sx={{
										fontSize: '0.75rem',
										color: 'var(--text-secondary)',
										textTransform: 'capitalize',
									}}
								>
									{userRole || 'user'}
								</Typography>
							</Box>
						</Box>
						{onToggleCollapse && (
							<Tooltip title="Collapse sidebar" placement="right">
								<span className="inline-flex">
									<SpringButton
										type="button"
										variant="outline"
										tone="primary"
										onClick={onToggleCollapse}
										aria-label="Collapse sidebar"
										style={{ fontFamily: 'inherit' }}
										className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--text-primary)] !shadow-none"
									>
										<ChevronLeft sx={{ fontSize: 18 }} />
									</SpringButton>
								</span>
							</Tooltip>
						)}
					</Box>
					<JXButton
						fullWidth
						size="sm"
						variant="outlined"
						spring
						onClick={() => signOut({ callbackUrl: '/auth/signin' })}
						style={{ fontFamily: 'inherit' }}
						className="!border-[var(--border)] !bg-transparent !text-[var(--text-primary)] !font-semibold !normal-case hover:!border-[var(--accent-gold)] hover:!bg-[rgba(var(--accent-gold-rgb),0.08)]"
					>
						Sign Out
					</JXButton>
				</JXBox>
			)}
		</Box>
	);
}
