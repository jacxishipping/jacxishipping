'use client';

import { Search } from 'lucide-react';
import { useCommandPalette } from '@/components/providers/CommandPaletteProvider';

export default function GlobalSearch() {
  const { openCommandPalette } = useCommandPalette();

  const handleOpen = () => {
    if (openCommandPalette) {
      openCommandPalette();
    } else {
      window.dispatchEvent(new CustomEvent('open-global-search'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label="Search or run command"
      aria-keyshortcuts="Meta+K Control+K"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-all cursor-pointer"
    >
      <Search className="h-4 w-4" />
      <span className="text-sm hidden lg:inline">Search...</span>
      <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px] font-semibold text-[var(--text-secondary)]">
        ⌘K
      </kbd>
    </button>
  );
}
