"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

/**
 * Tooltip Component — Jacxi implementation (NOT JXTooltip).
 *
 * Verified against the installed JXUI 3.0.0 bundle: `JXTooltip` is a rich
 * telemetry card (fixed dark slate-900, w-72, click-toggle, no placement
 * or delay props), not a plain hover label. It cannot serve as a
 * drop-in MUI Tooltip replacement, so this wrapper is a small custom
 * tooltip: hover/focus with an enter delay, gold-bordered Jacxi panel,
 * keyboard-accessible (focus shows it, Escape hides it).
 */
export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export interface TooltipProps {
  title: string | ReactElement;
  children: ReactElement;
  placement?: TooltipPlacement;
  arrow?: boolean;
  delay?: number;
  className?: string;
  /** Extra classes on the positioning wrapper span (e.g. `w-full`). */
  wrapperClassName?: string;
}

const placementClasses: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  'top-start': 'bottom-full left-0 mb-2',
  'top-end': 'bottom-full right-0 mb-2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  'bottom-start': 'top-full left-0 mt-2',
  'bottom-end': 'top-full right-0 mt-2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  'left-start': 'right-full top-0 mr-2',
  'left-end': 'right-full bottom-0 mr-2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  'right-start': 'left-full top-0 ml-2',
  'right-end': 'left-full bottom-0 ml-2',
};

const arrowClasses: Record<TooltipPlacement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-[5px]',
  'top-start': 'top-full left-3 -mt-[5px]',
  'top-end': 'top-full right-3 -mt-[5px]',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[5px]',
  'bottom-start': 'bottom-full left-3 -mb-[5px]',
  'bottom-end': 'bottom-full right-3 -mb-[5px]',
  left: 'left-full top-1/2 -translate-y-1/2 -ml-[5px]',
  'left-start': 'left-full top-3 -ml-[5px]',
  'left-end': 'left-full bottom-3 -ml-[5px]',
  right: 'right-full top-1/2 -translate-y-1/2 -mr-[5px]',
  'right-start': 'right-full top-3 -mr-[5px]',
  'right-end': 'right-full bottom-3 -mr-[5px]',
};

export default function Tooltip({
  title,
  children,
  placement = 'top',
  arrow = true,
  delay = 200,
  className,
  wrapperClassName,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 80);
  };

  const hideNow = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    setVisible(false);
  };

  const child = isValidElement(children)
    ? cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          (children.props as { onMouseEnter?: (e: React.MouseEvent) => void })
            .onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          (children.props as { onMouseLeave?: (e: React.MouseEvent) => void })
            .onMouseLeave?.(e);
          hide();
        },
        onFocus: (e: React.FocusEvent) => {
          (children.props as { onFocus?: (e: React.FocusEvent) => void })
            .onFocus?.(e);
          show();
        },
        onBlur: (e: React.FocusEvent) => {
          (children.props as { onBlur?: (e: React.FocusEvent) => void })
            .onBlur?.(e);
          hide();
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          (children.props as { onKeyDown?: (e: React.KeyboardEvent) => void })
            .onKeyDown?.(e);
          if (e.key === 'Escape') hideNow();
        },
      } as Partial<unknown>)
    : children;

  return (
    <span
      className={['relative inline-flex', wrapperClassName].filter(Boolean).join(' ')}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {child}
      {visible && (
        <span
          role="tooltip"
          className={[
            'pointer-events-none absolute z-[1060] max-w-[300px] rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[0.8125rem] font-medium leading-[1.5] text-[var(--text-primary)] shadow-[0_12px_28px_rgba(var(--text-primary-rgb),0.12),0_4px_8px_rgba(var(--text-primary-rgb),0.08)]',
            placementClasses[placement],
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {title}
          {arrow && (
            <span
              aria-hidden="true"
              className={[
                'absolute h-2.5 w-2.5 rotate-45 border-[var(--border)] bg-[var(--panel)]',
                arrowClasses[placement],
              ].join(' ')}
              style={{
                // The rotated square's visible half is bounded by two edges;
                // hide the two edges covered by the tooltip box itself.
                borderTopWidth: placement.startsWith('top') || placement.startsWith('right') ? 0 : undefined,
                borderLeftWidth: placement.startsWith('top') || placement.startsWith('left') ? 0 : undefined,
                borderBottomWidth: placement.startsWith('bottom') || placement.startsWith('left') ? 0 : undefined,
                borderRightWidth: placement.startsWith('bottom') || placement.startsWith('right') ? 0 : undefined,
              }}
            />
          )}
        </span>
      )}
    </span>
  );
}

// Info Tooltip (with icon)
export function InfoTooltip({
  content,
  placement = 'top',
}: {
  content: string;
  placement?: TooltipProps['placement'];
}) {
  return (
    <Tooltip title={content} placement={placement}>
      <JXBox
        component="span"
        padding="none"
        border={false}
        className="ml-0.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-[rgba(var(--info-rgb),0.15)] text-[0.7rem] font-bold text-[var(--info)] hover:bg-[rgba(var(--info-rgb),0.25)] !rounded-full"
        style={{ fontFamily: 'inherit' }}
      >
        ?
      </JXBox>
    </Tooltip>
  );
}
