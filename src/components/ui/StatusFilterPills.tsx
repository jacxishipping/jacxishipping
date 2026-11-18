'use client';

interface StatusOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

interface StatusFilterPillsProps {
  options: StatusOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  className?: string;
}

export function StatusFilterPills({
  options,
  selectedValue,
  onSelect,
  className = '',
}: StatusFilterPillsProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--panel)] to-transparent sm:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--panel)] to-transparent sm:hidden"
      />
      <div
        role="tablist"
        aria-label="Status filters"
        className="flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-gutter:stable] scrollbar-thin"
      >
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(option.value)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-gold-rgb),0.35)] ${
              isSelected
                ? 'bg-[var(--accent-gold)] text-white shadow-sm ring-2 ring-[var(--accent-gold)]/20'
                : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-[rgba(var(--accent-gold-rgb),0.5)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]'
            }`}
          >
            {option.color && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: isSelected ? '#FFFFFF' : option.color }}
              />
            )}
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[var(--background)] text-[var(--text-secondary)]'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}

export default StatusFilterPills;
