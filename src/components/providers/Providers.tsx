'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SiteBrandingProvider } from './SiteBrandingProvider';
import { JxThemeSync } from './JxThemeSync';
import { Toaster } from 'sonner';
import { CommandPaletteProvider } from './CommandPaletteProvider';
import i18n from '@/lib/i18n';

import { JXThemeProvider } from '@jacxishippingorg/jx-ui-react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount) => {
              if (failureCount < 3) {
                return true;
              }
              return false;
            },
          },
        },
      })
  );

  return (
    <JXThemeProvider defaultMode="light" storageKey="jacxi-jxui-mode">
      <JxThemeSync />
      <SiteBrandingProvider>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <CommandPaletteProvider>
                {children}
                <Toaster 
                  position="top-right"
                  expand={false}
                  richColors
                  closeButton
                  theme="light"
                  toastOptions={{
                    style: {
                      background: 'var(--panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    },
                    className: 'toast-custom',
                  }}
                />
                {/* React Query Devtools — opt-in only (NEXT_PUBLIC_QUERY_DEVTOOLS=true).
                    Its floating button sits bottom-right over the mobile bottom nav and
                    over dashboard content (e.g. the Priority Work cards), so it must
                    not render in normal dev/prod runs. Enable it only while actively
                    debugging queries. */}
                {process.env.NEXT_PUBLIC_QUERY_DEVTOOLS === 'true' ? (
                  <ReactQueryDevtools initialIsOpen={false} />
                ) : null}
              </CommandPaletteProvider>
            </QueryClientProvider>
          </I18nextProvider>
        </SiteBrandingProvider>
    </JXThemeProvider>
  );
}