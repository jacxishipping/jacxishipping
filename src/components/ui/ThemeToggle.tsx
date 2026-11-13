'use client';

import { Moon, Sun } from 'lucide-react';
import Tooltip from '@/components/design-system/Tooltip';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <span className="inline-flex items-center justify-center p-1 text-[var(--text-secondary)]">
        <span className="h-5 w-5" />
      </span>
    );
  }

  const isLight = resolvedTheme === 'light';

  return (
    <Tooltip title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(var(--border-rgb),0.4)] hover:text-[var(--text-primary)]"
      >
        {isLight ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
    </Tooltip>
  );
}
