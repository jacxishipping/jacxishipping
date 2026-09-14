'use client';

import { createTheme } from '@mui/material/styles';

const palette = {
	accentGold: '#D4AF37',
	background: '#F9FAFB',
  panel: '#FFFFFF',  // Active panel surface color
	textPrimary: '#1C1C1E',
	textSecondary: '#5F6368',
	border: '#E5E7EB',  // Slightly darker for better visibility
	error: '#EF4444',
	success: '#10B981',  // Added proper semantic colors
	warning: '#F59E0B',
	info: '#3B82F6',
};

// Create a custom Material-UI theme
export const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
        // Dark text on gold for WCAG AA contrast (light text on #D4AF37 is only ~2.1:1)
        contrastText: palette.textPrimary,
      },
      secondary: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
        contrastText: palette.textPrimary,
      },
      success: {
        main: palette.success,
        light: '#D1FAE5',
        dark: '#047857',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: palette.warning,
        light: '#FEF3C7',
        dark: '#B45309',
        contrastText: '#FFFFFF',
      },
      error: {
        main: palette.error,
        light: '#FEE2E2',
        dark: '#B91C1C',
        contrastText: '#FFFFFF',
      },
      info: {
        main: palette.info,
        light: '#DBEAFE',
        dark: '#1D4ED8',
        contrastText: '#FFFFFF',
      },
      grey: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: palette.textSecondary,
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: palette.textPrimary,
      },
      background: {
        default: palette.background,
        paper: palette.panel,  // Use panel for paper (cards, dialogs, etc.)
      },
      text: {
        primary: palette.textPrimary,
        secondary: palette.textSecondary,
      },
    },
  typography: {
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(var(--text-primary-rgb) / 0.05)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
  },
});

