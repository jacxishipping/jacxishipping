"use client";

import { useState, useEffect } from "react";
import { JXBox, SpringButton } from "@jacxishippingorg/jx-ui-react";
import { LightMode, DarkMode } from "@mui/icons-material";
import Tooltip from "./Tooltip";

/**
 * Theme Toggle Component
 *
 * Switch between light and dark modes.
 * Persists preference in localStorage.
 */

export type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;

    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === "dark") {
      root.classList.add("dark-mode");
      root.classList.add("dark");
      root.classList.remove("light-mode");
    } else {
      root.classList.add("light-mode");
      root.classList.remove("dark-mode");
      root.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <JXBox padding="none" border={false} className="h-10 w-10 !rounded-none !bg-transparent" />;
  }

  return (
    <Tooltip
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="inline-flex">
        <SpringButton
          type="button"
          variant="outline"
          tone="primary"
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
          onClick={toggleTheme}
          style={{ fontFamily: "inherit" }}
          className="!h-9 !w-9 !min-h-0 !min-w-0 !rounded-lg !border-0 !bg-transparent !p-1.5 !text-[var(--text-secondary)] hover:!bg-[rgba(var(--accent-gold-rgb),0.1)] hover:!text-[var(--accent-gold-text)] hover:rotate-[20deg] !shadow-none"
        >
          {theme === "light" ? (
            <LightMode sx={{ fontSize: 20 }} />
          ) : (
            <DarkMode sx={{ fontSize: 20 }} />
          )}
        </SpringButton>
      </span>
    </Tooltip>
  );
}
