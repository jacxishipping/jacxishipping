"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { ChevronRight, Home } from '@mui/icons-material';

/**
 * Breadcrumbs Component
 * 
 * Automatic breadcrumb navigation based on current route.
 * Provides context and easy navigation to parent pages.
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]; // Manual override
  homeLabel?: string;
  showHome?: boolean;
  className?: string;
}

// Convert route segment to readable label
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let path = '';
  segments.forEach((segment, index) => {
    path += `/${segment}`;
    
    // Skip dynamic route segments like [id]
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return;
    }

    // Format label
    let label = formatSegment(segment);
    
    // Special cases
    if (segment === 'dashboard') label = 'Dashboard';
    if (segment === 'new') label = 'Create New';
    if (segment === 'edit') label = 'Edit';

    breadcrumbs.push({
      label,
      href: path,
    });
  });

  return breadcrumbs;
}

export default function Breadcrumbs({
  items,
  homeLabel = 'Home',
  showHome = true,
  className,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on home page
  if (pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  return (
    <JXBox
      component="nav"
      aria-label="breadcrumb"
      padding="none"
      border={false}
      className={["!bg-transparent flex flex-wrap items-center gap-1 py-1.5 px-0.5", className].filter(Boolean).join(" ")}
      style={{ fontFamily: 'inherit' }}
    >
      {/* Home link */}
      {showHome && (
        <>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <span className="inline-flex min-h-[28px] items-center gap-1 rounded-md px-2 py-1 transition-all duration-200 hover:bg-[rgba(var(--accent-gold-rgb),0.1)]">
              <Home sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
              <span className="text-[0.875rem] font-medium text-[var(--text-secondary)]">
                {homeLabel}
              </span>
            </span>
          </Link>
          <ChevronRight sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
        </>
      )}

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const itemKey = item.href ?? `${item.label}-${index}`;

        return (
          <div key={itemKey} className="flex items-center gap-1">
            {isLast || !item.href ? (
              <JXTypography
                variant="body"
                className="px-2 py-1 !text-[0.875rem] !font-semibold !text-[var(--text-primary)]"
              >
                {item.label}
              </JXTypography>
            ) : (
              <>
                <Link href={item.href} style={{ textDecoration: 'none' }}>
                  <span className="inline-flex min-h-[28px] items-center rounded-md px-2 py-1 text-[0.875rem] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:bg-[rgba(var(--accent-gold-rgb),0.1)] hover:text-[var(--accent-gold-text)]">
                    {item.label}
                  </span>
                </Link>
                <ChevronRight sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
              </>
            )}
          </div>
        );
      })}
    </JXBox>
  );
}

// Compact variant for mobile
export function BreadcrumbsCompact({ className }: { className?: string }) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  if (breadcrumbs.length === 0) return null;

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const parentPage = breadcrumbs[breadcrumbs.length - 2];

  return (
    <JXBox
      component="nav"
      aria-label="breadcrumb"
      padding="none"
      border={false}
      className={["!bg-transparent flex items-center gap-1 py-1", className].filter(Boolean).join(" ")}
      style={{ fontFamily: 'inherit' }}
    >
      {parentPage && (
        <>
          {parentPage.href ? (
            <Link href={parentPage.href} style={{ textDecoration: 'none' }}>
              <span className="text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-gold-text)]">
                {parentPage.label}
              </span>
            </Link>
          ) : (
            <span className="text-[0.8125rem] font-medium text-[var(--text-secondary)]">
              {parentPage.label}
            </span>
          )}
          <ChevronRight sx={{ fontSize: 14, color: 'var(--text-secondary)' }} />
        </>
      )}
      <JXTypography variant="body" className="!text-[0.8125rem] !font-semibold !text-[var(--text-primary)]">
        {currentPage.label}
      </JXTypography>
    </JXBox>
  );
}
