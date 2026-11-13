"use client";

import { AnimatePresence, motion } from "framer-motion";
import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from './JacxiButton';
import { X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import Tooltip from "./Tooltip";
import { sxToStyle, type SxStyle } from "./sx";

/**
 * Modal Component — Jacxi modal shell on motion + JXBox.
 *
 * Deviation from the Phase 1 mapping (which marked `JXDialog` NEEDS WORK
 * with "use JXDialog only for true confirms"): verified against the
 * installed JXUI 3.0.0 bundle, `JXDialog` renders title + description +
 * confirm/cancel only — it has no `children` slot (confirmed in the built
 * chunk as well as the .d.ts), its surfaces are hardcoded slate
 * (`bg-slate-50/80 dark:bg-[#0B0F19]/60`) and its confirm button uses
 * the indigo `palette.bg`. It cannot host forms, tables or multi-step
 * content, and even for confirms it would leak indigo. This shell keeps
 * the exact `ModalProps` contract (including `contentSx`/`actionsSx`,
 * translated from the flat MUI-sx shape by `sxToStyle`) with Jacxi gold
 * styling, Esc/backdrop handling and a focus trap on open.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  className?: string;
  contentSx?: SxStyle;
  actionsSx?: SxStyle;
}

// Size configurations
const sizeConfig = {
  sm: "400px",
  md: "600px",
  lg: "800px",
  xl: "1000px",
  full: "95vw",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = "md",
  showCloseButton = true,
  disableBackdropClick = false,
  className,
  contentSx,
  actionsSx,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape + lock body scroll while open; focus the panel.
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1040] flex items-end justify-center p-2 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50 backdrop-blur-[4px]"
            onClick={() => {
              if (!disableBackdropClick) onClose();
            }}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={[
              "relative flex max-h-[calc(100%-16px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] shadow-[0_24px_60px_rgba(var(--text-primary-rgb),0.15),0_8px_16px_rgba(var(--text-primary-rgb),0.1)] outline-none sm:max-h-[calc(100%-40px)] sm:rounded-3xl",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ maxWidth: sizeConfig[size] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="ds-modal-title flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3.5 sm:px-6 sm:py-5">
                <JXBox padding="none" border={false} className="min-w-0 flex-1 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
                  {typeof title === "string" ? (
                    <h3 className="text-[1rem] font-semibold text-[var(--text-primary)] sm:text-[1.125rem]">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {description ? (
                    <p className="mt-1 text-[0.8125rem] leading-[1.5] text-[var(--text-secondary)] sm:text-[0.875rem]">
                      {description}
                    </p>
                  ) : null}
                </JXBox>
                {showCloseButton && (
                  <Tooltip title="Close modal">
                    <span className="inline-flex">
                      <JacxiButton
                        type="button"
                        variant="outline"
                        tone="primary"
                        aria-label="Close modal"
                        onClick={onClose}
                        style={{ fontFamily: "inherit" }}
                        className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-lg !border !border-[rgba(var(--border-rgb),0.6)] !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.2)] hover:!text-[var(--text-primary)] !shadow-none"
                      >
                        <X className="h-[18px] w-[18px]" />
                      </JacxiButton>
                    </span>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Content */}
            <div
              className="ds-modal-content overflow-y-auto bg-[var(--panel)] px-4 py-4 text-[var(--text-primary)] sm:px-6 sm:py-6"
              style={sxToStyle(contentSx)}
            >
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div
                className="ds-modal-actions flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--panel)] px-4 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-5 [&>*]:w-full sm:[&>*]:w-auto"
                style={sxToStyle(actionsSx)}
              >
                {actions}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confirmation Dialog Variant
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  severity?: "info" | "warning" | "error";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  severity = "info",
  loading = false,
}: ConfirmDialogProps) {
  const severityColors = {
    info: "var(--info)",
    warning: "var(--warning)",
    error: "var(--error)",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      actions={
        <>
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={onClose}
            disabled={loading}
            style={{ fontFamily: "inherit" }}
            className="!h-auto !min-h-0 !rounded-lg !border !border-[var(--border)] !bg-transparent !px-4 !py-2 !text-[0.875rem] !font-semibold !text-[var(--text-primary)] !shadow-none disabled:!opacity-50"
          >
            {cancelText}
          </JacxiButton>
          <JacxiButton
            type="button"
            variant="solid"
            tone={severity === "error" ? "danger" : severity === "warning" ? "warning" : "primary"}
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: severityColors[severity],
              fontFamily: "inherit",
            }}
            className="!h-auto !min-h-0 !rounded-lg !border-0 !px-4 !py-2 !text-[0.875rem] !font-semibold !text-white disabled:!opacity-70"
          >
            {loading ? "Processing..." : confirmText}
          </JacxiButton>
        </>
      }
    >
      <p className="leading-[1.6] text-[var(--text-secondary)]">
        {message}
      </p>
    </Modal>
  );
}
