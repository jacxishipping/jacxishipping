"use client";

import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from './JacxiButton';
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import Tooltip from "./Tooltip";

/**
 * Theme Toggle Component — now on the shared Jacxi `useTheme` store.
 *
 * The old implementation kept its own useState + localStorage reads and
 * toggled the dead `.dark-mode` / `.light-mode` classes (nothing in
 * globals.css reads them). It now toggles the single source of truth
 * (`useTheme`, localStorage key `theme`); `JxThemeSync` carries the change
 * into JXUI. `'system'` is respected as "follow system" — the toggle
 * switches between the two resolved modes.
 */

export type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <JXBox padding="none" border={false} className="h-10 w-10 !rounded-none !bg-transparent" />;
  }

  const isLight = resolvedTheme === "light";

  return (
    <Tooltip
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="inline-flex">
        <JacxiButton
          type="button"
          variant="outline"
          tone="primary"
          aria-label={
            isLight ? "Switch to dark mode" : "Switch to light mode"
          }
          aria-pressed={!isLight}
          onClick={toggleTheme}
          style={{ fontFamily: "inherit" }}
          className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--accent-gold-text)] hover:rotate-[20deg] !shadow-none"
        >
          {isLight ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </JacxiButton>
      </span>
    </Tooltip>
  );
}

// Re-export the theme type for callers that imported it from here.
export type { ThemeMode } from "@/hooks/useTheme";
