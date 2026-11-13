"use client";

import {
  Drawer as MuiDrawer,
  Box,
  SxProps,
  Theme,
} from "@mui/material";
import { JXBox, JXTypography, SpringButton } from "@jacxishippingorg/jx-ui-react";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";
import Tooltip from "./Tooltip";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  anchor?: "right" | "left";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
  contentSx?: SxProps<Theme>;
}

const sizeConfig = {
  sm: "420px",
  md: "580px",
  lg: "760px",
  xl: "920px",
  full: "95vw",
};

export default function Drawer({
  open,
  onClose,
  title,
  description,
  badge,
  children,
  actions,
  anchor = "right",
  size = "md",
  showCloseButton = true,
  className,
  contentSx,
}: DrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const drawerWidth = sizeConfig[size] || sizeConfig.md;

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      className={className}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: drawerWidth },
          maxWidth: "100vw",
          maxHeight: { xs: "88vh", sm: "100vh" },
          height: { xs: "auto", sm: "100%" },
          borderTopLeftRadius: { xs: 20, sm: 0 },
          borderTopRightRadius: { xs: 20, sm: 0 },
          bgcolor: "var(--panel-bg, #FFFFFF)",
          color: "var(--text-primary, #111827)",
          borderLeft: { xs: "none", sm: "1px solid var(--border, #E5E7EB)" },
          borderTop: { xs: "1px solid var(--border, #E5E7EB)", sm: "none" },
          boxShadow: {
            xs: "0 -8px 32px rgba(0, 0, 0, 0.15)",
            sm: "-8px 0 32px rgba(0, 0, 0, 0.1)",
          },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        },
      }}
      BackdropProps={{
        sx: {
          bgcolor: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          transition: "opacity 240ms ease",
        },
      }}
    >
      {/* Mobile Pull Handle Indicator */}
      <JXBox
        padding="none"
        border={false}
        className="flex sm:hidden justify-center pt-3 pb-1 !rounded-none"
        style={{ backgroundColor: "var(--background, #F9FAFB)", fontFamily: "inherit" }}
      >
        <div
          className="h-[4.5px] w-10 rounded-full opacity-80"
          style={{ backgroundColor: "var(--border)" }}
        />
      </JXBox>

      {/* Header */}
      {(title || showCloseButton) && (
        <JXBox
          padding="none"
          border={false}
          className="flex items-start justify-between gap-4 p-4 sm:p-5 !rounded-none"
          style={{
            borderBottom: "1px solid var(--border, #E5E7EB)",
            backgroundColor: "var(--background, #F9FAFB)",
            fontFamily: "inherit",
          }}
        >
          <div className="min-w-0 flex-1">
            <div
              className={[
                "flex items-center gap-3",
                description ? "mb-1" : "mb-0",
              ].join(" ")}
            >
              {typeof title === "string" ? (
                <JXTypography
                  variant="h3"
                  className="!truncate !text-[1.125rem] !font-bold !leading-[1.3] !text-[var(--text-primary,#111827)]"
                >
                  {title}
                </JXTypography>
              ) : (
                title
              )}
              {badge}
            </div>
            {description && (
              <JXTypography
                variant="body"
                className="!text-[0.8125rem] !leading-[1.4] !text-[var(--text-secondary,#6B7280)]"
              >
                {description}
              </JXTypography>
            )}
          </div>

          {showCloseButton && (
            <Tooltip title="Close drawer">
              <span className="inline-flex">
                <SpringButton
                  type="button"
                  variant="outline"
                  tone="primary"
                  onClick={onClose}
                  style={{ fontFamily: "inherit" }}
                  className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-md !border !border-[var(--border,#E5E7EB)] !bg-[var(--panel-bg,#FFFFFF)] !p-1.5 !text-[var(--text-secondary,#6B7280)] hover:!bg-[var(--background,#F3F4F6)] hover:!text-[var(--text-primary,#111827)] !shadow-none"
                  aria-label="Close drawer"
                >
                  <X style={{ width: 18, height: 18 }} />
                </SpringButton>
              </span>
            </Tooltip>
          )}
        </JXBox>
      )}

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          ...contentSx,
        }}
      >
        {children}
      </Box>

      {/* Footer Actions */}
      {actions && (
        <JXBox
          padding="none"
          border={false}
          className="flex items-center justify-end gap-3 p-5 !rounded-none"
          style={{
            borderTop: "1px solid var(--border, #E5E7EB)",
            backgroundColor: "var(--background, #F9FAFB)",
            fontFamily: "inherit",
          }}
        >
          {actions}
        </JXBox>
      )}
    </MuiDrawer>
  );
}
