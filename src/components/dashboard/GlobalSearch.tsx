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

  // Plain neutral trigger — NOT JacxiButton: that wrapper defaults to a
  // solid-gold primary (inline gold background beats these classes), which
  // made this render as a large gold "Search…" pill dominating the top
  // bar. Gold survives only as the focus ring, matching the other header
  // icon buttons (transparent, secondary text, neutral hover).
  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label="Search or run command"
      aria-keyshortcuts="Meta+K Control+K"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] shadow-sm transition-all cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--background)] focus-visible:outline-none focus-visible:border-[var(--accent-gold)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-gold-rgb),0.35)]"
    >
      <Search className="h-4 w-4" />
      <span className="text-sm hidden lg:inline">Search...</span>
      <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--border)] rounded text-[10px] font-semibold text-[var(--text-secondary)]">
        ⌘K
      </kbd>
    </button>
  );
}
