"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Ship,
  DollarSign,
  ExternalLink,
  User,
  CreditCard,
  Download,
  MessageSquare,
} from 'lucide-react';
import {
  Drawer,
  StatusBadge,
  Button,
  CopyButton,
  MilestoneStepper,
  type MilestoneStep,
  Skeleton,
} from '@/components/design-system';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';
import {
  CustomerNotificationModal,
  type CustomerNotificationPayload,
} from '@/components/dashboard/CustomerNotificationModal';
import { formatMoney as formatCurrency } from '@/lib/format';

interface ShipmentQuickPeekProps {
  shipmentId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ShipmentDetail {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  status: string;
  paymentStatus?: string;
  price: number;
  paidAmount?: number;
  createdAt: string;
  user?: {
    id?: string;
    name: string | null;
    email: string;
    phone?: string | null;
  };
  container?: {
    id: string;
    containerNumber: string;
    vesselName?: string | null;
    destinationPort?: string | null;
    estimatedArrival?: string | null;
    status?: string;
  } | null;
  dispatch?: {
    id: string;
    driverName?: string | null;
    status?: string | null;
    origin?: string | null;
  } | null;
}

const SHIPMENT_STEPS: MilestoneStep[] = [
  { id: 'ON_HAND', label: 'On Hand' },
  { id: 'DISPATCHING', label: 'Dispatching' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'AT_PORT', label: 'At Port' },
  { id: 'CUSTOMS', label: 'Customs' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export default function ShipmentQuickPeek({
  shipmentId,
  open,
  onClose,
}: ShipmentQuickPeekProps) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notificationPayload, setNotificationPayload] = useState<CustomerNotificationPayload | null>(null);

  useEffect(() => {
    if (!open || !shipmentId) {
      setShipment(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/shipments/${shipmentId}`);
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        if (!cancelled) {
          setShipment(data.shipment || data);
        }
      } catch (err) {
        console.error('Error loading shipment quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, shipmentId]);

  const vehicleTitle = shipment
    ? [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle Shipment'
    : 'Shipment Details';

  const remainingBalance = shipment ? Math.max(0, (shipment.price || 0) - (shipment.paidAmount || 0)) : 0;

  const handleOpenWhatsAppStudio = () => {
    if (!shipment) return;
    setNotificationPayload({
      shipmentId: shipment.id,
      customerName: shipment.user?.name || 'Customer',
      customerPhone: shipment.user?.phone || '',
      customerEmail: shipment.user?.email || '',
      vehicleDetails: vehicleTitle,
      vin: shipment.vehicleVIN || 'N/A',
      lotNumber: shipment.lotNumber || undefined,
      containerNumber: shipment.container?.containerNumber || 'PENDING',
      vesselName: shipment.container?.vesselName || undefined,
      portOfOrigin: shipment.dispatch?.origin || 'US Export Yard',
      destinationPort: shipment.container?.destinationPort || 'Destination Port',
      eta: shipment.container?.estimatedArrival
        ? new Date(shipment.container.estimatedArrival).toLocaleDateString()
        : 'On Schedule',
      balanceDue: remainingBalance,
      trackingLink: `${typeof window !== 'undefined' ? window.location.origin : 'https://www.jacxishipping.com'}/tracking?vin=${encodeURIComponent(shipment.vehicleVIN && shipment.vehicleVIN !== '-' ? shipment.vehicleVIN : shipment.id)}`,
    });
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        size="lg"
        title={
          shipment ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span className="font-bold tracking-tight text-base sm:text-lg">
                {vehicleTitle}
              </span>
            </div>
          ) : (
            'Shipment Details'
          )
        }
        description={
          shipment?.vehicleVIN ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px'}}>
              <span className="font-mono text-xs text-gray-500 font-semibold">
                VIN: {shipment.vehicleVIN}
              </span>
              <CopyButton value={shipment.vehicleVIN} label="VIN" />
            </div>
          ) : undefined
        }
        badge={shipment ? <StatusBadge status={shipment.status} /> : undefined}
        actions={
          shipment && (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', flexWrap: 'wrap'}}>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenWhatsAppStudio}
                  icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openUniversalShipmentExport({
                      shipmentIds: [shipment.id],
                      title: `Export Shipment (${shipment.vehicleVIN || shipment.id})`,
                    })
                  }
                  icon={<Download className="w-4 h-4 text-emerald-500" />}
                >
                  Export
                </Button>
                <Button
                  href={`/tracking?vin=${encodeURIComponent(shipment.vehicleVIN && shipment.vehicleVIN !== '-' ? shipment.vehicleVIN : shipment.id)}`}
                  variant="outline"
                  size="sm"
                  icon={<Ship className="w-4 h-4 text-[var(--accent-gold)]" />}
                >
                  Live Tracking
                </Button>
                <Button
                  href={`/dashboard/shipments/${shipment.id}`}
                  onClick={onClose}
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink className="w-4 h-4" />}
                >
                  Open Full View
                </Button>
              </div>
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
        ) : shipment ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            {/* Milestone Progression */}
            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <span style={{fontWeight: 700, color: 'var(--text-secondary, #6B7280)', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em'}} className="text-[0.75rem]">
                Milestone Progression
              </span>
              <MilestoneStepper
                steps={SHIPMENT_STEPS}
                currentStepId={shipment.status}
                orientation="horizontal"
              />
            </div>

            {/* Key Details Cards Grid */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
              {/* Customer */}
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <User className="w-4 h-4 text-blue-600" />
                    <span style={{fontWeight: 600}} className="text-[0.75rem]">
                      Customer
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenWhatsAppStudio}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    Notify
                  </button>
                </div>
                <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                  {shipment.user?.name || shipment.user?.email || 'Direct / Unassigned'}
                </p>
              </div>

              {/* Container Assignment */}
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <Package className="w-4 h-4 text-amber-600" />
                  <span style={{fontWeight: 600}} className="text-[0.75rem]">
                    Container
                  </span>
                </div>
                {shipment.container ? (
                  <>
                    <Link
                      href={`/dashboard/containers/${shipment.container.id}`}
                      onClick={onClose}
                      style={{ textDecoration: 'none' }}
                    >
                      <span className="font-mono font-bold text-sm text-[var(--accent-gold,#D4AF37)] hover:underline block truncate">
                        {shipment.container.containerNumber}
                      </span>
                    </Link>
                    {shipment.container.destinationPort && (
                      <p style={{whiteSpace: 'nowrap', fontSize: '0.72rem', color: 'var(--text-secondary, #6B7280)', marginTop: '2px'}} className="truncate">
                        {shipment.container.destinationPort}
                      </p>
                    )}
                    {shipment.container.estimatedArrival && (
                      <p style={{whiteSpace: 'nowrap', fontSize: '0.68rem', color: 'var(--text-secondary, #6B7280)'}} className="truncate">
                        ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary, #6B7280)'}}>
                    Unallocated
                  </p>
                )}
              </div>

              {/* Total Price */}
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span style={{fontWeight: 600}} className="text-[0.75rem]">
                    Total Price
                  </span>
                </div>
                <p style={{fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)'}}>
                  {formatCurrency(shipment.price || 0)}
                </p>
              </div>

              {/* Payment Status */}
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span style={{fontWeight: 600}} className="text-[0.75rem]">
                    Payment Status
                  </span>
                </div>
                <div style={{marginTop: '2px'}}>
                  <StatusBadge status={shipment.paymentStatus || 'PENDING'} size="sm" />
                </div>
              </div>
            </div>

            {/* Vehicle Metadata Box */}
            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--panel-bg, #FFFFFF)', border: '1px solid var(--border, #E5E7EB)', display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <p style={{fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                Vehicle Specifications
              </p>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
                <div>
                  <span className="text-xs text-gray-500 block">Color</span>
                  <span className="text-sm font-semibold text-gray-900">{shipment.vehicleColor || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Lot Number</span>
                  <span className="font-mono text-sm font-semibold text-gray-900">{shipment.lotNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Booking Date</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Outstanding Balance</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(remainingBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '32px', paddingBottom: '32px'}} className="text-[0.875rem]">
            No shipment selected.
          </p>
        )}
      </Drawer>

      {notificationPayload && (
        <CustomerNotificationModal
          open={Boolean(notificationPayload)}
          onClose={() => setNotificationPayload(null)}
          payload={notificationPayload}
        />
      )}
    </>
  );
}
