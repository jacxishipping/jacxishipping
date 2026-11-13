'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
  Ship,
  Truck,
  Clock,
  Calendar,
  FileText,
  Image as ImageIcon,
  Info,
  History,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Container,
  Phone,
  Mail,
  User,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge, Button, toast } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

interface ShipmentMobileDetailProps {
  shipment: Shipment;
  onRefresh?: () => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-[var(--background)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--accent-gold)]">{icon}</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--border)] pt-3">{children}</div>}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[var(--border)]/50 last:border-b-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {icon && <span className="shrink-0 text-[var(--text-secondary)]">{icon}</span>}
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-xs text-[var(--text-primary)] font-medium text-right ml-2">{value}</div>
    </div>
  );
}

export default function ShipmentMobileDetail({ shipment, onRefresh }: ShipmentMobileDetailProps) {
  const [copying, setCopying] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    } finally {
      setCopying(false);
    }
  };

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (['delivered', 'completed', 'paid'].includes(s)) return <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />;
    if (['in_transit', 'dispatched'].includes(s)) return <Truck className="h-4 w-4 text-[var(--info)]" />;
    if (['pending', 'on_hand'].includes(s)) return <Clock className="h-4 w-4 text-[var(--warning)]" />;
    if (['overdue', 'cancelled'].includes(s)) return <AlertCircle className="h-4 w-4 text-[var(--error)]" />;
    return <Package className="h-4 w-4 text-[var(--text-secondary)]" />;
  };

  const containerStatus = shipment.container?.status;
  const hasContainer = !!shipment.container;
  const hasDispatch = !!shipment.dispatch;
  const hasTransit = !!shipment.transit;
  const hasPhotos = (shipment.arrivalPhotos?.length || 0) > 0 || (shipment.departurePhotos?.length || 0) > 0;

  return (
    <div className="space-y-3 pb-8">
      {/* Back Navigation */}
      <Link
        href="/dashboard/shipments"
        className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Shipments
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--background)] p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-[var(--text-primary)] truncate">
              {shipment.vehicleVIN || `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Shipment'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Created {formatDate(shipment.createdAt)}
            </p>
          </div>
          <StatusBadge status={shipment.status} size="md" />
        </div>

        {/* Quick Info Chips */}
        <div className="flex flex-wrap gap-1.5">
          {shipment.vehicleVIN && (
            <button
              onClick={() => copyToClipboard(shipment.vehicleVIN!, 'VIN')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] active:bg-[var(--panel)]"
            >
              <Copy className="h-3 w-3" />
              {shipment.vehicleVIN}
            </button>
          )}
          {shipment.container?.containerNumber && (
            <button
              onClick={() => copyToClipboard(shipment.container!.containerNumber!, 'Container')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] active:bg-[var(--panel)]"
            >
              <Container className="h-3 w-3" />
              {shipment.container.containerNumber}
            </button>
          )}
          {shipment.lotNumber && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
              Lot #{shipment.lotNumber}
            </span>
          )}
        </div>
      </div>

      {/* Status & Progress */}
      <CollapsibleSection title="Status & Progress" icon={<Info className="h-4 w-4" />} defaultOpen>
        <DetailRow label="Shipment Status" value={formatStatus(shipment.status)} icon={statusIcon(shipment.status)} />
        {containerStatus && (
          <DetailRow label="Container Status" value={formatStatus(containerStatus)} icon={statusIcon(containerStatus)} />
        )}
        {shipment.price != null && (
          <DetailRow
            label="Price"
            value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(shipment.price)}
          />
        )}
        {shipment.insuranceValue != null && (
          <DetailRow
            label="Insurance"
            value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(shipment.insuranceValue)}
          />
        )}
        {shipment.paymentStatus && (
          <DetailRow label="Payment" value={formatStatus(shipment.paymentStatus)} />
        )}
        {shipment.serviceType && (
          <DetailRow label="Service" value={formatStatus(shipment.serviceType)} />
        )}
      </CollapsibleSection>

      {/* Vehicle Details */}
      <CollapsibleSection title="Vehicle Details" icon={<Package className="h-4 w-4" />}>
        {shipment.vehicleMake && <DetailRow label="Make" value={shipment.vehicleMake} />}
        {shipment.vehicleModel && <DetailRow label="Model" value={shipment.vehicleModel} />}
        {shipment.vehicleYear && <DetailRow label="Year" value={String(shipment.vehicleYear)} />}
        {shipment.vehicleVIN && (
          <DetailRow
            label="VIN"
            value={
              <button
                onClick={() => copyToClipboard(shipment.vehicleVIN!, 'VIN')}
                className="inline-flex items-center gap-1 text-[var(--accent-gold)] hover:underline"
              >
                {shipment.vehicleVIN}
                <Copy className="h-3 w-3" />
              </button>
            }
          />
        )}
        {shipment.vehicleColor && <DetailRow label="Color" value={shipment.vehicleColor} />}
        {shipment.vehicleType && <DetailRow label="Type" value={formatStatus(shipment.vehicleType)} />}
        {shipment.auctionName && <DetailRow label="Auction" value={shipment.auctionName} />}
        {shipment.lotNumber && <DetailRow label="Lot Number" value={shipment.lotNumber} />}
        {shipment.hasKey != null && <DetailRow label="Has Key" value={shipment.hasKey ? 'Yes' : 'No'} />}
        {shipment.hasTitle != null && <DetailRow label="Has Title" value={shipment.hasTitle ? 'Yes' : 'No'} />}
        {shipment.titleStatus && <DetailRow label="Title Status" value={formatStatus(shipment.titleStatus)} />}
      </CollapsibleSection>

      {/* Route & Location */}
      {(shipment.origin || shipment.destination || hasContainer) && (
        <CollapsibleSection title="Route & Location" icon={<MapPin className="h-4 w-4" />}>
          {shipment.origin && <DetailRow label="Origin" value={shipment.origin} icon={<MapPin className="h-3.5 w-3.5" />} />}
          {shipment.destination && <DetailRow label="Destination" value={shipment.destination} icon={<MapPin className="h-3.5 w-3.5" />} />}
          {shipment.container?.loadingPort && (
            <DetailRow label="Loading Port" value={shipment.container.loadingPort} icon={<Ship className="h-3.5 w-3.5" />} />
          )}
          {shipment.container?.destinationPort && (
            <DetailRow label="Destination Port" value={shipment.container.destinationPort} icon={<Ship className="h-3.5 w-3.5" />} />
          )}
          {shipment.currentLocation && (
            <DetailRow label="Current Location" value={shipment.currentLocation} icon={<MapPin className="h-3.5 w-3.5" />} />
          )}
        </CollapsibleSection>
      )}

      {/* Timeline / Dates */}
      <CollapsibleSection title="Timeline" icon={<History className="h-4 w-4" />}>
        <DetailRow label="Created" value={formatDate(shipment.createdAt)} icon={<Calendar className="h-3.5 w-3.5" />} />
        {shipment.updatedAt && (
          <DetailRow label="Last Updated" value={formatDate(shipment.updatedAt)} icon={<Clock className="h-3.5 w-3.5" />} />
        )}
        {shipment.estimatedDeliveryDate && (
          <DetailRow label="Est. Delivery" value={formatDate(shipment.estimatedDeliveryDate)} icon={<Calendar className="h-3.5 w-3.5" />} />
        )}
        {shipment.actualDeliveryDate && (
          <DetailRow label="Actual Delivery" value={formatDate(shipment.actualDeliveryDate)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        )}
        {shipment.releaseTokenCreatedAt && (
          <DetailRow label="Release Token" value={formatDate(shipment.releaseTokenCreatedAt)} icon={<FileText className="h-3.5 w-3.5" />} />
        )}
      </CollapsibleSection>

      {/* Customer Info */}
      {shipment.user && (
        <CollapsibleSection title="Customer" icon={<User className="h-4 w-4" />}>
          {shipment.user.name && <DetailRow label="Name" value={shipment.user.name} icon={<User className="h-3.5 w-3.5" />} />}
          {shipment.user.email && (
            <DetailRow
              label="Email"
              value={
                <a href={`mailto:${shipment.user.email}`} className="text-[var(--accent-gold)] hover:underline">
                  {shipment.user.email}
                </a>
              }
              icon={<Mail className="h-3.5 w-3.5" />}
            />
          )}
          {shipment.user.phone && (
            <DetailRow
              label="Phone"
              value={
                <a href={`tel:${shipment.user.phone}`} className="text-[var(--accent-gold)] hover:underline">
                  {shipment.user.phone}
                </a>
              }
              icon={<Phone className="h-3.5 w-3.5" />}
            />
          )}
        </CollapsibleSection>
      )}

      {/* Dispatch / Transit / Container */}
      {hasDispatch && (
        <CollapsibleSection title="Dispatch" icon={<Truck className="h-4 w-4" />}>
          {shipment.dispatch?.referenceNumber && (
            <DetailRow label="Reference" value={shipment.dispatch.referenceNumber} />
          )}
          {shipment.dispatch?.origin && <DetailRow label="Origin" value={shipment.dispatch.origin} />}
          {shipment.dispatch?.destination && <DetailRow label="Destination" value={shipment.dispatch.destination} />}
          {shipment.dispatch?.status && <DetailRow label="Status" value={formatStatus(shipment.dispatch.status)} />}
        </CollapsibleSection>
      )}

      {hasTransit && (
        <CollapsibleSection title="Transit" icon={<Ship className="h-4 w-4" />}>
          {shipment.transit?.referenceNumber && (
            <DetailRow label="Reference" value={shipment.transit.referenceNumber} />
          )}
          {shipment.transit?.status && <DetailRow label="Status" value={formatStatus(shipment.transit.status)} />}
        </CollapsibleSection>
      )}

      {hasContainer && (
        <CollapsibleSection title="Container" icon={<Container className="h-4 w-4" />}>
          {shipment.container?.containerNumber && (
            <DetailRow
              label="Number"
              value={
                <button
                  onClick={() => copyToClipboard(shipment.container!.containerNumber!, 'Container')}
                  className="inline-flex items-center gap-1 text-[var(--accent-gold)] hover:underline"
                >
                  {shipment.container.containerNumber}
                  <Copy className="h-3 w-3" />
                </button>
              }
            />
          )}
          {shipment.container?.status && <DetailRow label="Status" value={formatStatus(shipment.container.status)} />}
          {shipment.container?.loadingPort && <DetailRow label="Loading Port" value={shipment.container.loadingPort} />}
          {shipment.container?.destinationPort && <DetailRow label="Destination Port" value={shipment.container.destinationPort} />}
        </CollapsibleSection>
      )}

      {/* Photos */}
      {hasPhotos && (
        <CollapsibleSection title="Photos" icon={<ImageIcon className="h-4 w-4" />}>
          {shipment.departurePhotos && shipment.departurePhotos.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Departure ({shipment.departurePhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {shipment.departurePhotos.map((url, idx) => (
                  <a
                    key={`dep-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--background)]"
                  >
                    <img
                      src={url}
                      alt={`Departure photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {shipment.arrivalPhotos && shipment.arrivalPhotos.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Arrival ({shipment.arrivalPhotos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {shipment.arrivalPhotos.map((url, idx) => (
                  <a
                    key={`arr-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--background)]"
                  >
                    <img
                      src={url}
                      alt={`Arrival photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Documents */}
      {shipment.documents && shipment.documents.length > 0 && (
        <CollapsibleSection title="Documents" icon={<FileText className="h-4 w-4" />}>
          {shipment.documents.map((doc, idx) => (
            <a
              key={idx}
              href={typeof doc === 'string' ? doc : (doc as { url?: string })?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] mb-2 last:mb-0 active:bg-[var(--panel)] transition-colors"
            >
              <FileText className="h-4 w-4 text-[var(--accent-gold)] shrink-0" />
              <span className="text-xs text-[var(--text-primary)] flex-1 truncate">
                {typeof doc === 'string' ? doc.split('/').pop() || 'Document' : (doc as { name?: string })?.name || 'Document'}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
            </a>
          ))}
        </CollapsibleSection>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard/shipments/${shipment.id}?tab=overview`}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <Info className="h-5 w-5 text-[var(--info)]" />
            <span className="text-xs text-[var(--text-primary)]">Full Details</span>
          </Link>
          <Link
            href={`/dashboard/shipments/${shipment.id}?tab=map`}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <MapPin className="h-5 w-5 text-[var(--accent-gold)]" />
            <span className="text-xs text-[var(--text-primary)]">Live Map</span>
          </Link>
          <Link
            href={`/dashboard/shipments/${shipment.id}?tab=timeline`}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <History className="h-5 w-5 text-[var(--warning)]" />
            <span className="text-xs text-[var(--text-primary)]">Timeline</span>
          </Link>
          <Link
            href={`/dashboard/shipments/${shipment.id}?tab=photos`}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <ImageIcon className="h-5 w-5 text-[var(--success)]" />
            <span className="text-xs text-[var(--text-primary)]">Photos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
