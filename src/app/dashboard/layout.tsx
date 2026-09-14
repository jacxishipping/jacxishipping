'use client';

import { useState, useRef, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import { KeyboardShortcutHelp } from '@/components/design-system';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Box } from '@mui/material';

import { CommandPaletteProvider } from '@/components/providers/CommandPaletteProvider';
import { LenisWrapperProvider, useLenisWrapper } from '@/components/providers/LenisWrapperProvider';
import { ConfirmActionProvider } from '@/components/ui/ConfirmActionProvider';

// Inner component that uses the Lenis wrapper
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const { registerWrapper, unregisterWrapper } = useLenisWrapper();

  // Register the main content area as the scroll container for Lenis
  useEffect(() => {
    if (mainContentRef.current) {
      registerWrapper(mainContentRef.current);
    }
    return () => unregisterWrapper();
  }, [registerWrapper, unregisterWrapper]);

  return (
    <Box
      className="dashboard-theme-light"
      sx={{
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

      {/* Content Area with Sidebar */}
      <Box
          sx={{
            display: 'flex',
            flexGrow: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
      >
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* Main Content - This is the scroll container for Lenis */}
        <Box
          ref={mainContentRef}
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            bgcolor: 'var(--background)',
            backgroundImage: 'none',
            overflow: 'auto',
            /* Hide scrollbar completely */
            '&::-webkit-scrollbar': {
              width: 0,
              height: 0,
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            pb: { xs: '68px', lg: 0 },
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Keyboard Shortcuts Help - Press ? key */}
      <KeyboardShortcutHelp />
    </Box>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ProtectedRoute>
        <CommandPaletteProvider>
          <LenisWrapperProvider>
            <ConfirmActionProvider>
              <DashboardLayoutInner>{children}</DashboardLayoutInner>
            </ConfirmActionProvider>
          </LenisWrapperProvider>
        </CommandPaletteProvider>
      </ProtectedRoute>
    </SessionProvider>
  );
}
