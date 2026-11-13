"use client";

import { Anchor, AlertTriangle, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ReactNode, type CSSProperties } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * StatusBadge Component
 * 
 * Displays status with appropriate colors and styling.
 * Used for shipment status, payment status, etc.
 * Uses high-contrast color combinations for better readability.
 */

// Shipment Status Types
export type ShipmentStatus = 
  | 'ON_HAND' 
  | 'DISPATCHING'
  | 'IN_TRANSIT' 
  | 'IN_TRANSIT_TO_DESTINATION'
  | 'AT_PORT' 
  | 'CUSTOMS' 
  | 'RELEASED' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'DELAYED'
  // Container Statuses
  | 'CREATED'
  | 'WAITING_FOR_LOADING'
  | 'LOADED'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_CLEARANCE'
  | 'CLOSED';

// Payment Status Types
export type PaymentStatus = 
  | 'PAID' 
  | 'PENDING' 
  | 'OVERDUE' 
  | 'PARTIAL' 
  | 'REFUNDED';

// Generic Status Types
export type GenericStatus = 
  | 'SUCCESS' 
  | 'WARNING' 
  | 'ERROR' 
  | 'INFO' 
  | 'DEFAULT';

export type StatusType = ShipmentStatus | PaymentStatus | GenericStatus | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  variant?: 'default' | 'dot' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  showIcon?: boolean;
  className?: string;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'DELIVERED':
    case 'PAID':
    case 'ON_HAND':
      return <CheckCircle2 width={10} height={10} />;
    case 'PENDING':
    case 'DISPATCHING':
      return <Clock width={10} height={10} />;
    case 'OVERDUE':
    case 'DELAYED':
      return <AlertTriangle width={10} height={10} />;
    case 'IN_TRANSIT':
    case 'IN_TRANSIT_TO_DESTINATION':
      return <Truck width={10} height={10} />;
    case 'AT_PORT':
    case 'ARRIVED_PORT':
      return <Anchor width={10} height={10} />;
    case 'CANCELLED':
      return <XCircle width={10} height={10} />;
    default:
      return null;
  }
}

// Status color mappings with enhanced theme adaptability and contrast
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Shipment Statuses
  ON_HAND: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  DISPATCHING: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'rgba(var(--warning-rgb), 0.3)',
  },
  IN_TRANSIT: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  IN_TRANSIT_TO_DESTINATION: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  AT_PORT: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'rgba(var(--warning-rgb), 0.3)',
  },
  CUSTOMS: {
    bg: 'rgba(var(--accent-gold-rgb), 0.12)',
    text: 'var(--accent-gold)',
    border: 'rgba(var(--accent-gold-rgb), 0.3)',
  },
  RELEASED: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  DELIVERED: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  CANCELLED: {
    bg: 'rgba(var(--border-rgb), 0.35)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  DELAYED: {
    bg: 'rgba(var(--error-rgb), 0.12)',
    text: 'var(--error-dark)',
    border: 'rgba(var(--error-rgb), 0.3)',
  },

  // Container Statuses
  CREATED: {
    bg: 'rgba(var(--border-rgb), 0.35)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  WAITING_FOR_LOADING: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'rgba(var(--warning-rgb), 0.3)',
  },
  LOADED: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  ARRIVED_PORT: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  CUSTOMS_CLEARANCE: {
    bg: 'rgba(var(--accent-gold-rgb), 0.12)',
    text: 'var(--accent-gold)',
    border: 'rgba(var(--accent-gold-rgb), 0.3)',
  },
  CLOSED: {
    bg: 'rgba(var(--border-rgb), 0.35)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },

  // Payment Statuses
  PAID: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  PENDING: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'rgba(var(--warning-rgb), 0.3)',
  },
  OVERDUE: {
    bg: 'rgba(var(--error-rgb), 0.12)',
    text: 'var(--error-dark)',
    border: 'rgba(var(--error-rgb), 0.3)',
  },
  PARTIAL: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  REFUNDED: {
    bg: 'rgba(var(--border-rgb), 0.35)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },

  // Generic Statuses
  SUCCESS: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'rgba(var(--success-rgb), 0.3)',
  },
  WARNING: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'rgba(var(--warning-rgb), 0.3)',
  },
  ERROR: {
    bg: 'rgba(var(--error-rgb), 0.12)',
    text: 'var(--error-dark)',
    border: 'rgba(var(--error-rgb), 0.3)',
  },
  INFO: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  // User Roles
  ADMIN: {
    bg: 'rgba(var(--accent-gold-rgb), 0.15)',
    text: 'var(--accent-gold)',
    border: 'rgba(var(--accent-gold-rgb), 0.3)',
  },
  MANAGER: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'rgba(var(--info-rgb), 0.3)',
  },
  USER: {
    bg: 'var(--panel)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  CUSTOMER: {
    bg: 'var(--panel)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  DEFAULT: {
    bg: 'var(--panel)',
    text: 'var(--text-primary)',
    border: 'var(--border)',
  },
};

