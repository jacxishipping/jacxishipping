"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import type { SvgIconComponent } from '@mui/icons-material';
import { Dashboard, Inventory2, Description, Search, Analytics, Group, AllInbox, Receipt, AccountBalance, Payment, Business, LocalShipping, SmartToy, PhoneInTalk, Route, ExpandLess, ExpandMore, AdminPanelSettings, CompareArrows, Settings, Timer } from '@mui/icons-material';
import { signOut, useSession } from 'next-auth/react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Collapse, IconButton, Avatar, Button } from '@mui/material';
import { hasPermission, type Permission } from '@/lib/rbac';

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
];

const financeNavigation: NavigationItem[] = [
	{
		name: 'Finance',
		href: '/dashboard/finance',
		icon: AccountBalance,
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
		name: 'Settings',
		href: '/dashboard/settings',
		icon: Settings,
		requiredPermission: 'users:manage',
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

	const drawerWidth = 260;
	const adminCollapsed = hasActiveAdminItem ? false : adminCollapsedPreference;

	useEffect(() => {
		setAdminCollapsedPreference(window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY) === 'true');
	}, []);

	const toggleAdminCollapsed = () => {
		setAdminCollapsedPreference((prev) => {
			const next = !prev;
			window.localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, String(next));
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
						width: drawerWidth,
						boxSizing: 'border-box',
						background: 'linear-gradient(180deg, var(--panel) 0%, rgba(var(--panel-rgb), 0.97) 100%)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.15)',
						boxShadow: '0 10px 30px rgba(var(--text-primary-rgb),0.12)',
						mt: '48px',
					},
				}}
			>
			<SidebarContent
				pathname={pathname}
				session={session}
				adminCollapsed={adminCollapsed}
				onToggleAdminCollapsed={toggleAdminCollapsed}
				onNavClick={onMobileClose}
			/>
			</Drawer>

			{/* Desktop Drawer */}
			<Drawer
				variant="permanent"
				sx={{
					display: { xs: 'none', lg: 'block' },
					width: drawerWidth,
					flexShrink: 0,
					'& .MuiDrawer-paper': {
						width: drawerWidth,
						boxSizing: 'border-box',
						background: 'linear-gradient(180deg, var(--panel) 0%, rgba(var(--panel-rgb), 0.97) 100%)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.15)',
						boxShadow: 'inset -1px 0 0 var(--border)',
						position: 'relative',
						height: '100%',
						overflow: 'hidden',
					},
				}}
			>
				<SidebarContent
					pathname={pathname}
					session={session}
					adminCollapsed={adminCollapsed}
					onToggleAdminCollapsed={toggleAdminCollapsed}
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
};

function NavItem({ item, isActive, badge, badgeColor, onNavClick }: NavItemProps) {
	const Icon = item.icon;
	const active = isActive(item.href);
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

	return (
		<ListItemButton
			component={Link}
			href={item.href}
			onClick={onNavClick}
			selected={active}
			aria-current={active ? 'page' : undefined}
			sx={{
				position: 'relative',
				borderRadius: 1.5,
				mx: 1,
				my: 0.25,
				py: 0.75,
				minHeight: 0,
				transition: 'all 150ms ease',
				color: active ? 'var(--accent-gold)' : 'var(--text-primary)',
				bgcolor: active ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'transparent',
				boxShadow: active ? 'inset 0 0 0 1px rgba(var(--accent-gold-rgb), 0.2)' : 'none',
				'&:hover': {
					bgcolor: 'rgba(var(--accent-gold-rgb), 0.06)',
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
					minWidth: 32,
					color: active ? 'var(--accent-gold)' : 'var(--text-primary)',
				}}
			>
				<Icon sx={{ fontSize: 18, filter: active ? 'drop-shadow(0 0 4px rgba(var(--accent-gold-rgb), 0.5))' : 'none' }} />
			</ListItemIcon>
			<ListItemText
				primary={item.name}
				primaryTypographyProps={{
					fontSize: '0.9rem',
					fontWeight: 500,
					color: 'inherit',
				}}
			/>
			{typeof badge === 'number' && badge > 0 && badgeStyle && (
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
}

type NavSectionProps = {
	title?: string;
	items: NavigationItem[];
	role?: string;
	isActive: (href: string) => boolean;
	badgeMap?: BadgeMap;
	onNavClick?: () => void;
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

function NavSection({ title, items, role, isActive, badgeMap, onNavClick }: NavSectionProps) {
	const SectionIcon = title ? sectionIcons[title] : undefined;

	return (
		<Box sx={{ mb: 0.5 }}>
			{title && (
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
			<List sx={{ py: 0 }}>
				{filterNavigationItems(items, role).map((item) => (
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
}: NavSectionProps & {
	collapsed: boolean;
	onToggleCollapsed: () => void;
}) {
	const visibleItems = filterNavigationItems(items, role);
	const SectionIcon = sectionIcons.Admin;

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
				<IconButton
					size="small"
					onClick={(event) => {
						event.stopPropagation();
						onToggleCollapsed();
					}}
					sx={{
						p: 0.25,
						color: 'var(--text-secondary)',
					}}
					aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'}
				>
					{collapsed ? <ExpandMore sx={{ fontSize: 14 }} /> : <ExpandLess sx={{ fontSize: 14 }} />}
				</IconButton>
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
}: {
	pathname: string;
	session: Session | null;
	adminCollapsed: boolean;
	onToggleAdminCollapsed: () => void;
	onNavClick?: () => void;
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
				<NavSection items={mainNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

				{/* Operations */}
				<NavSection title="Operations" items={shipmentNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} />

				{/* Finance */}
				<NavSection title="Finance" items={financeNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} />

				{/* Companies & Customers */}
				<NavSection title="Companies & Customers" items={companyNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

				{/* AI & Documents */}
				<NavSection title="AI & Documents" items={aiDocumentNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

				{/* Settings */}
				<NavSection title="Settings" items={settingsNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

				{/* Admin / Internal Section */}
				<CollapsibleAdminSection items={adminNavigation} role={userRole} isActive={isActive} badgeMap={badgeMap} onNavClick={onNavClick} collapsed={adminCollapsed} onToggleCollapsed={onToggleAdminCollapsed} />

			</Box>
			<Box
				sx={{
					borderTop: '1px solid var(--border)',
					px: 1.5,
					py: 1.5,
					background: 'rgba(var(--panel-rgb), 0.92)',
				}}
			>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25, minWidth: 0 }}>
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
				<Button
					fullWidth
					size="small"
					variant="outlined"
					onClick={() => signOut({ callbackUrl: '/auth/signin' })}
					sx={{
						borderColor: 'var(--border)',
						color: 'var(--text-primary)',
						textTransform: 'none',
						fontWeight: 600,
						'&:hover': {
							borderColor: 'var(--accent-gold)',
							backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
						},
					}}
				>
					Sign Out
				</Button>
			</Box>
		</Box>
	);
}
