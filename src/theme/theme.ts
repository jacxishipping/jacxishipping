'use client';

import { createTheme, Theme } from '@mui/material/styles';

const lightPalette = {
  accentGold: '#D4AF37',
  background: '#F9FAFB',
  panel: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#5F6368',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const darkPalette = {
  accentGold: '#D4AF37',
  background: '#09090B',
  panel: '#141416',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  border: '#27272A',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export function getMuiTheme(
  mode: 'light' | 'dark' = 'light',
  density: 'comfortable' | 'compact' = 'comfortable'
): Theme {
  const p = mode === 'dark' ? darkPalette : lightPalette;
  const isCompact = density === 'compact';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: p.accentGold,
        light: '#E2C265',
        dark: '#B89428',
        contrastText: mode === 'dark' ? '#000000' : p.textPrimary,
      },
      secondary: {
        main: p.accentGold,
        light: '#E2C265',
        dark: '#B89428',
        contrastText: mode === 'dark' ? '#000000' : p.textPrimary,
      },
      success: {
        main: p.success,
        light: mode === 'dark' ? '#064E3B' : '#D1FAE5',
        dark: mode === 'dark' ? '#D1FAE5' : '#047857',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: p.warning,
        light: mode === 'dark' ? '#78350F' : '#FEF3C7',
        dark: mode === 'dark' ? '#FEF3C7' : '#B45309',
        contrastText: '#FFFFFF',
      },
      error: {
        main: p.error,
        light: mode === 'dark' ? '#7F1D1D' : '#FEE2E2',
        dark: mode === 'dark' ? '#FEE2E2' : '#B91C1C',
        contrastText: '#FFFFFF',
      },
      info: {
        main: p.info,
        light: mode === 'dark' ? '#1E3A8A' : '#DBEAFE',
        dark: mode === 'dark' ? '#DBEAFE' : '#1D4ED8',
        contrastText: '#FFFFFF',
      },
      grey: mode === 'dark'
        ? {
            50: '#18181B',
            100: '#27272A',
            200: '#3F3F46',
            300: '#52525B',
            400: '#71717A',
            500: p.textSecondary,
            600: '#D4D4D8',
            700: '#E4E4E7',
            800: '#F4F4F5',
            900: p.textPrimary,
          }
        : {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: p.textSecondary,
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: p.textPrimary,
          },
      background: {
        default: p.background,
        paper: p.panel,
      },
      text: {
        primary: p.textPrimary,
        secondary: p.textSecondary,
      },
    },
    typography: {
      fontFamily: 'var(--font-inter), var(--font-urbanist), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontSize: isCompact ? '2rem' : '2.25rem', fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: isCompact ? '1.625rem' : '1.875rem', fontWeight: 600, lineHeight: 1.3 },
      h3: { fontSize: isCompact ? '1.375rem' : '1.5rem', fontWeight: 600, lineHeight: 1.4 },
      h4: { fontSize: isCompact ? '1.125rem' : '1.25rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: isCompact ? '1rem' : '1.125rem', fontWeight: 600, lineHeight: 1.5 },
      h6: { fontSize: isCompact ? '0.875rem' : '1rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: isCompact ? '0.875rem' : '1rem', lineHeight: 1.5 },
      body2: { fontSize: isCompact ? '0.8125rem' : '0.875rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 500, fontSize: isCompact ? '0.8125rem' : '0.875rem' },
    },
    shape: {
      borderRadius: isCompact ? 6 : 8,
    },
    spacing: isCompact ? 6 : 8,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 6 : 8,
            padding: isCompact ? '4px 12px' : '8px 16px',
            minHeight: isCompact ? '32px' : '40px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: isCompact ? '6px 10px' : '12px 16px',
            fontSize: isCompact ? '0.8125rem' : '0.875rem',
            borderColor: p.border,
          },
          head: {
            padding: isCompact ? '8px 10px' : '14px 16px',
            fontWeight: 600,
            fontSize: isCompact ? '0.75rem' : '0.8125rem',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 10 : 12,
            backgroundImage: 'none',
            backgroundColor: p.panel,
            borderColor: p.border,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: isCompact ? '12px' : '20px',
            '&:last-child': {
              paddingBottom: isCompact ? '12px' : '20px',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: p.panel,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 6 : 8,
            backgroundColor: mode === 'dark' ? '#18181B' : '#FFFFFF',
            fontSize: isCompact ? '0.8125rem' : '0.875rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: p.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: p.accentGold,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: p.accentGold,
            },
          },
          input: {
            padding: isCompact ? '6px 10px' : '10px 14px',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: isCompact ? 6 : 8,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: isCompact ? 4 : 6,
            height: isCompact ? '24px' : '32px',
            fontSize: isCompact ? '0.75rem' : '0.8125rem',
            fontWeight: 500,
          },
        },
      },
    },
  });
}

export const lightTheme = getMuiTheme('light', 'comfortable');
export const darkTheme = getMuiTheme('dark', 'comfortable');
export const theme = lightTheme;
