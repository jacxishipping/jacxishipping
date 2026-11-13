"use client";

import { useState, useEffect } from 'react';
import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { Keyboard } from '@mui/icons-material';
import Modal from './Modal';
import { useKeyboardShortcut, ShortcutRegistry } from '@/lib/hooks/useKeyboardShortcut';

interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    key: string;
    description: string;
  }>;
}

const defaultShortcuts: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'Ctrl+K', description: 'Open search' },
      { key: 'Esc', description: 'Close dialog/modal' },
      { key: 'Ctrl+/', description: 'Toggle sidebar' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { key: 'G → D', description: 'Go to Dashboard' },
      { key: 'G → S', description: 'Go to Shipments' },
      { key: 'G → C', description: 'Go to Containers' },
      { key: 'G → V', description: 'Go to Vehicles' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { key: 'Ctrl+S', description: 'Save changes' },
      { key: 'Ctrl+N', description: 'Create new item' },
      { key: 'Ctrl+R', description: 'Refresh data' },
      { key: 'Delete', description: 'Delete selected item' },
    ],
  },
];

export default function KeyboardShortcutHelp() {
  const [open, setOpen] = useState(false);

  // Show help on ? key
  useKeyboardShortcut(
    { key: '?', shift: true },
    () => setOpen(true),
    { description: 'Show keyboard shortcuts' }
  );

  // Close on Escape
  useKeyboardShortcut(
    { key: 'Escape' },
    () => setOpen(false),
    { enabled: open }
  );

  // Listen for custom event from Header
  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    window.addEventListener('toggle-shortcut-help', handleToggle);
    return () => window.removeEventListener('toggle-shortcut-help', handleToggle);
  }, []);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <Keyboard sx={{ color: 'var(--accent-gold)' }} />
          <JXTypography variant="h3" className="!font-bold !text-[var(--text-primary)]">
            Keyboard Shortcuts
          </JXTypography>
        </div>
      }
      description="Global shortcuts are listed first, followed by any page-specific shortcuts currently registered."
    >
      <JXBox padding="none" border={false} className="flex flex-col gap-8 !rounded-none !bg-transparent" style={{ fontFamily: 'inherit' }}>
          {defaultShortcuts.map((category) => (
            <div key={category.name}>
              <JXTypography
                variant="caption"
                className="!mb-4 !block !text-[0.75rem] !font-bold !uppercase !tracking-[0.1em] !text-[var(--text-secondary)]"
              >
                {category.name}
              </JXTypography>
              <div className="flex flex-col gap-3">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2"
                  >
                    <JXTypography
                      variant="body"
                      className="!text-[0.875rem] !text-[var(--text-primary)]"
                    >
                      {shortcut.description}
                    </JXTypography>
                    <kbd
                      className="rounded-md px-3 py-1 font-mono text-[0.75rem] font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Dynamic shortcuts from registry */}
          {ShortcutRegistry.getAll().length > 0 && (
            <div>
              <JXTypography
                variant="caption"
                className="!mb-4 !block !text-[0.75rem] !font-bold !uppercase !tracking-[0.1em] !text-[var(--text-secondary)]"
              >
                Page Specific
              </JXTypography>
              <div className="flex flex-col gap-3">
                {ShortcutRegistry.getAll().map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-2"
                  >
                    <JXTypography
                      variant="body"
                      className="!text-[0.875rem] !text-[var(--text-primary)]"
                    >
                      {shortcut.description}
                    </JXTypography>
                    <kbd
                      className="rounded-md px-3 py-1 font-mono text-[0.75rem] font-semibold"
                      style={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {shortcut.formatted}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
      </JXBox>
    </Modal>
  );
}
