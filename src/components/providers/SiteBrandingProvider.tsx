'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_SITE_BRANDING, type SiteBrandingConfig } from '@/lib/site-branding';

interface SiteBrandingContextValue {
  branding: SiteBrandingConfig;
  isLoading: boolean;
  updateBranding: (updates: Partial<SiteBrandingConfig>) => Promise<SiteBrandingConfig>;
  resetBranding: () => Promise<SiteBrandingConfig>;
  uploadLogo: (file: File) => Promise<string>;
  refreshBranding: () => Promise<void>;
}

const SiteBrandingContext = createContext<SiteBrandingContextValue | undefined>(undefined);

const BRANDING_STORAGE_KEY = 'jacxi_site_branding_cache';
const BRANDING_UPDATE_EVENT = 'site-branding-updated';

export function SiteBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<SiteBrandingConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(BRANDING_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return { ...DEFAULT_SITE_BRANDING, ...parsed };
        }
      } catch {
        // Fall back to default
      }
    }
    return DEFAULT_SITE_BRANDING;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/branding', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.branding) {
          setBranding(data.branding);
          try {
            localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(data.branding));
          } catch {
            // LocalStorage quota or unavailable
          }
        }
      }
    } catch (err) {
      console.warn('Unable to load site branding configuration:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBranding();

    const handleBrandingUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<SiteBrandingConfig>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
      } else {
        void fetchBranding();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BRANDING_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBranding(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener(BRANDING_UPDATE_EVENT, handleBrandingUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(BRANDING_UPDATE_EVENT, handleBrandingUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchBranding]);

  const updateBranding = useCallback(async (updates: Partial<SiteBrandingConfig>): Promise<SiteBrandingConfig> => {
    const res = await fetch('/api/settings/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update branding');
    }

    const nextBranding = data.branding as SiteBrandingConfig;
    setBranding(nextBranding);
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(nextBranding));
    } catch {
      // Ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATE_EVENT, { detail: nextBranding }));
    }

    return nextBranding;
  }, []);

  const resetBranding = useCallback(async (): Promise<SiteBrandingConfig> => {
    const res = await fetch('/api/settings/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset branding');
    }

    const reset = data.branding as SiteBrandingConfig;
    setBranding(reset);
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(reset));
    } catch {
      // Ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATE_EVENT, { detail: reset }));
    }

    return reset;
  }, []);

  const uploadLogo = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/settings/branding/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to upload logo');
    }

    return data.url as string;
  }, []);

  return (
    <SiteBrandingContext.Provider
      value={{
        branding,
        isLoading,
        updateBranding,
        resetBranding,
        uploadLogo,
        refreshBranding: fetchBranding,
      }}
    >
      {children}
    </SiteBrandingContext.Provider>
  );
}

export function useSiteBranding() {
  const context = useContext(SiteBrandingContext);
  if (!context) {
    // Provide safe fallback if component is rendered outside provider
    return {
      branding: DEFAULT_SITE_BRANDING,
      isLoading: false,
      updateBranding: async () => DEFAULT_SITE_BRANDING,
      resetBranding: async () => DEFAULT_SITE_BRANDING,
      uploadLogo: async () => '',
      refreshBranding: async () => {},
    };
  }
  return context;
}
