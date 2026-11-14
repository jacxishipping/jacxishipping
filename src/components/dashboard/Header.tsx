"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { JXBox, JXDivider, JXAvatar } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from '@/components/design-system/JacxiButton';
import {
  Settings,
  LogOut,
  User,
  Menu as MenuIcon,
  Plus as AddIcon,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
} from "lucide-react";
import { Ship, Package, FileText, Download, FileSpreadsheet } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/design-system";
import Tooltip from "@/components/design-system/Tooltip";
import SiteLogo from "@/components/brand/SiteLogo";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { hasPermission, type Permission } from "@/lib/rbac";
import { useTheme } from "@/hooks/useTheme";
import { openUniversalShipmentExport } from "@/components/shipments/UniversalShipmentExportModal";

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
  requiredPermission?: Permission;
  allowedRoles?: string[];
};

const quickActionDefinitions = [
  {
    icon: <Ship style={{ width: 20, height: 20 }} />,
    label: "New Shipment",
    href: "/dashboard/shipments/new",
    color: "#3B82F6",
    requiredPermission: "shipments:manage",
  },
  {
    icon: <Package style={{ width: 20, height: 20 }} />,
    label: "New Container",
    href: "/dashboard/containers/new",
    color: "#10B981",
    allowedRoles: ["admin"],
  },
  {
    icon: <FileText style={{ width: 20, height: 20 }} />,
    label: "New Invoice",
    href: "/dashboard/invoices/new",
    color: "#F59E0B",
    requiredPermission: "invoices:manage",
  },
] satisfies QuickAction[];

/**
 * Header popover menu (replaces MUI Menu/MenuItem).
 *
 * JXMenu is a static menu container with no anchor/popover behaviour
 * (no open/anchorEl/onClose), so the anchored popover is rebuilt here:
 * an absolutely-positioned panel under the trigger, closed by outside
 * click or Escape, with focus returned to the trigger. Menu items are
 * plain buttons/links with the same gold-hover styling as before.
 */
function HeaderMenu({
  open,
  onClose,
  triggerLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerLabel: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label={triggerLabel}
      className="absolute right-0 top-full z-[1050] mt-1.5 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_8px_32px_rgba(var(--text-primary-rgb),0.12)] backdrop-blur-[10px]"
    >
      {children}
    </div>
  );
}

