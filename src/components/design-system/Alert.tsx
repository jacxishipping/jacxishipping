"use client";

import { JXBox, JXButton } from "@jacxishippingorg/jx-ui-react";
import { ReactNode } from "react";
import Tooltip from "./Tooltip";
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  Close,
} from "@mui/icons-material";

/**
 * Alert Component
 *
 * Display contextual feedback messages with appropriate styling.
 */

export type AlertSeverity = "success" | "warning" | "error" | "info";
export type AlertVariant = "filled" | "outlined" | "subtle";

export interface AlertProps {
  severity?: AlertSeverity;
  variant?: AlertVariant;
  title?: string;
  message?: ReactNode;
  icon?: ReactNode | false;
  onClose?: () => void;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

// Severity configurations
const severityConfig = {
  success: {
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    color: "var(--success)",
    bgColor: "rgba(var(--success-rgb), 0.15)",
    borderColor: "var(--success)",
    lightBg: "var(--success-light)",
  },
  warning: {
    icon: <Warning sx={{ fontSize: 20 }} />,
    color: "var(--warning)",
    bgColor: "rgba(var(--warning-rgb), 0.15)",
    borderColor: "var(--warning)",
    lightBg: "var(--warning-light)",
  },
  error: {
    icon: <ErrorIcon sx={{ fontSize: 20 }} />,
    color: "var(--error)",
    bgColor: "rgba(var(--error-rgb), 0.15)",
    borderColor: "var(--error)",
    lightBg: "var(--error-light)",
  },
  info: {
    icon: <Info sx={{ fontSize: 20 }} />,
    color: "var(--info)",
    bgColor: "rgba(var(--info-rgb), 0.15)",
    borderColor: "var(--info)",
    lightBg: "var(--info-light)",
  },
};

export default function Alert({
  severity = "info",
  variant = "subtle",
  title,
  message,
  icon,
  onClose,
  action,
  className,
  children,
}: AlertProps) {
  const config = severityConfig[severity];
  const showIcon = icon !== false;
  const displayIcon = icon || config.icon;

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case "filled":
        return {
          backgroundColor: config.color,
          color: "#FFFFFF",
          border: "none",
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          color: config.color,
          border: `1px solid ${config.borderColor}`,
        };
      case "subtle":
      default:
        return {
          backgroundColor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.borderColor}`,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <JXBox
      role="alert"
      padding="none"
      border={false}
      className={["flex items-start gap-3 p-4 !rounded-[12px]", className].filter(Boolean).join(" ")}
      style={{ ...variantStyles, fontFamily: "inherit" }}
    >
      {/* Icon */}
      {showIcon && (
        <div
          className="flex shrink-0 items-center"
          style={{
            color: variant === "filled" ? "#FFFFFF" : config.color,
          }}
        >
          {displayIcon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {title && (
          <h4
            className={[
              "text-[0.9375rem] font-semibold",
              message || children ? "mb-1" : "mb-0",
              variant === "filled" ? "text-white" : "text-[var(--text-primary)]",
            ].join(" ")}
          >
            {title}
          </h4>
        )}
        {message && (
          <p
            className={[
              "text-[0.875rem] leading-[1.5]",
              variant === "filled" ? "text-white/90" : "text-[var(--text-secondary)]",
            ].join(" ")}
          >
            {message}
          </p>
        )}
        {children && (
          <div
            className="text-[0.875rem] leading-[1.5]"
            style={{
              color:
                variant === "filled"
                  ? "rgba(255, 255, 255, 0.9)"
                  : "var(--text-secondary)",
            }}
          >
            {children}
          </div>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="flex shrink-0 items-center">
          {action}
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <Tooltip title="Close alert">
          <JXButton
            type="button"
            variant="text"
            size="sm"
            spring
            aria-label="Close alert"
            onClick={onClose}
            className="!min-w-0 !h-8 !w-8 !p-0 -mt-1 -mr-1 shrink-0 !rounded-lg hover:!bg-black/[0.06]"
            style={{
              color:
                variant === "filled"
                  ? "rgba(255, 255, 255, 0.8)"
                  : config.color,
              fontFamily: "inherit",
            }}
          >
            <Close sx={{ fontSize: 18 }} />
          </JXButton>
        </Tooltip>
      )}
    </JXBox>
  );
}
