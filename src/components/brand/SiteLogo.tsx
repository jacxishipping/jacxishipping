'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { siteBrandAssets } from '@/lib/site-branding';
import { useSiteBranding } from '@/hooks/useSiteBranding';

type SiteLogoVariant = 'header' | 'main' | 'dashboard';
type SiteLogoTheme = 'light' | 'dark';

type SiteLogoProps = {
  variant?: SiteLogoVariant;
  theme?: SiteLogoTheme;
  className?: string;
  priority?: boolean;
};

type SiteMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

const logoConfig: Record<SiteLogoVariant, { src: string; width: number; height: number; labelClassName: string; caption?: string }> = {
  header: {
    src: siteBrandAssets.headerLogo,
    width: 186,
    height: 56,
    labelClassName: 'text-sm font-bold uppercase tracking-[0.22em] sm:text-base',
  },
  main: {
    src: siteBrandAssets.mainLogo,
    width: 232,
    height: 108,
    labelClassName: 'text-2xl font-bold tracking-tight',
    caption: 'Vehicle Logistics',
  },
  dashboard: {
    src: siteBrandAssets.headerLogo,
    width: 132,
    height: 40,
    labelClassName: 'text-lg font-bold tracking-tight',
  },
};

function SiteMarkFallback({ size, className, label }: { size: number; className?: string; label?: string }) {
  const initial = (label?.trim() || 'J').charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-[var(--accent-gold)] font-extrabold text-[var(--background)] shadow-sm',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function SiteMark({ size = 40, className, priority = false }: SiteMarkProps) {
  const [hasError, setHasError] = useState(false);
  const { branding } = useSiteBranding();

  const markSrc = branding.faviconUrl || branding.logoUrl || siteBrandAssets.favicon;

  useEffect(() => {
    setHasError(false);
  }, [markSrc]);

  if (hasError) {
    return <SiteMarkFallback size={size} className={className} label={branding.companyName} />;
  }

  const isExternalOrSvg = markSrc.startsWith('http') || markSrc.endsWith('.svg') || markSrc.startsWith('data:');

  return (
    <Image
      src={markSrc}
      alt={`${branding.companyName || 'Jacxi Shipping'} icon`}
      width={size}
      height={size}
      priority={priority}
      unoptimized={isExternalOrSvg}
      className={cn('h-auto w-auto object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}

export default function SiteLogo({ variant = 'header', theme = 'light', className, priority = false }: SiteLogoProps) {
  const [hasError, setHasError] = useState(false);
  const { branding } = useSiteBranding();
  const config = logoConfig[variant];

  const activeSrc = useMemo(() => {
    if (variant === 'dashboard') {
      return branding.headerLogoUrl || branding.logoUrl || config.src;
    }
    if (variant === 'header') {
      return branding.headerLogoUrl || branding.logoUrl || config.src;
    }
    return branding.logoUrl || config.src;
  }, [branding.headerLogoUrl, branding.logoUrl, config.src, variant]);

  useEffect(() => {
    setHasError(false);
  }, [activeSrc]);

  const companyName = branding.companyName || 'JACXI SHIPPING';
  const companyTagline = branding.companyTagline !== undefined ? branding.companyTagline : (config.caption || '');

  const fallbackTextClassName = theme === 'dark' ? 'text-white' : 'text-[var(--text-primary)]';
  const fallbackSubtextClassName = theme === 'dark' ? 'text-slate-300' : 'text-[var(--text-secondary)]';

  const fallback = useMemo(() => {
    const markSize = variant === 'main' ? 48 : variant === 'dashboard' ? 32 : 40;

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <SiteMarkFallback size={markSize} label={companyName} />
        <div className="min-w-0">
          <div className={cn(config.labelClassName, fallbackTextClassName)}>{companyName}</div>
          {companyTagline ? <div className={cn('text-sm', fallbackSubtextClassName)}>{companyTagline}</div> : null}
        </div>
      </div>
    );
  }, [className, companyName, companyTagline, config.labelClassName, fallbackSubtextClassName, fallbackTextClassName, variant]);

  if (hasError) {
    return fallback;
  }

  const isExternalOrSvg = activeSrc.startsWith('http') || activeSrc.endsWith('.svg') || activeSrc.startsWith('data:');

  return (
    <Image
      src={activeSrc}
      alt={`${companyName} logo`}
      width={config.width}
      height={config.height}
      priority={priority}
      unoptimized={isExternalOrSvg}
      className={cn('h-auto w-auto max-w-full object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}