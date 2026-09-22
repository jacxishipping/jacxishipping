'use client';

import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    setResolvedTheme(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('theme') as ThemeMode) || 'light';
    setThemeState(stored);
    applyTheme(stored);

    // Listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentStored = (localStorage.getItem('theme') as ThemeMode) || 'light';
      if (currentStored === 'system') {
        applyTheme('system');
      }
    };

    // Listen to storage events across tabs or components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as ThemeMode;
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-changed', ((e: CustomEvent<ThemeMode>) => {
      if (e.detail) {
        setThemeState(e.detail);
        applyTheme(e.detail);
      }
    }) as EventListener);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [applyTheme]);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }));
      }
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme,
    mounted,
  };
}
