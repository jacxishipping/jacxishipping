'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import { KeyboardShortcutHelp } from '@/components/design-system';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

import { LenisWrapperProvider, useLenisWrapper } from '@/components/providers/LenisWrapperProvider';
import { ConfirmActionProvider } from '@/components/ui/ConfirmActionProvider';
import { KeyboardShortcutsModal } from '@/components/dashboard/KeyboardShortcutsModal';
import { WorkspaceTray } from '@/components/dashboard/WorkspaceTray';
import { UniversalShipmentExportModal } from '@/components/shipments/UniversalShipmentExportModal';

// Inner component that uses the Lenis wrapper
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const mainContentRef = useRef<HTMLElement>(null);
  const { registerWrapper, unregisterWrapper } = useLenisWrapper();

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Support mobile menu drawer events (e.g. from mobile bottom navigation)
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleOpen = () => setMobileOpen(true);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('toggle-mobile-menu', handleToggle);
    window.addEventListener('open-mobile-menu', handleOpen);
    window.addEventListener('close-mobile-menu', handleClose);

    return () => {
      window.removeEventListener('toggle-mobile-menu', handleToggle);
      window.removeEventListener('open-mobile-menu', handleOpen);
      window.removeEventListener('close-mobile-menu', handleClose);
    };
  }, []);

  // Register the main content area as the scroll container for Lenis
  useEffect(() => {
    if (mainContentRef.current) {
      registerWrapper(mainContentRef.current);
    }
    return () => unregisterWrapper();
  }, [registerWrapper, unregisterWrapper]);

  return (
    <JXBox
      padding="none"
      border={false}
      className="dashboard-surface-root flex h-[100vh] flex-col overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200 !rounded-none"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header */}
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

      {/* Content Area with Sidebar */}
      <JXBox
        padding="none"
        border={false}
        className="flex min-h-0 flex-1 overflow-hidden !rounded-none !bg-transparent"
        style={{ fontFamily: 'inherit' }}
      >
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        {/* Main Content - This is the scroll container for Lenis */}
        <main
          ref={mainContentRef}
          className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--background)] pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
          {children}
        </main>
      </JXBox>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Multitasking Workspace Tray */}
      <WorkspaceTray />

      {/* Global Keyboard Shortcuts Cheat Sheet - Press ? key */}
      <KeyboardShortcutsModal />

      {/* Universal Shipment Export Modal - Callable anywhere */}
      <UniversalShipmentExportModal />
    </JXBox>
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
        <LenisWrapperProvider>
          <ConfirmActionProvider>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
          </ConfirmActionProvider>
        </LenisWrapperProvider>
      </ProtectedRoute>
    </SessionProvider>
  );
}
