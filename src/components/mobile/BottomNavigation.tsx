'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Ship, Package, FileText, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { hasPermission, type Permission } from '@/lib/rbac';

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard', permission: 'dashboard:view' as Permission },
  { icon: Ship, label: 'Shipments', href: '/dashboard/shipments', permission: 'shipments:view' as Permission },
  { icon: Package, label: 'Containers', href: '/dashboard/containers', permission: 'containers:view' as Permission },
  { icon: FileText, label: 'Invoices', href: '/dashboard/invoices', permission: 'invoices:view' as Permission },
  { icon: Menu, label: 'Track', href: '/dashboard/tracking', permission: 'tracking:view' as Permission },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const visibleNavItems = navItems.filter((item) =>
    status === 'loading' || hasPermission(session?.user?.role, item.permission)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-inset-bottom"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(16px)',
        background: 'rgba(var(--panel-rgb), 0.92)',
        borderTop: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
      }}
    >
      <div className="flex items-center justify-around h-[68px] px-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 items-center justify-center h-full min-w-0 px-2 transition-all duration-200',
                'min-w-0 px-2',
                isActive
                  ? 'text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {isActive && (
                <div
                  className="absolute left-1/2 top-2 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={{
                    background: 'var(--accent-gold)',
                    boxShadow: '0 0 6px rgba(var(--accent-gold-rgb), 0.6)',
                  }}
                />
              )}
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  isActive && 'px-3 py-1'
                )}
                style={
                  isActive
                    ? {
                      background: 'rgba(var(--accent-gold-rgb), 0.12)',
                      borderRadius: '12px',
                      padding: '4px 12px',
                    }
                    : undefined
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className={cn(
                  'w-full truncate text-center text-xs font-medium',
                  isActive && 'text-[var(--accent-gold)]'
                )}>
                  {item.label}
                </span>
              </div>
              {isActive && (
                <div className="sr-only">Current section</div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
