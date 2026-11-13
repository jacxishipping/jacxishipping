"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import type { LucideIcon } from 'lucide-react';
import {
	LayoutDashboard,
	Package,
	FileText,
	Search,
	ChartBar,
	Users,
	Inbox,
	Receipt,
	ReceiptText,
	Landmark,
	CreditCard,
	Building2,
	Truck,
	Bot,
	Network,
	PhoneCall,
	Route,
	ChevronUp,
	ChevronDown,
	ShieldCheck,
	ArrowLeftRight,
	Settings,
	Timer,
	ChevronLeft,
	ChevronRight,
	LogOut,
	X,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { JXBox, JXButton, JXDivider, JXAvatar } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from '@/components/design-system/JacxiButton';
import Tooltip from '@/components/design-system/Tooltip';
import { hasPermission, type Permission } from '@/lib/rbac';
import { useTheme } from '@/hooks/useTheme';
import SiteLogo from '@/components/brand/SiteLogo';

type NavigationItem = {
	name: string;
	href: string;
	icon: LucideIcon;
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
		icon: LayoutDashboard,
	},
];

const shipmentNavigation: NavigationItem[] = [
	{
		name: 'Shipments',
		href: '/dashboard/shipments',
		icon: Package,
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
		icon: Inbox,
		requiredPermission: 'containers:view',
	},
	{
		name: 'Dispatches',
		href: '/dashboard/dispatches',
		icon: Truck,
		requiredPermission: 'dispatches:manage',
	},
	{
		name: 'Operations Board',
		href: '/dashboard/operations',
		icon: ArrowLeftRight,
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
		icon: ChartBar,
		requiredPermission: 'shipments:read_all',
	},
];

const financeNavigation: NavigationItem[] = [
	{
		name: 'Finance',
		href: '/dashboard/finance',
		icon: Landmark,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Office Expenses',
		href: '/dashboard/finance/office-expenses',
		icon: ReceiptText,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Banking',
		href: '/dashboard/finance/banking',
		icon: CreditCard,
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
		icon: Building2,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Ledger Transfers',
		href: '/dashboard/finance/transfers',
		icon: ArrowLeftRight,
		requiredPermission: 'finance:manage',
	},
	{
		name: 'Price Comparison',
		href: '/dashboard/finance/price-comparison',
		icon: ArrowLeftRight,
		requiredPermission: 'finance:view',
	},
];

const companyNavigation: NavigationItem[] = [
	{
		name: 'Customers',
		href: '/dashboard/customers',
		icon: Users,
		requiredPermission: 'customers:view',
	},
	{
		name: 'Partner Portals',
		href: '/dashboard/partner-portals',
		icon: Users,
		requiredPermission: 'customers:manage',
	},
];

