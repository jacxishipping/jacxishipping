'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PaymentStatusBadge, toast } from '@/components/design-system';
import { FileText as DescriptionOutlinedIcon, Package as Inventory2OutlinedIcon, User as PersonOutlineIcon, MapPin as LocationOnOutlinedIcon, Truck as LocalShippingOutlinedIcon, Wallet as AccountBalanceWalletOutlinedIcon, Clock as ScheduleOutlinedIcon } from 'lucide-react';

type ShipmentDetailResponse = {
  portal: { id: string; name: string; code: string | null; requireCustomerLinkForReady?: boolean; defaultShipmentNotes?: string | null };
  assignment: {
    id: string;
    notes: string | null;
    noteSource?: 'MANUAL' | 'PORTAL_DEFAULT' | null;
    assignedAt: string;
    linkedAt: string | null;
    partnerCustomer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      city: string | null;
      country: string | null;
    } | null;
    shipment: {
      id: string;
      serviceType: string;
      vehicleType: string;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleYear: number | null;
      vehicleVIN: string | null;
      vehicleColor: string | null;
      lotNumber: string | null;
      auctionName: string | null;
      hasKey: boolean | null;
      hasTitle: boolean | null;
      status: string;
      paymentStatus: string;
      createdAt: string;
      updatedAt: string;
      vehiclePhotos: string[];
      arrivalPhotos: string[];
      documents: Array<{
        id: string;
        name: string;
        description: string | null;
        fileUrl: string;
        category: string;
      }>;
      dispatch: {
        referenceNumber: string;
        origin: string;
        destination: string;
        status: string;
        dispatchDate: string | null;
        events: Array<{
          id: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
        }>;
      } | null;
      transit: {
        referenceNumber: string;
        origin: string;
        destination: string;
        status: string;
        estimatedDelivery: string | null;
        actualDelivery: string | null;
        events: Array<{
          id: string;
          origin: string;
          destination: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
        }>;
      } | null;
      container: {
        containerNumber: string;
        trackingNumber: string | null;
        vesselName: string | null;
        voyageNumber: string | null;
        loadingPort: string | null;
        destinationPort: string | null;
        estimatedArrival: string | null;
        actualArrival: string | null;
        currentLocation: string | null;
        progress: number | null;
        status: string;
        trackingEvents: Array<{
          id: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
          completed: boolean;
        }>;
      } | null;
    };
  };
  customerTracking: {
    currentStageLabel: string;
    summary: string;
    progressPercent: number;
    milestones: Array<{
      key: string;
      label: string;
      description: string;
      state: 'pending' | 'current' | 'complete';
      timestamp?: string;
    }>;
  };
  history: Array<{
    id: string;
    source: string;
    title: string;
    location: string | null;
    description: string | null;
    occurredAt: string;
  }>;
  portalFinance: {
    status: 'PENDING' | 'PARTIAL' | 'PAID';
    balance: number;
    debitAmount: number;
    paidAmount: number;
    ledgerEntryCount: number;
    paymentRecordCount: number;
    recentLedgerEntries: Array<{
      id: string;
      transactionDate: string;
      description: string;
      type: 'DEBIT' | 'CREDIT';
      amount: number;
      balance: number;
      paymentMethod: string | null;
      reference: string | null;
      notes: string | null;
    }>;
    recentPayments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      reference: string | null;
      notes: string | null;
    }>;
  };
};

