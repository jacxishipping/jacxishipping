'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Ship, Package, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import Tooltip from '@/components/design-system/Tooltip';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    icon: <Ship className="w-5 h-5" />,
    label: 'New Shipment',
    href: '/dashboard/shipments/new',
    color: '#3B82F6',
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: '#10B981',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: 'New Invoice',
    href: '/dashboard/invoices/new',
    color: '#F59E0B',
  },
];

/**
 * FloatingActionButton — native buttons + motion (was MUI Fab/Zoom).
 * Kept clear of the mobile bottom nav: bottom 80px on small screens,
 * 32px on lg+ (audit P2-06 — the FAB must not cover the nav's Menu item).
 */
export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAction = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Quick Actions */}
      <div className="fixed bottom-20 right-4 z-[1300] flex flex-col-reverse items-end gap-2 lg:bottom-8 lg:right-8">
        <AnimatePresence>
          {open &&
            quickActions.map((action, index) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center gap-3 justify-end"
              >
                <Tooltip title={action.label} placement="left">
                  <button
                    onClick={() => handleAction(action.href)}
                    className={cn(
                      'w-12 h-12 rounded-full shadow-lg transition-all duration-200',
                      'flex items-center justify-center text-white',
                      'hover:scale-110 active:scale-95',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-gold)]'
                    )}
                    style={{ backgroundColor: action.color }}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </Tooltip>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Main FAB */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: open ? 'var(--error)' : 'var(--accent-gold)' }}
        >
          {open ? (
            <X className="w-6 h-6 transition-transform duration-200 rotate-0" />
          ) : (
            <Plus className="w-6 h-6 transition-transform duration-200 rotate-0" />
          )}
        </button>
      </div>
    </>
  );
}