const aiDocumentNavigation: NavigationItem[] = [
	{
		name: 'Documents',
		href: '/dashboard/documents',
		icon: FileText,
		requiredPermission: 'documents:view',
	},
	{
		name: 'MCP Server',
		href: '/dashboard/mcp',
		icon: Network,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'AI Logs',
		href: '/dashboard/ai-logs',
		icon: Bot,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'Call Agent',
		href: '/dashboard/settings/call-agent',
		icon: PhoneCall,
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
		icon: ChartBar,
		requiredPermission: 'analytics:view',
	},
	{
		name: 'Users',
		href: '/dashboard/users',
		icon: Users,
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
			<AnimatePresence>
				{mobileOpen && (
					<div className="fixed inset-0 z-[1030] lg:hidden" role="presentation">
						<motion.div
							aria-hidden="true"
							className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={onMobileClose}
						/>
						<motion.aside
							role="dialog"
							aria-modal="true"
							aria-label="Navigation menu"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
							className="absolute bottom-0 left-0 top-0 flex w-[min(300px,85vw)] flex-col overflow-hidden border-r border-[var(--border)] text-[var(--text-primary)] shadow-[0_10px_30px_rgba(var(--text-primary-rgb),0.2)]"
							style={{
								background: 'var(--panel)',
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
						</motion.aside>
					</div>
				)}
			</AnimatePresence>

			{/* Desktop Sidebar */}
			<aside
				aria-label="Sidebar navigation"
				className="hidden shrink-0 overflow-hidden border-r border-[var(--border)] text-[var(--text-primary)] transition-[width] duration-200 lg:block"
				style={{
					width: desktopDrawerWidth,
					background: 'var(--panel)',
					boxShadow: 'inset -1px 0 0 var(--border)',
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
			</aside>
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

	const itemLink = (
		<Link
			href={item.href}
			onClick={onNavClick}
			onMouseEnter={handlePrefetch}
			onFocus={handlePrefetch}
			aria-current={active ? 'page' : undefined}
			className={[
				'group relative flex w-full items-center rounded-lg transition-all duration-150',
				collapsed
					? isCompact
						? 'mx-1 my-0.5 justify-center px-1.5 py-1'
						: 'mx-1 my-0.5 justify-center px-2 py-2'
					: isCompact
						? 'mx-1.5 my-0.5 px-2.5 py-1.5'
						: 'mx-2 my-1 px-3 py-2',
				active
					? 'bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] shadow-[inset_0_0_0_1px_rgba(var(--accent-gold-rgb),0.2)]'
					: 'text-[var(--text-secondary)] hover:bg-[rgba(var(--accent-gold-rgb),0.08)] hover:text-[var(--text-primary)]',
			].join(' ')}
		>
			{active && (
				<span
					aria-hidden="true"
					className="absolute bottom-1 left-0 top-1 w-1 rounded-r-[2px] bg-[var(--accent-gold)]"
				/>
			)}
			<span
				className={[
					'flex shrink-0 items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
					active ? '!text-[var(--accent-gold)]' : '',
					collapsed ? '' : 'w-8',
				].join(' ')}
			>
				<Icon
					className="h-[18px] w-[18px]"
				/>
				{collapsed && typeof badge === 'number' && badge > 0 && (
					<span
						aria-hidden="true"
						className="absolute right-[14px] top-[6px] h-[7px] w-[7px] rounded-full"
						style={{ backgroundColor: badgeColor === 'error' ? 'var(--error)' : 'var(--warning)' }}
					/>
				)}
			</span>
			{!collapsed && (
				<span
					className="truncate text-[0.9rem] font-medium"
					style={isCompact ? { fontSize: '0.8125rem' } : undefined}
				>
					{item.name}
				</span>
			)}
			{!collapsed && typeof badge === 'number' && badge > 0 && badgeStyle && (
				<span
					className="ml-auto inline-flex min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-center text-[0.625rem] font-extrabold leading-[1.6]"
					style={{
						background: badgeStyle.background,
						color: badgeStyle.color,
						border: badgeStyle.border,
					}}
				>
					{badgeLabel}
				</span>
			)}
		</Link>
	);

	if (collapsed) {
		return (
			<Tooltip title={item.name} placement="right" arrow wrapperClassName="flex w-full">
				{itemLink}
			</Tooltip>
		);
	}

	return itemLink;
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

const sectionIcons: Partial<Record<string, LucideIcon>> = {
	Operations: Package,
	Finance: Landmark,
	'Companies & Customers': Building2,
	'AI & Documents': Bot,
	Settings,
	Admin: ShieldCheck,
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
		<div className="mb-0.5">
			{title && !collapsed && (
				<div className="mt-1 px-4 py-1">
					<span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
						{SectionIcon && <SectionIcon className="h-3 w-3" />}
						{title}
					</span>
				</div>
			)}
			{title && collapsed && (
				<JXDivider className="my-1.5 mx-2.5 !border-[var(--border)]" />
			)}
			<ul className="py-0">
				{filterNavigationItems(items, role).map((item) => (
					<li key={item.name}>
						<NavItem
							item={item}
							isActive={isActive}
							badge={badgeMap?.[item.href]?.count}
							badgeColor={badgeMap?.[item.href]?.color}
							onNavClick={onNavClick}
							collapsed={collapsed}
						/>
					</li>
				))}
			</ul>
		</div>
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
			<div className="mb-0.5">
				<JXDivider className="my-1.5 mx-2.5 !border-[var(--border)]" />
				<ul className="py-0">
					{visibleItems.map((item) => (
						<li key={item.name}>
							<NavItem
								item={item}
								isActive={isActive}
								badge={badgeMap?.[item.href]?.count}
								badgeColor={badgeMap?.[item.href]?.color}
								onNavClick={onNavClick}
								collapsed={true}
							/>
						</li>
					))}
				</ul>
			</div>
		);
	}

	return (
		<div className="mb-0.5">
			<div
				className="mt-1 flex cursor-pointer items-center justify-between px-4 py-1"
				onClick={onToggleCollapsed}
			>
				<span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
					{SectionIcon && <SectionIcon className="h-3 w-3" />}
					Admin
				</span>
				<JacxiButton
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
					{collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
				</JacxiButton>
			</div>
			<AnimatePresence initial={false}>
				{!collapsed && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<ul className="py-0">
							{visibleItems.map((item) => (
								<li key={item.name}>
									<NavItem
										item={item}
										isActive={isActive}
										badge={badgeMap?.[item.href]?.count}
										badgeColor={badgeMap?.[item.href]?.color}
										onNavClick={onNavClick}
									/>
								</li>
							))}
						</ul>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
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
		<div className="flex h-full flex-col overflow-hidden">
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
					<JacxiButton
						type="button"
						variant="outline"
						tone="primary"
						onClick={onNavClick}
						aria-label="Close menu"
						style={{ fontFamily: 'inherit' }}
						className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.3)] hover:!text-[var(--text-primary)] !shadow-none"
					>
						<X className="h-5 w-5" />
					</JacxiButton>
				</JXBox>
			)}

			{/* Navigation - scrollable. Vertical scroll only: the nav links
			    are `w-full` plus horizontal margins, so they overflow the
			    container sideways; with `overflow-auto` that produced a
			    horizontal scrollbar at the bottom of this area, just above
			    the profile card — and the global scrollbar thumb is gold
			    (globals.css `::-webkit-scrollbar-thumb` gradient resolves
			    to hsl(45 63% 52%)), so it read as a thick gold stripe.
			    `overflow-x-hidden` removes that scrollbar entirely. */}
			<div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 py-3">
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

			</div>
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
						<JXAvatar
							name={userName}
							src={userImage}
							shape="circle"
							size="sm"
							gradientClass="from-[#D4AF37] to-[#96791F]"
							className="!h-8 !w-8 !text-[0.875rem]"
						/>
					</Tooltip>
					{onToggleCollapse && (
						<Tooltip title="Expand sidebar" placement="right">
							<span className="inline-flex">
								<JacxiButton
									type="button"
									variant="outline"
									tone="primary"
									onClick={onToggleCollapse}
									aria-label="Expand sidebar"
									style={{ fontFamily: 'inherit' }}
									className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--accent-gold-text)] !shadow-none"
								>
									<ChevronRight className="h-[18px] w-[18px]" />
								</JacxiButton>
							</span>
						</Tooltip>
					)}
					<Tooltip title="Sign Out" placement="right">
						<span className="inline-flex">
							<JacxiButton
								type="button"
								variant="outline"
								tone="danger"
								onClick={() => signOut({ callbackUrl: '/auth/signin' })}
								aria-label="Sign out"
								style={{ fontFamily: 'inherit' }}
								className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(239,68,68,0.1)] hover:!text-[var(--error,#ef4444)] !shadow-none"
							>
								<LogOut className="h-[18px] w-[18px]" />
							</JacxiButton>
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
					<div className="mb-5 flex items-center justify-between">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<JXAvatar
								name={userName}
								src={userImage}
								shape="circle"
								size="sm"
								gradientClass="from-[#D4AF37] to-[#96791F]"
								className="!h-8 !w-8 !text-[0.875rem]"
							/>
							<div className="min-w-0">
								<p className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.875rem] font-semibold text-[var(--text-primary)]">
									{userName}
								</p>
								<p className="text-[0.75rem] capitalize text-[var(--text-secondary)]">
									{userRole || 'user'}
								</p>
							</div>
						</div>
						{onToggleCollapse && (
							<Tooltip title="Collapse sidebar" placement="right">
								<span className="inline-flex">
									<JacxiButton
										type="button"
										variant="outline"
										tone="primary"
										onClick={onToggleCollapse}
										aria-label="Collapse sidebar"
										style={{ fontFamily: 'inherit' }}
										className="!h-7 !w-7 !min-h-0 !min-w-0 !rounded-md !border-0 !bg-transparent !p-1 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--text-primary)] !shadow-none"
									>
										<ChevronLeft className="h-[18px] w-[18px]" />
									</JacxiButton>
								</span>
							</Tooltip>
						)}
					</div>
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
		</div>
	);
}