// Format status text for display
function formatStatusText(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// Size configurations
const sizeConfig = {
  sm: {
    fontSize: '0.6875rem',
    padding: '3px 10px',
    height: '22px',
    dotSize: '6px',
    gap: '4px',
  },
  md: {
    fontSize: '0.75rem',
    padding: '4px 12px',
    height: '24px',
    dotSize: '8px',
    gap: '6px',
  },
  lg: {
    fontSize: '0.8125rem',
    padding: '6px 16px',
    height: '28px',
    dotSize: '10px',
    gap: '8px',
  },
};

export default function StatusBadge({
  status,
  label,
  variant = 'default',
  size = 'md',
  icon,
  showIcon = false,
  className,
}: StatusBadgeProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const badgeClassName = ["status-badge", className].filter(Boolean).join(" ");
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
  const colors = statusColors[normalizedStatus] || statusColors.DEFAULT;
  const baseConfig = sizeConfig[size];
  const config = isCompact
    ? {
        ...baseConfig,
        fontSize: '0.6875rem',
        padding: '2px 8px',
        height: '20px',
        gap: '4px',
        dotSize: '6px',
      }
    : baseConfig;
  const resolvedIcon = showIcon ? getStatusIcon(normalizedStatus) : icon;
  const displayText = label || formatStatusText(status);

  // Default variant (filled background)
  if (variant === 'default') {
    return (
      <JXBox
        component="span"
        padding="none"
        border={false}
        className={[
          'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
          badgeClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          gap: config.gap,
          height: config.height,
          paddingLeft: config.padding,
          paddingRight: config.padding,
          borderRadius: isCompact ? '6px' : '12px',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          fontSize: config.fontSize,
          color: colors.text,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          fontFamily: 'inherit',
        }}
      >
        {resolvedIcon && (
          <span
            className="flex items-center leading-none"
            style={{
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
            }}
          >
            {resolvedIcon}
          </span>
        )}
        <span
          className="leading-none tracking-[0.025em]"
          style={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textTransform: label ? 'none' : 'capitalize',
          }}
        >
          {displayText}
        </span>
      </JXBox>
    );
  }

  // Dot variant (with colored dot)
  if (variant === 'dot') {
    return (
      <JXBox
        component="span"
        padding="none"
        border={false}
        className={['inline-flex items-center font-medium !bg-transparent', badgeClassName]
          .filter(Boolean)
          .join(' ')}
        style={{
          gap: config.gap,
          fontSize: config.fontSize,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
        }}
      >
        <span
          className="shrink-0 rounded-full"
          style={{
            width: config.dotSize,
            height: config.dotSize,
            backgroundColor: colors.text,
            boxShadow: `0 0 0 2px ${colors.bg}`,
          }}
        />
        {resolvedIcon && (
          <span
            className="flex leading-none"
            style={{
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              color: colors.text,
            }}
          >
            {resolvedIcon}
          </span>
        )}
        <span
          className="leading-none"
          style={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textTransform: label ? 'none' : 'capitalize',
          }}
        >
          {displayText}
        </span>
      </JXBox>
    );
  }

  // Outline variant (bordered, no background)
  if (variant === 'outline') {
    return (
      <JXBox
        component="span"
        padding="none"
        border={false}
        className={[
          'inline-flex items-center justify-center font-semibold whitespace-nowrap !bg-transparent hover:!bg-[var(--badge-hover-bg)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
          badgeClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            gap: config.gap,
            height: config.height,
            paddingLeft: config.padding,
            paddingRight: config.padding,
            borderRadius: isCompact ? '6px' : '12px',
            border: `1.5px solid ${colors.border}`,
            fontSize: config.fontSize,
            color: colors.text,
            fontFamily: 'inherit',
            '--badge-hover-bg': colors.bg,
          } as CSSProperties
        }
      >
        {resolvedIcon && (
          <span
            className="flex items-center leading-none"
            style={{
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
            }}
          >
            {resolvedIcon}
          </span>
        )}
        <span
          className="leading-none tracking-[0.025em]"
          style={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textTransform: label ? 'none' : 'capitalize',
          }}
        >
          {displayText}
        </span>
      </JXBox>
    );
  }

  return null;
}

// Convenience components for specific status types
export function ShipmentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: ShipmentStatus }) {
  return <StatusBadge status={status} {...props} />;
}

export function PaymentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: PaymentStatus }) {
  return <StatusBadge status={status} {...props} />;
}