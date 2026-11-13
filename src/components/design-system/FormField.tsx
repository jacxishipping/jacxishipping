"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * FormField — Jacxi form field on a native input/textarea.
 *
 * Deviation from the Phase 1 mapping (which marked `JXTextField` CLEAN):
 * verified against the installed JXUI 3.0.0 source, `JXTextField` is a
 * "secret input" showcase — monospace font, slate-50/slate-950 surfaces,
 * a forced `n/64 chars` counter, an always-on clear button and an indigo
 * focus ring (`palette.ring`) that no `className` can override. It also
 * takes a string-only `onChange` and does not forward `ref`, so it cannot
 * host this wrapper's call sites: event-based `onChange` handlers that
 * read `e.target.name`/`e.target.value`, react-hook-form `register()`
 * spreads (which pass `ref`), and `multiline` + `rows` textareas.
 * The native control below keeps the exact public API and the exact
 * Jacxi look (system font, `--background` surface, gold focus ring).
 */
type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'onChange'
> & {
  /** Optional: when omitted, no label row is rendered (bare-input call sites). */
  label?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  multiline?: boolean;
  rows?: number;
  /** MUI-compat: minimum visible rows for a multiline field. */
  minRows?: number;
  size?: 'small' | 'medium';
  error?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  /** MUI-compat: extra input attributes (min/max/step/…) spread onto the control. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  /** MUI-compat: accepted and ignored — the native label always sits above
   * the field, so `shrink` (for floating date labels) is a no-op. */
  InputLabelProps?: { shrink?: boolean } & Record<string, unknown>;
};

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, BaseProps>(
  function FormField(
    {
      label,
      helperText,
      leftIcon,
      rightIcon,
      multiline = false,
      rows,
      minRows,
      size,
      error = false,
      id,
      required,
      disabled,
      className,
      inputProps,
      InputLabelProps: _inputLabelProps,
      ...inputPropsRest
    },
    ref,
  ) {
    const { density } = useTheme();
    const isCompact = density === 'compact';
    const helperTextId = id ? `${id}-helper-text` : undefined;
    const fieldSize = size || (isCompact ? 'small' : 'medium');

    const controlClass = [
      'ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
      fieldSize === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
      leftIcon ? 'pl-9' : '',
      rightIcon ? 'pr-9' : '',
      error
        ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
        : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
      disabled ? 'opacity-50' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const shared = {
      id,
      required,
      disabled,
      'aria-describedby': [
        helperText ? helperTextId : undefined,
        inputPropsRest['aria-describedby'],
      ]
        .filter(Boolean)
        .join(' ') || undefined,
      'aria-invalid': error || undefined,
    } as const;

    return (
      <div className="ds-form-field">
        {label ? (
          <label
            htmlFor={id}
            className="mb-1 block font-medium text-[var(--text-primary)]"
            style={{ fontSize: isCompact ? '0.775rem' : '0.875rem', marginBottom: isCompact ? '0.175rem' : '0.5rem' }}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-[var(--error)]">*</span>
            )}
          </label>
        ) : null}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">
              {leftIcon}
            </span>
          )}
          {multiline ? (
            <textarea
              {...(inputPropsRest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
              {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
              {...shared}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              rows={rows ?? minRows ?? 3}
              className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
            />
          ) : (
            <input
              {...inputPropsRest}
              {...inputProps}
              {...shared}
              ref={ref as React.Ref<HTMLInputElement>}
              className={controlClass}
            />
          )}
          {rightIcon && (
            <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">
              {rightIcon}
            </span>
          )}
        </div>
        {helperText && (
          <p
            id={helperTextId}
            className="mt-0.5 text-[0.75rem]"
            style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

export default FormField;
