"use client";

import { AnimatePresence, motion } from "framer-motion";
import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from './JacxiButton';
import { X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import Tooltip from "./Tooltip";
import { sxToStyle, type SxStyle } from "./sx";

/**
 * Drawer Component — Jacxi slide-over panel on motion + JXBox.
 *
 * `JXDrawer` (JXUI 3.0.0) is a collapsible sidebar (`collapsed` + nav
 * `items`), not a slide-over panel, so it cannot host this wrapper's
 * contract (open/close, anchor, arbitrary children + actions). This
 * shell keeps the exact `DrawerProps` — including the mobile bottom-sheet
 * behaviour (full-width, rounded top, 88vh max) and the side-panel
 * behaviour on sm+ — with Esc/backdrop handling and body scroll lock.
 */
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
  contentSx?: SxStyle;
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key + lock body scroll while open; focus the panel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const drawerWidth = sizeConfig[size] || sizeConfig.md;

  const sideClasses =
    anchor === "right"
      ? "sm:left-auto sm:right-0 sm:rounded-l-none"
      : "sm:right-auto sm:left-0 sm:rounded-r-none";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1040]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(15,23,42,0.45)] backdrop-blur-[4px]"
            onClick={onClose}
          />
          {/* Panel: bottom sheet on mobile, side panel on sm+ */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={[
              "absolute bottom-0 left-0 right-0 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[20px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] outline-none",
              "sm:bottom-0 sm:top-0 sm:max-h-none sm:h-full sm:w-[var(--drawer-width)] sm:rounded-t-none sm:shadow-[-8px_0_32px_rgba(0,0,0,0.1)]",
              sideClasses,
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ maxWidth: "100vw", "--drawer-width": drawerWidth } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Handle Indicator */}
            <JXBox
              padding="none"
              border={false}
              className="flex justify-center pb-1 pt-3 sm:hidden !rounded-none"
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
                      <h3 className="truncate text-[1.125rem] font-bold leading-[1.3] text-[var(--text-primary,#111827)]">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {badge}
                  </div>
                  {description && (
                    <p className="text-[0.8125rem] leading-[1.4] text-[var(--text-secondary,#6B7280)]">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <Tooltip title="Close drawer">
                    <span className="inline-flex">
                      <JacxiButton
                        type="button"
                        variant="outline"
                        tone="primary"
                        onClick={onClose}
                        style={{ fontFamily: "inherit" }}
                        className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-md !border !border-[var(--border,#E5E7EB)] !bg-[var(--panel-bg,#FFFFFF)] !p-1.5 !text-[var(--text-secondary,#6B7280)] hover:!bg-[var(--background,#F3F4F6)] hover:!text-[var(--text-primary,#111827)] !shadow-none"
                        aria-label="Close drawer"
                      >
                        <X style={{ width: 18, height: 18 }} />
                      </JacxiButton>
                    </span>
                  </Tooltip>
                )}
              </JXBox>
            )}

            {/* Main Content Area */}
            <div
              className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-6"
              style={sxToStyle(contentSx)}
            >
              {children}
            </div>

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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
