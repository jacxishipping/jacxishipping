"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SxProps,
  Theme,
} from "@mui/material";
import { JXBox, JXTypography, SpringButton } from "@jacxishippingorg/jx-ui-react";
import { Close } from "@mui/icons-material";
import { ReactNode } from "react";
import Tooltip from "./Tooltip";

/**
 * Modal Component
 *
 * Accessible modal dialog with animations and consistent styling.
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
  contentSx?: SxProps<Theme>;
  actionsSx?: SxProps<Theme>;
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
  const handleClose = (
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (disableBackdropClick && reason === "backdropClick") {
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      className={className}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: sizeConfig[size],
          borderRadius: { xs: 2.5, sm: 3 },
          bgcolor: "var(--panel)",
          backgroundImage: "none",
          boxShadow:
            "0 24px 60px rgba(var(--text-primary-rgb), 0.15), 0 8px 16px rgba(var(--text-primary-rgb), 0.1)",
          m: { xs: 1, sm: 2.5 },
          maxHeight: { xs: "calc(100% - 16px)", sm: "calc(100% - 40px)" },
          overflow: "hidden",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2.5 },
            borderBottom: "1px solid var(--border)",
            bgcolor: "var(--panel)",
          }}
        >
          <JXBox padding="none" border={false} className="min-w-0 flex-1 !rounded-none !bg-transparent" style={{ fontFamily: "inherit" }}>
            {typeof title === "string" ? (
              <JXTypography
                variant="h3"
                className="!text-[1rem] sm:!text-[1.125rem] !font-semibold !text-[var(--text-primary)]"
              >
                {title}
              </JXTypography>
            ) : (
              title
            )}
            {description ? (
              <JXTypography
                variant="body"
                className="!mt-1 !text-[0.8125rem] sm:!text-[0.875rem] !leading-[1.5] !text-[var(--text-secondary)]"
              >
                {description}
              </JXTypography>
            ) : null}
          </JXBox>
          {showCloseButton && (
            <Tooltip title="Close modal">
              <span className="inline-flex">
                <SpringButton
                  type="button"
                  variant="outline"
                  tone="primary"
                  aria-label="Close modal"
                  onClick={onClose}
                  style={{ fontFamily: "inherit" }}
                  className="!h-8 !w-8 !min-h-0 !min-w-0 !rounded-lg !border !border-[rgba(var(--border-rgb),0.6)] !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--border-rgb),0.2)] hover:!text-[var(--text-primary)] !shadow-none"
                >
                  <Close sx={{ fontSize: 18 }} />
                </SpringButton>
              </span>
            </Tooltip>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          color: "var(--text-primary)",
          overflowY: "auto",
          bgcolor: "var(--panel)",
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {/* Actions */}
      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2.5 },
            gap: 1.5,
            borderTop: "1px solid var(--border)",
            bgcolor: "var(--panel)",
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& > *": {
              width: { xs: "100% !important", sm: "auto !important" },
              m: "0 !important",
            },
            ...actionsSx,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
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
          <SpringButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={onClose}
            disabled={loading}
            style={{ fontFamily: "inherit" }}
            className="!h-auto !min-h-0 !rounded-lg !border !border-[var(--border)] !bg-transparent !px-4 !py-2 !text-[0.875rem] !font-semibold !text-[var(--text-primary)] !shadow-none disabled:!opacity-50"
          >
            {cancelText}
          </SpringButton>
          <SpringButton
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
          </SpringButton>
        </>
      }
    >
      <JXTypography variant="body" className="!leading-[1.6] !text-[var(--text-secondary)]">
        {message}
      </JXTypography>
    </Modal>
  );
}
