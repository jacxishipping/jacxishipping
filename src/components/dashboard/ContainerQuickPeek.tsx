"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Ship, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { 
  Drawer, 
  StatusBadge, 
  Button, 
  CopyButton, 
  MilestoneStepper, 
  type MilestoneStep,
  Skeleton
} from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';

interface ContainerQuickPeekProps {
  containerId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ContainerDetail {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  shippingLine: string | null;
  destinationPort: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
    price: number;
    user?: { name: string | null; email: string };
  }>;
  _count?: {
    shipments: number;
    expenses: number;
    invoices: number;
  };
}

const CONTAINER_STEPS: MilestoneStep[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'LOADED', label: 'Loaded' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'CUSTOMS', label: 'Customs' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export default function ContainerQuickPeek({
  containerId,
  open,
  onClose,
}: ContainerQuickPeekProps) {
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !containerId) {
      setContainer(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/containers/${containerId}`);
        if (!res.ok) throw new Error('Failed to load container');
        const data = await res.json();
        if (!cancelled) {
          setContainer(data.container || data);
        }
      } catch (err) {
        console.error('Error loading container quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, containerId]);

  const capacityPercent = container && container.maxCapacity > 0
    ? Math.min(100, Math.round((container.currentCount / container.maxCapacity) * 100))
    : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        container ? (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {container.containerNumber}
            </span>
            <CopyButton value={container.containerNumber} label="Container Number" />
          </div>
        ) : (
          'Container Details'
        )
      }
      description={container?.shippingLine ? `${container.shippingLine} • ${container.destinationPort || 'Port TBD'}` : undefined}
      badge={container ? <StatusBadge status={container.status} /> : undefined}
      actions={
        container && (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              href={`/dashboard/containers/${container.id}`}
              onClick={onClose}
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Open Full View
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </div>
      ) : container ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
          {/* Milestone Stepper */}
          <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
            <span style={{fontWeight: 700, color: 'var(--text-secondary, #6B7280)', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em'}} className="text-[0.75rem]">
              Milestone Progression
            </span>
            <MilestoneStepper
              steps={CONTAINER_STEPS}
              currentStepId={container.status}
              orientation="horizontal"
            />
          </div>

          {/* Capacity Progress Bar */}
          <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--panel-bg, #FFFFFF)', border: '1px solid var(--border, #E5E7EB)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <p style={{fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #6B7280)'}}>
                Cargo Loading Capacity
              </p>
              <p style={{fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #111827)'}}>
                {container.currentCount} / {container.maxCapacity} ({capacityPercent}%)
              </p>
            </div>
            <div style={{height: 8, borderRadius: '32px', backgroundColor: 'var(--background, #F3F4F6)'}} className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" role="progressbar" aria-valuenow={capacityPercent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{ width: `${capacityPercent}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <Ship className="w-4 h-4 text-amber-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">Vessel</span>
              </div>
              <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                {container.vesselName || 'Unassigned'}
              </p>
            </div>

            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">Destination Port</span>
              </div>
              <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                {container.destinationPort || 'TBD'}
              </p>
            </div>

            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <Calendar className="w-4 h-4 text-blue-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">ETA</span>
              </div>
              <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                {container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'Pending'}
              </p>
            </div>

            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <Layers className="w-4 h-4 text-purple-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">Manifest Items</span>
              </div>
              <p style={{fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}}>
                {container._count?.shipments ?? container.shipments?.length ?? 0} Vehicles
              </p>
            </div>
          </div>

          {/* Manifest Preview List */}
          {container.shipments && container.shipments.length > 0 && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary, #111827)'}}>
                  Loaded Cargo Manifest ({container.shipments.length})
                </p>
                <Link
                  href={`/dashboard/containers/${container.id}?tab=cargo`}
                  onClick={onClose}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-gold, #D4AF37)', fontWeight: 600, textDecoration: 'none' }}
                >
                  View All &rarr;
                </Link>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 220, overflowY: 'auto'}}>
                {container.shipments.map((shipment) => (
                  <div key={shipment.id} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--border, #E5E7EB)', backgroundColor: 'var(--background, #F9FAFB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 150ms ease'}}>
                    <div style={{minWidth: 0}}>
                      <p style={{whiteSpace: 'nowrap', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #111827)'}} className="truncate">
                        {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                      </p>
                      {shipment.vehicleVIN && (
                        <span className="font-mono text-xs text-gray-500 tracking-tight">
                          VIN: {shipment.vehicleVIN}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={shipment.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '32px', paddingBottom: '32px'}} className="text-[0.875rem]">
          No container selected.
        </p>
      )}
    </Drawer>
  );
}
