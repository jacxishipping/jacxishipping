'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, Package, Ship, Users, Settings, Home, TrendingUp, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShipmentSearchHit {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  user: { name: string | null; email: string };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [shipmentHits, setShipmentHits] = useState<ShipmentSearchHit[]>([]);
  const [searchingShipments, setSearchingShipments] = useState(false);

  // Live shipment lookup: VIN / vehicle / customer. Works with as few as 3
  // characters so operators can jump by VIN or invoice reference quickly.
  useEffect(() => {
    if (!open) return;
    const term = search.trim();
    if (term.length < 3) {
      setShipmentHits([]);
      return;
    }

    let cancelled = false;
    setSearchingShipments(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/shipments?search=${encodeURIComponent(term)}&limit=6&page=1`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Search failed');
        if (!cancelled) {
          setShipmentHits((data.shipments || []).slice(0, 6) as ShipmentSearchHit[]);
        }
      } catch {
        if (!cancelled) setShipmentHits([]);
      } finally {
        if (!cancelled) setSearchingShipments(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setShipmentHits([]);
    }
  }, [open]);

  const vehicleLabel = (hit: ShipmentSearchHit) =>
    [hit.vehicleYear, hit.vehicleMake, hit.vehicleModel].filter(Boolean).join(' ').trim() || 'Vehicle';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Command.Dialog
        open={open}
        onOpenChange={onOpenChange}
        label="Global Command Menu"
        className={cn(
          'fixed top-[20%] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2',
          'bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-2xl',
          'overflow-hidden'
        )}
      >
        <div className="flex items-center border-b border-[var(--border)] px-4">
          <Search className="w-5 h-5 text-[var(--text-secondary)] mr-3" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="w-full bg-transparent py-4 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] rounded">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-[var(--text-secondary)]">
            {searchingShipments ? 'Searching shipments...' : 'No results found.'}
          </Command.Empty>

          {shipmentHits.length > 0 && (
            <>
              <Command.Group heading="Shipments" className="px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                {shipmentHits.map((hit) => (
                  <Command.Item
                    key={hit.id}
                    onSelect={() => runCommand(() => router.push(`/dashboard/shipments/${hit.id}`))}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
                  >
                    <Car className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{vehicleLabel(hit)}</span>
                      <span className="block truncate text-xs text-[var(--text-secondary)]">
                        {hit.vehicleVIN ? `VIN ${hit.vehicleVIN} · ` : ''}
                        {hit.user.name || hit.user.email}
                      </span>
                    </span>
                    <kbd className="px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] rounded">
                      open
                    </kbd>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Separator className="h-px bg-[var(--border)] my-2" />
            </>
          )}

          <Command.Group heading="Navigation" className="px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/shipments'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Ship className="w-4 h-4" />
              <span>Shipments</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/containers'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Package className="w-4 h-4" />
              <span>Containers</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/invoices'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <FileText className="w-4 h-4" />
              <span>Invoices</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="h-px bg-[var(--border)] my-2" />

          <Command.Group heading="Actions" className="px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/shipments/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Ship className="w-4 h-4" />
              <span>New Shipment</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/containers/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Package className="w-4 h-4" />
              <span>New Container</span>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="h-px bg-[var(--border)] my-2" />

          <Command.Group heading="Settings" className="px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/customers'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Users className="w-4 h-4" />
              <span>Customers</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/users'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Users className="w-4 h-4" />
              <span>Users</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] data-[selected=true]:bg-[var(--background)]"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-secondary)] flex items-center justify-between">
          <span>Press <kbd className="px-1.5 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded">⌘K</kbd> or <kbd className="px-1.5 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded">Ctrl+K</kbd> to open</span>
          <span>↑↓ Navigate · ↵ Select · ESC Close</span>
        </div>
      </Command.Dialog>
    </>
  );
}