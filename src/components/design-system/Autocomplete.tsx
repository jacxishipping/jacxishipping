"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Autocomplete — Jacxi object-aware autocomplete on a native input.
 *
 * Hoisted in Step 3 from five byte-identical per-page copies
 * (`LocalAutocomplete` in shipments/new, shipments/[id]/edit,
 * dispatches/[id], partner-portals/new, partner-portals/[portalId]).
 * Behaviour is unchanged; only the name and the home moved.
 *
 * Deviation from the Phase 1 mapping (which marked `JXAutocomplete`
 * NEEDS WORK): JXAutocomplete takes string ids only and has no
 * `onInputChange`, so it cannot back the async object searches these
 * call sites need (containers/users with debounced server search).
 * This wrapper maps object arrays to {id, label, subtitle, searchText}
 * and back, with keyboard navigation, multi-select chips and a
 * loading state — the single place to fix or restyle it.
 */

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  onInputChange?: (value: string, reason: 'input' | 'clear' | 'select') => void;
  inputValue?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  helperText?: string;
  multiple?: boolean;
}

export type AutocompleteOption = { id: string; label: string; subtitle?: string; searchText?: string };

export function Autocomplete({
  options,
  value,
  onChange,
  onInputChange,
  inputValue,
  placeholder,
  label,
  disabled,
  loading,
  error,
  helperText,
  multiple,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [internalInput, setInternalInput] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = inputValue !== undefined;
  const text = controlled ? inputValue : internalInput;
  const selectedIds = multiple ? (Array.isArray(value) ? value : []) : [];
  const selectedOptions = multiple ? options.filter((o) => selectedIds.includes(o.id)) : [];
  const selected = !multiple ? options.find((o) => o.id === value) || null : null;
  const query = text.toLowerCase().trim();
  const filtered = query
    ? options.filter((o) => `${o.label} ${o.subtitle ?? ''} ${o.searchText ?? ''}`.toLowerCase().includes(query))
    : options;
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, []);
  useEffect(() => {
    if (!controlled && !multiple && (value === null || value === undefined || value === '')) setInternalInput('');
  }, [value, controlled, multiple]);
  const applyText = (v: string, reason: 'input' | 'clear' | 'select') => {
    if (!controlled) setInternalInput(v);
    onInputChange?.(v, reason);
  };
  const choose = (o: AutocompleteOption) => {
    if (multiple) {
      const next = selectedIds.includes(o.id)
        ? selectedIds.filter((id) => id !== o.id)
        : [...selectedIds, o.id];
      onChange(next);
      if (!controlled) setInternalInput('');
      setOpen(true);
      return;
    }
    onChange(o.id);
    applyText(o.label, 'select');
    setOpen(false);
    setActiveIndex(-1);
  };
  const removeChip = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };
  const clearSelection = () => {
    if (multiple) {
      onChange([]);
    } else {
      onChange(null);
    }
    applyText('', 'clear');
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(-1, prev - 1));
      return;
    }
    if (e.key === 'Enter' && open && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault();
      choose(filtered[activeIndex]);
    }
  };
  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label className="mb-1 block font-medium text-[var(--text-primary)]">{label}</label>
      ) : null}
      {multiple && selectedOptions.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] px-2 py-0.5 text-xs font-medium text-[var(--accent-gold-text)]">
              {o.label}
              <button type="button" aria-label={`Remove ${o.label}`} onClick={() => removeChip(o.id)} className="text-[var(--accent-gold-text)] hover:text-[var(--text-primary)]">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-expanded={open}
          role="combobox"
          autoComplete="off"
          onChange={(e) => { applyText(e.target.value, 'input'); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={[
            'ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-3 py-2 pr-16 text-[0.875rem]',
            error
              ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
              : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
            disabled ? 'opacity-50' : '',
          ].filter(Boolean).join(' ')}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[var(--text-secondary)]">
          {loading ? <span role="status" aria-label="Loading" className="inline-block shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-current h-4 w-4" /> : null}
          <ChevronDown className="h-4 w-4" />
        </span>
        {text && !disabled ? (
          <button type="button" aria-label="Clear" onClick={clearSelection} className="absolute right-9 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {helperText ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{helperText}</p>
      ) : null}
      {open && !disabled ? (
        <div role="listbox" className="absolute left-0 right-0 top-full z-[1050] mt-1 max-h-[240px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 shadow-[0_8px_32px_rgba(var(--text-primary-rgb),0.12)]">
          {loading && filtered.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)]">
              <span role="status" aria-label="Loading" className="inline-block shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-current h-4 w-4" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">No options</div>
          ) : (
            filtered.map((o, idx) => {
              const isSelected = multiple ? selectedIds.includes(o.id) : selected?.id === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${idx === activeIndex || isSelected ? 'bg-[rgba(var(--accent-gold-rgb),0.1)]' : 'hover:bg-[rgba(var(--border-rgb),0.25)]'}`}
                >
                  <span className="font-medium text-[var(--text-primary)]">{o.label}</span>
                  {o.subtitle ? <span className="text-xs text-[var(--text-secondary)]">{o.subtitle}</span> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default Autocomplete;