export default function PortalShipmentDetailPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const shipmentId = String(params.shipmentId || '');
  const [data, setData] = useState<ShipmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load shipment detail');
        }

        setData(payload);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to load shipment detail');
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [portalId, shipmentId]);

  if (loading) {
    return (
      <DashboardSurface>
        <DashboardPanel title="Shipment Detail">
          <div style={{ color: 'var(--text-secondary)' }}>Loading shipment detail...</div>
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  if (!data) {
    return (
      <DashboardSurface>
        <DashboardPanel title="Shipment Detail">
          <EmptyState icon={<Inventory2OutlinedIcon />} title="Shipment unavailable" description="This assigned shipment could not be loaded." />
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  const shipment = data.assignment.shipment;
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
  const isReadyForPartnerHandling = data.portal.requireCustomerLinkForReady === false || Boolean(data.assignment.partnerCustomer);
  const noteSourceLabel = data.assignment.noteSource === 'PORTAL_DEFAULT'
    ? 'Inherited from portal default'
    : data.assignment.noteSource === 'MANUAL'
      ? 'Manual assignment note'
      : 'No assignment note';

  return (
    <DashboardSurface>
      <DashboardPanel
        title={vehicleLabel}
        description={`${data.portal.name} shipment workspace`}
        actions={
          <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Back to Shipments</Button>
          </Link>
        }
      >
        <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2" style={{ display: 'grid', gap: 16 }}>
            <DashboardPanel title="Shipment Overview" description={data.customerTracking.summary}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <p style={{ fontWeight: 700 }}>{data.customerTracking.currentStageLabel}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Status: {shipment.status}</p>
                </div>
                <div style={{ height: 8, borderRadius: 7992, backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.customerTracking.progressPercent}%`, backgroundColor: 'var(--accent-gold)' }} />
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {data.customerTracking.milestones.map((milestone) => (
                    <div key={milestone.key} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, backgroundColor: 'var(--panel)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600 }}>{milestone.label}</p>
                        <p style={{ color: milestone.state === 'complete' ? 'var(--success)' : milestone.state === 'current' ? 'var(--accent-gold)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {milestone.state}
                        </p>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{milestone.description}</p>
                      {milestone.timestamp ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
                          {new Date(milestone.timestamp).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Status History" description="Customer-facing movement updates">
              {data.history.length === 0 ? (
                <EmptyState icon={<Inventory2OutlinedIcon />} title="No status history" description="No movement updates are available yet." />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {data.history.map((item) => (
                    <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600 }}>{item.title}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(item.occurredAt).toLocaleString()}</p>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>{item.source}</p>
                      {item.location ? <p style={{ marginTop: 8 }}>Location: {item.location}</p> : null}
                      {item.description ? <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{item.description}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>

            {shipment.dispatch?.events && shipment.dispatch.events.length > 0 ? (
              <DashboardPanel title="Dispatch Events" description="Internal dispatch movement updates">
                <div style={{ display: 'grid', gap: 12 }}>
                  {shipment.dispatch.events.map((event) => (
                    <div key={event.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600 }}>{event.status}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(event.eventDate).toLocaleString()}</p>
                      </div>
                      {event.location ? <p style={{ marginTop: 4 }}><LocationOnOutlinedIcon size={14} style={{ marginRight: 4.0, color: 'var(--text-secondary)' }}/>{event.location}</p> : null}
                      {event.description ? <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{event.description}</p> : null}
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            ) : null}

            {shipment.container?.trackingEvents && shipment.container.trackingEvents.length > 0 ? (
              <DashboardPanel title="Container Tracking" description="Container-level tracking events">
                <div style={{ display: 'grid', gap: 12 }}>
                  {shipment.container.trackingEvents.map((event) => (
                    <div key={event.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: event.completed ? 'var(--success)' : 'var(--accent-gold)' }} />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase' }}>
                          {event.completed ? 'Done' : 'Pending'}
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 600 }}>{event.status}</p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(event.eventDate).toLocaleString()}</p>
                        </div>
                        {event.location ? <p style={{ marginTop: 4 }}><LocationOnOutlinedIcon size={14} style={{ marginRight: 4.0, color: 'var(--text-secondary)' }}/>{event.location}</p> : null}
                        {event.description ? <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{event.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            ) : null}

            <DashboardPanel title="Documents" description="Public shipment documents shared to the portal">
              {shipment.documents.length === 0 ? (
                <EmptyState icon={<DescriptionOutlinedIcon />} title="No public documents" description="No public documents have been shared for this shipment yet." />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {shipment.documents.map((document) => (
                    <div key={document.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{document.name}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {document.category} • {document.description || 'Shared file'}
                        </p>
                      </div>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" size="sm">Open</Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <DashboardPanel title="Vehicle Info">
              <div style={{ display: 'grid', gap: 12 }}>
                {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {shipment.vehiclePhotos.slice(0, 3).map((photoUrl, index) => (
                      <a key={`vehicle-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <img src={photoUrl} alt={`Vehicle photo ${index + 1}`} style={{ width: 80, height: 80, borderRadius: 16, border: '1px solid var(--border)', objectFit: 'cover' }} />
                      </a>
                    ))}
                    {shipment.arrivalPhotos.slice(0, 2).map((photoUrl, index) => (
                      <a key={`arrival-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <img src={photoUrl} alt={`Arrival photo ${index + 1}`} style={{ width: 80, height: 80, borderRadius: 16, border: '1px solid var(--border)', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                ) : null}
                <p><strong>VIN:</strong> {shipment.vehicleVIN || '—'}</p>
                <p><strong>Color:</strong> {shipment.vehicleColor || '—'}</p>
                <p><strong>Lot:</strong> {shipment.lotNumber || '—'}</p>
                <p><strong>Auction:</strong> {shipment.auctionName || '—'}</p>
                <p><strong>Has Key:</strong> {shipment.hasKey == null ? '—' : shipment.hasKey ? 'Yes' : 'No'}</p>
                <p><strong>Has Title:</strong> {shipment.hasTitle == null ? '—' : shipment.hasTitle ? 'Yes' : 'No'}</p>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Portal Customer">
              {data.assignment.partnerCustomer ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <p style={{ fontWeight: 700 }}>{data.assignment.partnerCustomer.name}</p>
                  <p>{data.assignment.partnerCustomer.email || 'No email'}</p>
                  <p>{data.assignment.partnerCustomer.phone || 'No phone'}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{[data.assignment.partnerCustomer.city, data.assignment.partnerCustomer.country].filter(Boolean).join(', ') || 'No location'}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12, alignItems: 'center' }}>
                  <EmptyState icon={<PersonOutlineIcon />} title="No linked portal customer" description="This shipment has not been linked to one of your portal customers yet." />
                  <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Link a Customer</Button>
                  </Link>
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel title="Portal Readiness">
              <div style={{ display: 'grid', gap: 8 }}>
                <p style={{ fontWeight: 700, color: isReadyForPartnerHandling ? 'var(--success)' : '#b45309' }}>
                  {isReadyForPartnerHandling ? 'Ready for partner handling' : 'Waiting for customer link'}
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {data.portal.requireCustomerLinkForReady === false
                    ? 'This portal allows shipments to be treated as ready even before a portal customer is linked.'
                    : 'This portal requires a linked portal customer before staff should treat the shipment as ready.'}
                </p>
                {data.assignment.notes ? (
                  <div style={{ display: 'grid', gap: 4 }}>
                    <p style={{ fontWeight: 700 }}>{noteSourceLabel}</p>
                    <p><strong>Assignment Notes:</strong> {data.assignment.notes}</p>
                  </div>
                ) : data.portal.defaultShipmentNotes ? (
                  <div style={{ display: 'grid', gap: 4 }}>
                    <p style={{ fontWeight: 700, color: '#1d4ed8' }}>Portal default is available</p>
                    <p><strong>Default Portal Notes:</strong> {data.portal.defaultShipmentNotes}</p>
                  </div>
                ) : null}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Portal Finance">
              <div style={{ display: 'grid', gap: 10 }}>
                <p style={{ fontWeight: 700 }}>Portal-only status</p>
                <PaymentStatusBadge status={data.portalFinance.status} />
                <p><strong>Portal Balance:</strong> {formatCurrency(data.portalFinance.balance)}</p>
                <p><strong>Portal Debits:</strong> {formatCurrency(data.portalFinance.debitAmount)}</p>
                <p><strong>Portal Payments:</strong> {formatCurrency(data.portalFinance.paidAmount)}</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {data.portalFinance.paymentRecordCount} payment record(s) and {data.portalFinance.ledgerEntryCount} ledger entry/entries exist only in the portal and do not change the main shipment payment state.
                </p>
                {data.portalFinance.recentPayments.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6, paddingTop: 6 }}>
                    <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent Portal Payments</p>
                    {data.portalFinance.recentPayments.slice(0, 3).map((payment) => (
                      <div key={payment.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 10, backgroundColor: 'rgba(34,197,94,0.05)' }}>
                        <p style={{ fontWeight: 700 }}>{formatCurrency(payment.amount)}</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}</p>
                        {payment.reference ? <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Ref: {payment.reference}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Route Snapshot">
              <div style={{ display: 'grid', gap: 12 }}>
                {shipment.dispatch ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(var(--brand-primary-rgb),0.04)' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <LocalShippingOutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                      Dispatch: {shipment.dispatch.referenceNumber}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {shipment.dispatch.origin} → {shipment.dispatch.destination}
                    </p>
                    {shipment.dispatch.dispatchDate ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <ScheduleOutlinedIcon size={12} style={{ marginRight: 4.0 }} />
                        Dispatched: {new Date(shipment.dispatch.dispatchDate).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {shipment.container ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(var(--accent-rgb),0.05)' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Inventory2OutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                      Container: {shipment.container.containerNumber}
                    </div>
                    {shipment.container.vesselName ? <p style={{ fontSize: '0.85rem' }}>Vessel: {shipment.container.vesselName} ({shipment.container.voyageNumber || '—'})</p> : null}
                    {shipment.container.trackingNumber ? <p style={{ fontSize: '0.85rem' }}>Tracking: {shipment.container.trackingNumber}</p> : null}
                    {shipment.container.currentLocation ? <p style={{ fontSize: '0.85rem' }}><LocationOnOutlinedIcon size={14} style={{ marginRight: 4.0, color: 'var(--text-secondary)' }}/>{shipment.container.currentLocation}</p> : null}
                    {shipment.container.estimatedArrival ? <p style={{ fontSize: '0.85rem' }}>ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}</p> : null}
                    {shipment.container.actualArrival ? <p style={{ fontSize: '0.85rem' }}>Arrived: {new Date(shipment.container.actualArrival).toLocaleDateString()}</p> : null}
                  </div>
                ) : null}
                {shipment.transit ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(15,23,42,0.03)' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AccountBalanceWalletOutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                      Final Transit
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>{shipment.transit.origin} → {shipment.transit.destination}</p>
                    {shipment.transit.estimatedDelivery ? <p style={{ fontSize: '0.85rem' }}>Estimated Delivery: {new Date(shipment.transit.estimatedDelivery).toLocaleDateString()}</p> : null}
                    {shipment.transit.actualDelivery ? <p style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Delivered: {new Date(shipment.transit.actualDelivery).toLocaleDateString()}</p> : null}
                  </div>
                ) : null}
              </div>
            </DashboardPanel>

            {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
              <DashboardPanel title="Photos">
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {[...shipment.vehiclePhotos, ...shipment.arrivalPhotos].slice(0, 8).map((photoUrl, index) => (
                    <a key={`${photoUrl}-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <img src={photoUrl} alt={`Shipment photo ${index + 1}`} style={{ width: '100%', height: 120, borderRadius: 16, border: '1px solid var(--border)', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </DashboardPanel>
            ) : null}
          </div>
        </DashboardGrid>
      </DashboardPanel>
    </DashboardSurface>
  );
}