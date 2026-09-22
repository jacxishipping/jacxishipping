'use client';

import { useTheme } from '@/hooks/useTheme';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getMuiTheme } from '@/theme/theme';
import { useMemo } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, mounted } = useTheme();

  const muiTheme = useMemo(() => {
    return getMuiTheme(resolvedTheme);
  }, [resolvedTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}