'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { 
  Search, 
  FileText, 
  Package, 
  Ship, 
  Users, 
  Settings, 
  Home, 
  TrendingUp, 
  Car, 
  Compass, 
  CreditCard, 
  Truck, 
  PlusCircle, 
  Clock,
  Landmark,
  BookOpen,
  QrCode,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/design-system';

interface ShipmentSearchHit {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  status: string;
  user: { name: string | null; email: string };
}

interface ContainerSearchHit {
  id: string;
  containerNumber: string;
  vesselName: string | null;
  destinationPort: string | null;
  status: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [shipmentHits, setShipmentHits] = useState<ShipmentSearchHit[]>([]);
  const [containerHits, setContainerHits] = useState<ContainerSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Live multi-entity lookup (Shipments & Containers)
  useEffect(() => {
    if (!open) return;
    const term = search.trim().replace(/^>\s*/, '');
    if (term.length < 2) {
      setShipmentHits([]);
      setContainerHits([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [shipmentRes, containerRes] = await Promise.all([
          fetch(`/api/shipments?search=${encodeURIComponent(term)}&limit=5&page=1`).catch(() => null),
          fetch(`/api/containers?search=${encodeURIComponent(term)}&limit=5&page=1`).catch(() => null),
        ]);

        if (shipmentRes && shipmentRes.ok) {
          const data = await shipmentRes.json();
          if (!cancelled) setShipmentHits((data.shipments || []).slice(0, 5));
        }

        if (containerRes && containerRes.ok) {
          const data = await containerRes.json();
          if (!cancelled) setContainerHits((data.containers || []).slice(0, 5));
        }
      } catch {
        if (!cancelled) {
          setShipmentHits([]);
          setContainerHits([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setShipmentHits([]);
      setContainerHits([]);
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

  const isActionFilter = search.startsWith('>');

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Command.Dialog
        open={open}
        onOpenChange={onOpenChange}
        label="Global Command Menu"
        className={cn(
          'fixed top-[15%] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2',
          'bg-white border border-[var(--border,#E5E7EB)] rounded-xl shadow-2xl',
          'overflow-hidden text-[var(--text-primary,#111827)]'
        )}
      >
        <div className="flex items-center border-b border-[var(--border,#E5E7EB)] px-4 bg-[var(--background,#F9FAFB)]">
          <Search className="w-5 h-5 text-[var(--accent-gold,#D4AF37)] mr-3" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search VIN, container #, or type '>' for actions..."
            className="w-full bg-transparent py-3.5 text-sm sm:text-base text-[var(--text-primary,#111827)] placeholder:text-[var(--text-secondary,#6B7280)] outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-[var(--text-secondary,#6B7280)] bg-white border border-[var(--border,#E5E7EB)] rounded shadow-xs">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-[var(--text-secondary,#6B7280)]">
            {searching ? (
              <span className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-[var(--accent-gold,#D4AF37)]" />
                Searching entities...
              </span>
            ) : (
              'No matching records or actions found.'
            )}
          </Command.Empty>

          {/* Quick Actions (Always visible or when > typed) */}
          <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary,#6B7280)] uppercase tracking-wider">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/shipments/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <PlusCircle className="w-4 h-4 text-[var(--accent-gold,#D4AF37)]" />
              <span className="font-medium text-sm">Create New Shipment</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/containers/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm">New Container Booking</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/invoices/new'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Create Customer Invoice</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/record-payment'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-sm">Record Payment / Transaction</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/banking'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm">Import Bank CSV Statement</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/finance/ledger'))}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
            >
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span className="font-medium text-sm">Open General Ledger</span>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="h-px bg-[var(--border,#E5E7EB)] my-2" />

          {/* Container Search Hits */}
          {containerHits.length > 0 && !isActionFilter && (
            <>
              <Command.Group heading="Containers" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary,#6B7280)] uppercase tracking-wider">
                {containerHits.map((container) => (
                  <Command.Item
                    key={container.id}
                    onSelect={() => runCommand(() => router.push(`/dashboard/containers/${container.id}`))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Package className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-sm block truncate">
                          {container.containerNumber}
                        </span>
                        <span className="text-xs text-[var(--text-secondary,#6B7280)] block truncate">
                          {container.vesselName ? `Vessel: ${container.vesselName}` : 'No vessel'} · {container.destinationPort || 'Port TBD'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={container.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Separator className="h-px bg-[var(--border,#E5E7EB)] my-2" />
            </>
          )}

          {/* Shipment Search Hits */}
          {shipmentHits.length > 0 && !isActionFilter && (
            <>
              <Command.Group heading="Shipments & Cargo" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary,#6B7280)] uppercase tracking-wider">
                {shipmentHits.map((hit) => (
                  <Command.Item
                    key={hit.id}
                    onSelect={() => runCommand(() => router.push(`/dashboard/shipments/${hit.id}`))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Car className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block truncate">{vehicleLabel(hit)}</span>
                        <span className="text-xs text-[var(--text-secondary,#6B7280)] block truncate">
                          {hit.vehicleVIN ? <span className="font-mono font-medium">VIN: {hit.vehicleVIN} · </span> : ''}
                          {hit.user.name || hit.user.email}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={hit.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Separator className="h-px bg-[var(--border,#E5E7EB)] my-2" />
            </>
          )}

          {/* Core Navigation */}
          {!isActionFilter && (
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-bold text-[var(--text-secondary,#6B7280)] uppercase tracking-wider">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium text-sm">Dashboard Overview</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/shipments'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Ship className="w-4 h-4" />
                <span className="font-medium text-sm">Shipments</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/containers'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Package className="w-4 h-4" />
                <span className="font-medium text-sm">Containers</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/customers'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">Customers & Accounts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/transits'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Compass className="w-4 h-4" />
                <span className="font-medium text-sm">Transits & Locations</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/dispatches'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Truck className="w-4 h-4" />
                <span className="font-medium text-sm">Dispatches</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/invoices'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <FileText className="w-4 h-4" />
                <span className="font-medium text-sm">Invoices & Billing</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/finance/reports/aging'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-sm">Aging Schedule Report</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium text-sm">Analytics</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--background,#F9FAFB)] data-[selected=true]:bg-[var(--background,#F9FAFB)]"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium text-sm">Settings</span>
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-[var(--border,#E5E7EB)] px-4 py-2.5 text-xs text-[var(--text-secondary,#6B7280)] bg-[var(--background,#F9FAFB)] flex items-center justify-between">
          <span>Type <kbd className="px-1.5 py-0.5 bg-white border border-[var(--border,#E5E7EB)] rounded shadow-2xs font-mono">&gt;</kbd> for actions</span>
          <span>↑↓ Navigate · ↵ Select · ESC Close</span>
        </div>
      </Command.Dialog>
    </>
  );
}