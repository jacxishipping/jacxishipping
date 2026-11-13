"use client";

import { ChevronDown } from 'lucide-react';
import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Select Component — Jacxi select on a native <select>.
 *
 * Deviation from the Phase 1 mapping (which marked `JXSelect` CLEAN):
 * verified against the installed JXUI 3.0.0 source, `JXSelect` hardcodes
 * slate surfaces/text (`bg-slate-50 dark:bg-slate-950`, `text-slate-900`)
 * and an indigo focus ring (`palette.ring`) on inner elements that the
 * root `className` cannot reach — there is no prop to recolour them. It
 * also has no icon slot for the `leftIcon` this wrapper's call sites
 * pass. The native control keeps the exact Jacxi look (system font,
 * `--background` surface, gold focus ring), full keyboard/AT behaviour,
 * and the exact public API. `option.icon` is accepted but cannot be
 * rendered inside a native <option> — no call site passes one today.
 */

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps {
  id?: string;
  /** Optional: when omitted, no label row is rendered (bare-select call sites). */
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  helperText,
  error = false,
  required = false,
  disabled = false,
  leftIcon,
  fullWidth = true,
  size = 'medium',
}: SelectProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const fieldSize = size === 'medium' && isCompact ? 'small' : size;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = event.target.value;
    const matched = options.find((o) => String(o.value) === raw);
    onChange(matched && typeof matched.value === 'number' ? matched.value : raw);
  };

  return (
    <div className={fullWidth ? 'ds-select w-full' : 'ds-select'}>
      {/* Label */}
      {label ? (
        <label
          htmlFor={id}
          className="block font-medium"
          style={{
            fontSize: isCompact ? '0.775rem' : '0.875rem',
            color: error ? 'var(--error)' : 'var(--text-primary)',
            marginBottom: isCompact ? '0.175rem' : '0.5rem',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--error)', marginLeft: '0.25rem' }}>
              *
            </span>
          )}
        </label>
      ) : null}

      {/* Select */}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">
            {leftIcon}
          </span>
        )}
        <select
          id={id}
          value={value === '' || value === undefined ? '' : String(value)}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={[
            'ds-select-control w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors',
            fieldSize === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
            leftIcon ? 'pl-9' : '',
            'pr-9',
            value === '' ? 'text-[var(--text-secondary)]' : '',
            error
              ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
              : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
            disabled ? 'opacity-50' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
          aria-hidden="true"
        />
      </div>

      {/* Helper Text */}
      {helperText && (
        <span
          className={[
            'mt-1 block text-[0.75rem]',
            error ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]',
          ].join(' ')}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
