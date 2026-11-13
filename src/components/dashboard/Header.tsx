"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { JXBox, JXDivider, SpringButton } from "@jacxishippingorg/jx-ui-react";
import {
  Settings,
  Logout,
  Person,
  Menu as MenuIcon,
  Add as AddIcon,
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { Ship, Package, FileText, Download, FileSpreadsheet } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/design-system";
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

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
  const { density } = useTheme();
  const isCompact = density === "compact";
  const { data: session } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickActionEl, setQuickActionEl] = useState<null | HTMLElement>(null);
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

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleQuickActionOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (quickActions.length === 0) {
      return;
    }

    setQuickActionEl(event.currentTarget);
  };

  const handleQuickActionClose = () => {
    setQuickActionEl(null);
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
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        position: "sticky",
        bgcolor: "var(--panel)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 8px 16px rgba(var(--text-primary-rgb),0.06)",
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(var(--accent-gold-rgb), 0.3), transparent)",
        },
      }}
    >
      <Toolbar
        sx={{
          minHeight: isCompact ? 48 : 56,
          height: isCompact ? 48 : 56,
          px: { xs: 1.5, sm: 2.5 },
          py: 0,
          color: "var(--text-primary)",
        }}
      >
        {/* Mobile Menu Button */}
        <SpringButton
          type="button"
          variant="outline"
          tone="primary"
          aria-label="Open mobile menu"
          onClick={onMenuClick}
          style={{ fontFamily: "inherit" }}
          className="mr-2 flex lg:hidden !h-9 !w-9 !min-h-0 !min-w-0 items-center justify-center !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-primary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] !shadow-none"
        >
          <MenuIcon sx={{ fontSize: 22 }} />
        </SpringButton>

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
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {pageTitle}
              </Typography>
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
              <SpringButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-global-search"))
                }
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] !shadow-none"
                aria-label="Search"
              >
                <SearchIcon sx={{ fontSize: 22 }} />
              </SpringButton>
            </span>
          </Tooltip>
          {quickActions.length > 0 && (
            <Tooltip title="Quick Actions">
              <span className="inline-flex mr-0.5">
                <SpringButton
                  type="button"
                  variant="outline"
                  tone="primary"
                  onClick={handleQuickActionOpen}
                  aria-label="Quick Actions"
                  style={{ fontFamily: "inherit" }}
                  className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--accent-gold-text)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!shadow-[0_0_0_1px_rgba(var(--accent-gold-rgb),0.2)] !shadow-none"
                >
                  <AddIcon sx={{ fontSize: 22 }} />
                </SpringButton>
              </span>
            </Tooltip>
          )}

          {/* Quick Universal Export Shipments Button */}
          <Tooltip title="Export Shipments (Excel/CSV)">
            <span className="inline-flex mr-0.5">
              <SpringButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={() => openUniversalShipmentExport()}
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!text-[var(--accent-gold-text)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] !shadow-none"
                aria-label="Export Shipments"
              >
                <Download style={{ width: 20, height: 20 }} />
              </SpringButton>
            </span>
          </Tooltip>

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <span className="hidden md:inline-flex">
              <SpringButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={toggleKeyboardShortcuts}
                aria-label="Keyboard Shortcuts"
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
              >
                <KeyboardIcon sx={{ fontSize: 20 }} />
              </SpringButton>
            </span>
          </Tooltip>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationCenter />

          {/* Settings */}
          <Tooltip title="Settings">
            <Link href="/dashboard/settings" style={{ textDecoration: "none" }} className="inline-flex">
              <SpringButton
                type="button"
                variant="outline"
                tone="primary"
                aria-label="Settings"
                style={{ fontFamily: "inherit" }}
                className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.4)] hover:!text-[var(--text-primary)] !shadow-none"
              >
                <Settings sx={{ fontSize: 20 }} />
              </SpringButton>
            </Link>
          </Tooltip>

          {/* Profile Menu */}
          <Tooltip title="Account">
            <span className="inline-flex ml-1">
              <SpringButton
                type="button"
                variant="outline"
                tone="primary"
                onClick={handleProfileMenuOpen}
                aria-label="Account profile"
                style={{ fontFamily: "inherit" }}
                className="!h-auto !w-auto !min-h-0 !min-w-0 !rounded-full !border-0 !bg-transparent !p-1 !shadow-none"
              >
                <Avatar
                  src={session?.user?.image || undefined}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: "var(--accent-gold)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--background)",
                  }}
                >
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </Avatar>
              </SpringButton>
            </span>
          </Tooltip>
        </JXBox>

        {/* Profile Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              bgcolor: "var(--panel)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(var(--text-primary-rgb),0.12)",
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          {/* User Info */}
          <JXBox padding="none" border={false} className="px-4 py-3 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                mb: 0.25,
              }}
            >
              {session?.user?.name || "User"}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
              }}
            >
              {session?.user?.email}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: "var(--accent-gold-text)",
                mt: 0.5,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {session?.user?.role || "user"}
            </Typography>
          </JXBox>

          <JXDivider className="!border-[var(--border)]" />

          {/* Menu Items */}
          <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
            <MenuItem
              onClick={handleMenuClose}
              sx={{
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                py: 1.25,
                "&:hover": {
                  bgcolor: "rgba(var(--border-rgb), 0.4)",
                },
              }}
            >
              <Person sx={{ mr: 1.5, fontSize: 20 }} />
              Profile
            </MenuItem>
          </Link>

          <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
            <MenuItem
              onClick={handleMenuClose}
              sx={{
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                py: 1.25,
                "&:hover": {
                  bgcolor: "rgba(var(--border-rgb), 0.4)",
                },
              }}
            >
              <Settings sx={{ mr: 1.5, fontSize: 20 }} />
              Settings
            </MenuItem>
          </Link>

          <JXDivider className="!border-[var(--border)]" />

          <MenuItem
            onClick={handleSignOut}
            sx={{
              color: "var(--error)",
              fontSize: "0.875rem",
              py: 1.25,
              "&:hover": {
                bgcolor: "rgba(var(--error-rgb), 0.1)",
                color: "var(--error)",
              },
            }}
          >
            <Logout sx={{ mr: 1.5, fontSize: 20 }} />
            Sign Out
          </MenuItem>
        </Menu>

        {/* Quick Actions Menu */}
        {quickActions.length > 0 && (
          <Menu
            anchorEl={quickActionEl}
            open={Boolean(quickActionEl)}
            onClose={handleQuickActionClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                bgcolor: "var(--panel)",
                backdropFilter: "blur(10px)",
                border: "1px solid var(--border)",
                borderRadius: 2,
                boxShadow: "0 8px 32px rgba(var(--text-primary-rgb),0.12)",
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <JXBox padding="none" border={false} className="px-4 py-3 pb-2 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                fontSize="0.7rem"
              >
                Create New
              </Typography>
            </JXBox>
            {quickActions.map((action) => (
              <MenuItem
                key={action.label}
                onClick={() => handleQuickActionClick(action.href)}
                sx={{
                  py: 1.5,
                  color: "var(--text-primary)",
                  "&:hover": {
                    bgcolor: "rgba(var(--border-rgb), 0.4)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: action.color, minWidth: 36 }}>
                  {action.icon}
                </ListItemIcon>
                <ListItemText
                  primary={action.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                />
              </MenuItem>
            ))}
            <JXDivider className="!my-1 !border-[var(--border)]" />
            <MenuItem
              onClick={() => {
                handleQuickActionClose();
                openUniversalShipmentExport();
              }}
              sx={{
                py: 1.5,
                color: "var(--text-primary)",
                "&:hover": {
                  bgcolor: "rgba(var(--border-rgb), 0.4)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "var(--accent-gold)", minWidth: 36 }}>
                <FileSpreadsheet style={{ width: 20, height: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary="Export Shipments"
                secondary="Excel / CSV download"
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
                secondaryTypographyProps={{
                  fontSize: "0.72rem",
                  color: "var(--text-secondary)",
                }}
              />
            </MenuItem>
          </Menu>
        )}
      </Toolbar>
    </AppBar>
  );
}
