"use client";

import { JXButton } from '@jacxishippingorg/jx-ui-react';
import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import { sxToStyle, type SxStyle } from './sx';

/**
 * Button Component — Jacxi design-system button on JXButton.
 *
 * JXButton renders JXUI's accent palette (indigo by default) for its
 * `color="primary"` / tone classes, so every variant is forced to Jacxi
 * gold / panel / error colours with `!`-important Tailwind overrides on
 * the button element itself (the className lands on the <button>, so the
 * overrides win). No raw JXUI accent class reaches the DOM unwrapped.
 * `href` renders a real anchor with the same classes (middle-click /
 * open-in-new-tab keep working); `component="span"` renders a span with
 * the same classes (used inside <label> for hidden file inputs).
 */

export interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'variant' | 'size' | 'onClick'
  > {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  component?: 'button' | 'span' | ElementType;
  /** MUI-compat: `color="error"` renders an error-coloured button (one
   * call site, PortalBrandingSettingsPanel, passes it). */
  color?: 'error';
  /**
   * MUI-compat bridge (deprecated — remove when pages migrate off `sx` in
   * Phase 3). Flat keys (bgcolor, color, borderColor, px, mt, minWidth,
   * textTransform, …) are translated to inline styles; nested selectors
   * ('&:hover', '&:disabled') and responsive objects ({ xs, md }) are
   * dropped — the variant classes already provide the equivalent
   * hover/disabled look.
   */
  sx?: Record<string, unknown>;
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement | HTMLSpanElement>) => void;
}

const toneClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    '!bg-[var(--accent-gold)] !text-[var(--text-primary)] !border-transparent hover:!opacity-90 disabled:!bg-[rgba(var(--accent-gold-rgb),0.5)] disabled:!text-[rgba(var(--text-primary-rgb),0.7)]',
  secondary:
    '!bg-[var(--panel)] !text-[var(--text-primary)] !border !border-[var(--border)] hover:!bg-[var(--background)] hover:!border-[var(--accent-gold)] disabled:!opacity-50',
  outline:
    '!bg-transparent !text-[var(--text-primary)] !border !border-[var(--border)] hover:!bg-black/[0.04] hover:!border-[var(--accent-gold)] disabled:!opacity-50',
  ghost:
    '!bg-transparent !text-[var(--text-secondary)] !border-transparent hover:!bg-black/[0.04] hover:!text-[var(--text-primary)] disabled:!opacity-50',
  danger:
    '!bg-[var(--error)] !text-white !border-transparent hover:!opacity-90 disabled:!bg-[rgba(var(--error-rgb),0.5)] disabled:!text-[rgba(255,255,255,0.7)]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'start',
  fullWidth = false,
  children,
  disabled,
  href,
  target,
  rel,
  component,
  color,
  sx,
  onClick,
  className,
  style,
  ...buttonProps
}: ButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  const sizeClasses = isCompact
    ? {
        sm: '!h-[26px] !px-2.5 !text-[0.7rem]',
        md: '!h-[30px] !px-3 !text-[0.75rem]',
        lg: '!h-[36px] !px-4 !text-[0.85rem]',
      }[size]
    : {
        sm: '!h-[32px] !px-4 !text-[0.75rem]',
        md: '!h-[40px] !px-5 !text-[0.875rem]',
        lg: '!h-[48px] !px-6 !text-[1rem]',
      }[size];

  const jxVariant =
    variant === 'primary' || variant === 'danger'
      ? 'contained'
      : variant === 'secondary' || variant === 'outline'
        ? 'outlined'
        : 'text';

  const classes = [
    'ds-button inline-flex items-center justify-center gap-2 font-semibold shadow-none transition-all duration-200',
    isCompact ? '!rounded-[6px]' : '!rounded-[8px]',
    toneClasses[variant],
    sizeClasses,
    fullWidth ? 'w-full' : '',
    color === 'error' && variant !== 'danger'
      ? '!border-[var(--error)] !text-[var(--error)] hover:!border-[var(--error)] hover:!bg-[rgba(var(--error-rgb),0.08)]'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {!loading && icon && iconPosition === 'start' ? icon : null}
      {children}
      {!loading && icon && iconPosition === 'end' ? icon : null}
    </>
  );

  const isLink = Boolean(href) || Boolean(component && component !== 'button' && component !== 'span');

  // `sx` bridge: flat keys become inline styles (see prop docs).
  const sxStyle = sxToStyle(sx as unknown as SxStyle | undefined);
  const mergedStyle = { fontFamily: 'inherit', ...sxStyle, ...style };

  if (isLink && href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        aria-disabled={disabled || loading ? true : undefined}
        className={classes}
        style={mergedStyle}
      >
        {content}
      </Link>
    );
  }

  if (component === 'span') {
    return (
      <span
        onClick={onClick as unknown as React.MouseEventHandler<HTMLSpanElement>}
        className={classes}
        style={mergedStyle}
      >
        {content}
      </span>
    );
  }

  const {
    type = 'button',
    title,
    id,
    name,
    value,
    form,
    tabIndex,
    autoFocus,
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    'aria-haspopup': ariaHasPopup,
  } = buttonProps;

  return (
    <JXButton
      type={type}
      variant={jxVariant}
      size={size}
      spring
      loading={loading}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={!loading && icon && iconPosition === 'start' ? icon : undefined}
      endIcon={!loading && icon && iconPosition === 'end' ? icon : undefined}
      onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
      title={title}
      id={id}
      name={name}
      value={value}
      form={form}
      tabIndex={tabIndex}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-haspopup={ariaHasPopup}
      style={mergedStyle}
      className={classes}
    >
      {children}
    </JXButton>
  );
}

// Icon-only button variant
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  ariaLabel: string;
}

export function IconButton({
  icon,
  ariaLabel,
  size = 'md',
  ...props
}: IconButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  const sizeClass = isCompact
    ? { sm: '!h-6 !w-6', md: '!h-7 !w-7', lg: '!h-[34px] !w-[34px]' }[size]
    : { sm: '!h-8 !w-8', md: '!h-10 !w-10', lg: '!h-12 !w-12' }[size];

  return (
    <Button
      {...props}
      className={['ds-icon-button !min-w-0 !p-0', sizeClass, props.className]
        .filter(Boolean)
        .join(' ')}
      size={size}
      aria-label={ariaLabel}
    >
      {icon}
    </Button>
  );
}