function HeaderMenuItem({
  onClick,
  children,
  danger = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        "flex w-full items-center px-4 py-2.5 text-left text-[0.875rem] transition-colors",
        danger
          ? "text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)]"
          : "text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.4)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
  const { density } = useTheme();
  const isCompact = density === "compact";
  const { data: session } = useSession();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [quickActionMenuOpen, setQuickActionMenuOpen] = useState(false);
  const userRole = session?.user?.role;
  const quickActions = useMemo(
    () =>
      quickActionDefinitions.filter(
        (action) =>
          (!action.requiredPermission ||
            hasPermission(userRole, action.requiredPermission)) &&
          (!action.allowedRoles ||
            (userRole ? action.allowedRoles.includes(userRole) : false)),
      ),
    [userRole],
  );

  const handleProfileMenuOpen = () => {
    setProfileMenuOpen((prev) => !prev);
  };

  const handleMenuClose = () => {
    setProfileMenuOpen(false);
  };

  const handleQuickActionOpen = () => {
    if (quickActions.length === 0) {
      return;
    }
    setQuickActionMenuOpen((prev) => !prev);
  };

  const handleQuickActionClose = () => {
    setQuickActionMenuOpen(false);
  };

  const handleQuickActionClick = (href: string) => {
    handleQuickActionClose();
    router.push(href);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut({ redirect: false });
    router.replace("/");
    router.refresh();
  };

  const toggleKeyboardShortcuts = () => {
    window.dispatchEvent(new CustomEvent("toggle-shortcut-help"));
  };

  return (
    <header
      className="sticky top-0 z-[1020] border-b border-[var(--border)] bg-[var(--panel)] shadow-[0_8px_16px_rgba(var(--text-primary-rgb),0.06)]"
    >
      <div
        className="flex items-center px-3 py-0 text-[var(--text-primary)] sm:px-5"
        style={{ minHeight: isCompact ? 48 : 56, height: isCompact ? 48 : 56 }}
      >
        {/* Mobile Menu Button */}
        <JacxiButton
          type="button"
          variant="outline"
          tone="primary"
          aria-label="Open mobile menu"
          onClick={onMenuClick}
          style={{ fontFamily: "inherit" }}
          className="mr-2 flex lg:hidden !h-9 !w-9 !min-h-0 !min-w-0 items-center justify-center !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-primary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] !shadow-none"
        >
          <MenuIcon className="h-[22px] w-[22px]" />
        </JacxiButton>

        {/* Logo/Title */}
        <JXBox padding="none" border={false} className="flex flex-grow items-center !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              padding: "2px 6px",
            }}
          >
            <SiteLogo
              variant="dashboard"
              className="w-[72px] sm:w-[88px]"
              priority
            />
          </Link>

          {/* Page Title (if provided) */}
          {pageTitle && (
            <>
              <div
                aria-hidden="true"
                className="hidden md:block mx-3 h-5 w-px bg-[var(--border)] shrink-0"
              />
              <span className="hidden text-[0.875rem] font-medium text-[var(--text-secondary)] md:block">
                {pageTitle}
              </span>
            </>
          )}
        </JXBox>

        {/* Right Actions */}
        <JXBox padding="none" border={false} className="flex items-center gap-0.5 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
          {/* Global Search (⌘K on desktop, icon button on mobile) */}
          <JXBox padding="none" border={false} className="hidden sm:flex mr-1 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
            <GlobalSearch />
          </JXBox>
          <Tooltip title="Search">
            <span className="inline-flex sm:hidden">
              <JacxiButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-global-search"))
                }
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!bg-[rgba(var(--border-rgb),0.4)] !shadow-none"
                aria-label="Search"
              >
                <SearchIcon className="h-[22px] w-[22px]" />
              </JacxiButton>
            </span>
          </Tooltip>
          {quickActions.length > 0 && (
            <span className="relative mr-0.5 inline-flex">
              <Tooltip title="Quick Actions">
                <span className="inline-flex">
                  <JacxiButton
                    type="button"
                    variant="outline"
                    tone="primary"
                    onClick={handleQuickActionOpen}
                    aria-label="Quick Actions"
                    aria-expanded={quickActionMenuOpen}
                    aria-haspopup="menu"
                    style={{ fontFamily: "inherit" }}
                    className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
                  >
                    <AddIcon className="h-[22px] w-[22px]" />
                  </JacxiButton>
                </span>
              </Tooltip>
              <HeaderMenu
                open={quickActionMenuOpen}
                onClose={handleQuickActionClose}
                triggerLabel="Quick Actions"
              >
                <JXBox padding="none" border={false} className="px-4 py-3 pb-2 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
                  <span className="text-[0.7rem] font-semibold uppercase text-[var(--text-secondary)]">
                    Create New
                  </span>
                </JXBox>
                {quickActions.map((action) => (
                  <HeaderMenuItem
                    key={action.label}
                    onClick={() => handleQuickActionClick(action.href)}
                  >
                    <span className="mr-3 flex min-w-9 items-center" style={{ color: action.color }}>
                      {action.icon}
                    </span>
                    <span className="text-[0.875rem] font-medium">{action.label}</span>
                  </HeaderMenuItem>
                ))}
                <JXDivider className="!my-1 !border-[var(--border)]" />
                <HeaderMenuItem
                  onClick={() => {
                    handleQuickActionClose();
                    openUniversalShipmentExport();
                  }}
                >
                  <span className="mr-3 flex min-w-9 items-center text-[var(--accent-gold)]">
                    <FileSpreadsheet style={{ width: 20, height: 20 }} />
                  </span>
                  <span>
                    <span className="block text-[0.875rem] font-medium">Export Shipments</span>
                    <span className="block text-[0.72rem] text-[var(--text-secondary)]">Excel / CSV download</span>
                  </span>
                </HeaderMenuItem>
              </HeaderMenu>
            </span>
          )}

          {/* Quick Universal Export Shipments Button */}
          <Tooltip title="Export Shipments (Excel/CSV)">
            <span className="inline-flex mr-0.5">
              <JacxiButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={() => openUniversalShipmentExport()}
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!bg-[rgba(var(--border-rgb),0.4)] !shadow-none"
                aria-label="Export Shipments"
              >
                <Download style={{ width: 20, height: 20 }} />
              </JacxiButton>
            </span>
          </Tooltip>

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <span className="hidden md:inline-flex">
              <JacxiButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={toggleKeyboardShortcuts}
                aria-label="Keyboard Shortcuts"
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
              >
                <KeyboardIcon className="h-5 w-5" />
              </JacxiButton>
            </span>
          </Tooltip>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationCenter />

          {/* Settings */}
          <Tooltip title="Settings">
            <Link href="/dashboard/settings" style={{ textDecoration: "none" }} className="inline-flex">
              <JacxiButton
                type="button"
                variant="outline"
                tone="primary"
                aria-label="Settings"
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
              >
                <Settings className="h-5 w-5" />
              </JacxiButton>
            </Link>
          </Tooltip>

          {/* Profile Menu */}
          <span className="relative ml-1 inline-flex">
            <Tooltip title="Account">
              <span className="inline-flex">
                <JacxiButton
                  type="button"
                  variant="outline"
                  tone="primary"
                  onClick={handleProfileMenuOpen}
                  aria-label="Account profile"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  style={{ fontFamily: "inherit" }}
                  className="!h-auto !w-auto !min-h-0 !min-w-0 !rounded-full !border-0 !bg-transparent !p-1 !shadow-none"
                >
                  <JXAvatar
                    name={session?.user?.name || "User"}
                    src={session?.user?.image || undefined}
                    shape="circle"
                    size="sm"
                    gradientClass="from-[#D4AF37] to-[#96791F]"
                    className="!h-[30px] !w-[30px] !text-[0.875rem]"
                  />
                </JacxiButton>
              </span>
            </Tooltip>
            <HeaderMenu
              open={profileMenuOpen}
              onClose={handleMenuClose}
              triggerLabel="Account"
            >
              {/* User Info */}
              <JXBox padding="none" border={false} className="px-4 py-3 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
                <p className="mb-1 text-[0.875rem] font-semibold text-[var(--text-primary)]">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[0.75rem] text-[var(--text-secondary)]">
                  {session?.user?.email}
                </p>
                <p className="mt-2 text-[0.6875rem] font-semibold uppercase text-[var(--text-secondary)]">
                  {session?.user?.role || "user"}
                </p>
              </JXBox>

              <JXDivider className="!border-[var(--border)]" />

              {/* Menu Items */}
              <Link href="/dashboard/profile" style={{ textDecoration: "none" }} onClick={handleMenuClose}>
                <span className="flex w-full items-center px-4 py-2.5 text-left text-[0.875rem] text-[var(--text-primary)] transition-colors hover:bg-[rgba(var(--border-rgb),0.4)]">
                  <User className="mr-3 h-5 w-5" />
                  Profile
                </span>
              </Link>

              <Link href="/dashboard/settings" style={{ textDecoration: "none" }} onClick={handleMenuClose}>
                <span className="flex w-full items-center px-4 py-2.5 text-left text-[0.875rem] text-[var(--text-primary)] transition-colors hover:bg-[rgba(var(--border-rgb),0.4)]">
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </span>
              </Link>

              <JXDivider className="!border-[var(--border)]" />

              <HeaderMenuItem onClick={handleSignOut} danger>
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </HeaderMenuItem>
            </HeaderMenu>
          </span>
        </JXBox>
      </div>
    </header>
  );
}
