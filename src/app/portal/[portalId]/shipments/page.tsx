'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardSurface, DashboardPanel, DashboardGrid, DashboardHeader } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, FormField, Select, Skeleton, SkeletonParagraph, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Download } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { exportShipments } from '@/lib/export';
import { Package as Inventory2OutlinedIcon, ClipboardCheck as AssignmentTurnedInOutlinedIcon, CircleCheck as CheckCircleOutlineOutlinedIcon, Truck as LocalShippingOutlinedIcon, User as PersonOutlineOutlinedIcon, Eye as VisibilityOutlinedIcon } from 'lucide-react';

type PortalCustomer = {
  id: string;
  name: string;
};

type ShipmentAssignment = {
  id: string;
  notes: string | null;
  noteSource?: 'MANUAL' | 'PORTAL_DEFAULT' | null;
  partnerCustomer: { id: string; name: string; email: string | null; phone: string | null } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
    serviceType: string;
    createdAt: string;
  };
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  requireCustomerLinkForReady?: boolean;
};

function formatShipmentLabel(shipment: ShipmentAssignment['shipment']) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatStatusLabel(status: string) {
  return status.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getPortalReadiness(portal: PortalInfo | null, assignment: ShipmentAssignment) {
  const requiresCustomerLink = portal?.requireCustomerLinkForReady !== false;

  if (requiresCustomerLink && !assignment.partnerCustomer) {
    return { label: 'Waiting for customer link', tone: 'warning' as const };
  }

  return { label: 'Ready for partner handling', tone: 'ready' as const };
}

function getAssignmentNoteSource(assignment: ShipmentAssignment) {
  if (assignment.noteSource === 'PORTAL_DEFAULT') {
    return { label: 'Portal default', tone: 'default' as const };
  }

  if (assignment.noteSource === 'MANUAL') {
    return { label: 'Manual note', tone: 'manual' as const };
  }

  return { label: 'No notes', tone: 'none' as const };
}

export default function PortalShipmentsPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'not-ready'>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'LINK_CUSTOMER' | 'SET_NOTES' | ''>('');
  const [bulkCustomerId, setBulkCustomerId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [bulkUnassignTargets, setBulkUnassignTargets] = useState<string[] | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsResponse, customersResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
      ]);

      const shipmentsData = await shipmentsResponse.json();
      const customersData = await customersResponse.json();

      if (!shipmentsResponse.ok) {
        throw new Error(shipmentsData.error || 'Failed to load assigned shipments');
      }

      if (!customersResponse.ok) {
        throw new Error(customersData.error || 'Failed to load customers');
      }

      setPortal(shipmentsData.portal);
      setAssignments(shipmentsData.assignments || []);
      setCustomers(customersData.customers || []);
      setLastRefreshedAt(new Date());
      setSelectedCustomers(
        Object.fromEntries(
          (shipmentsData.assignments || []).map((assignment: ShipmentAssignment) => [assignment.shipment.id, assignment.partnerCustomer?.id || ''])
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [portalId]);

  const filteredAssignments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const readiness = getPortalReadiness(portal, assignment).tone;
      if (readinessFilter === 'ready' && readiness !== 'ready') {
        return false;
      }

      if (readinessFilter === 'not-ready' && readiness === 'ready') {
        return false;
      }

      const vehicle = formatShipmentLabel(assignment.shipment).toLowerCase();
      const vin = assignment.shipment.vehicleVIN?.toLowerCase() || '';
      const status = assignment.shipment.status.toLowerCase();
      const customer = assignment.partnerCustomer?.name?.toLowerCase() || '';
      return vehicle.includes(value) || vin.includes(value) || status.includes(value) || customer.includes(value);
    });
  }, [assignments, portal, query, readinessFilter]);

  const linkedCount = filteredAssignments.filter((assignment) => assignment.partnerCustomer).length;
  const unlinkedCount = filteredAssignments.length - linkedCount;
  const uniqueStatuses = new Set(filteredAssignments.map((assignment) => assignment.shipment.status)).size;
  const readyCount = filteredAssignments.filter((assignment) => getPortalReadiness(portal, assignment).tone === 'ready').length;
  const topCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach((assignment) => {
      if (assignment.partnerCustomer?.name) {
        counts.set(assignment.partnerCustomer.name, (counts.get(assignment.partnerCustomer.name) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [assignments]);

  const handleLinkCustomer = async (shipmentId: string) => {
    try {
      setSavingId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCustomerId: selectedCustomers[shipmentId] || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment');
      }

      toast.success('Shipment customer link updated');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update shipment assignment');
    } finally {
      setSavingId(null);
    }
  };

  const runBulkAction = async (
    action: 'UNASSIGN' | 'LINK_CUSTOMER' | 'SET_NOTES' | 'CLEAR_NOTES',
    shipmentIds: string[],
    options?: { partnerCustomerId?: string | null; notes?: string },
  ) => {
    if (shipmentIds.length === 0) {
      toast.error('Select at least one shipment first');
      return;
    }

    try {
      setBulkBusy(true);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          shipmentIds,
          ...(action === 'LINK_CUSTOMER' ? { partnerCustomerId: options?.partnerCustomerId || null } : {}),
          ...(action === 'SET_NOTES' ? { notes: options?.notes || '' } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk action failed');
      }

      const labels: Record<string, string> = {
        UNASSIGN: 'removed from portal',
        LINK_CUSTOMER: options?.partnerCustomerId ? 'linked to customer' : 'unlinked from customers',
        SET_NOTES: 'notes updated',
        CLEAR_NOTES: 'notes cleared',
      };

      toast.success(`${data.updatedCount} shipment${data.updatedCount === 1 ? '' : 's'} ${labels[action]}`);
      setBulkAction('');
      setBulkCustomerId('');
      setBulkNotes('');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    setBulkUnassignTargets(selectedIds);
  };

  const handleBulkLinkCustomer = (selectedIds: string[]) => {
    void runBulkAction('LINK_CUSTOMER', selectedIds, {
      partnerCustomerId: bulkCustomerId || null,
    });
  };

  const handleBulkSetNotes = (selectedIds: string[]) => {
    void runBulkAction('SET_NOTES', selectedIds, { notes: bulkNotes });
  };

  const columns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'My Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'readiness',
      header: 'Ready State',
      render: (_, row) => {
        const readiness = getPortalReadiness(portal, row);
        return (
          <span
           
            role="status"
            aria-label={readiness.label}
            style={{ paddingLeft: 9.6, paddingRight: 9.6, paddingTop: 3.6, paddingBottom: 3.6, borderRadius: 7992, display: 'inline-flex', alignItems: 'center', backgroundColor: readiness.tone === 'ready' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.14)', color: readiness.tone === 'ready' ? 'var(--success)' : 'var(--warning)', fontSize: '0.75rem', fontWeight: 700 }}
          >
            {readiness.label}
          </span>
        );
      },
    },
    {
      key: 'noteSource',
      header: 'Notes Source',
      render: (_, row) => {
        const noteSource = getAssignmentNoteSource(row);
        return (
          <div style={{ paddingLeft: 9.6, paddingRight: 9.6, paddingTop: 3.6, paddingBottom: 3.6, borderRadius: 7992, display: 'inline-flex', alignItems: 'center', backgroundColor: noteSource.tone === 'manual' ? 'rgba(var(--brand-primary-rgb),0.12)' : noteSource.tone === 'default' ? 'rgba(59,130,246,0.12)' : 'rgba(var(--text-primary-rgb),0.08)', color: noteSource.tone === 'manual' ? 'var(--brand-primary)' : noteSource.tone === 'default' ? 'var(--info)' : 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
            {noteSource.label}
          </div>
        );
      },
    },
    {
      key: 'assign',
      header: 'Link To Customer',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 280 }}>
          <div className="relative min-w-0 flex-1">
            <select
              value={selectedCustomers[row.shipment.id] || ''}
              onChange={(event) => setSelectedCustomers((prev) => ({ ...prev, [row.shipment.id]: event.target.value }))}
              aria-label="Link to customer"
              className="ds-select-control w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors px-2.5 py-1.5 text-[0.8125rem] pr-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]"
            >
              <option value="">Unassigned</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleLinkCustomer(row.shipment.id)} disabled={savingId === row.shipment.id}>
            {savingId === row.shipment.id ? 'Saving...' : 'Save'}
          </Button>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <VisibilityOutlinedIcon size={16} />
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ], [customers, portal, portalId, savingId, selectedCustomers]);

  return (
    <DashboardSurface>
      <DashboardHeader
        title={portal ? `${portal.companyLabel || portal.name} Shipments` : 'Assigned Shipments'}
        description="Work through the shipment layer your team received from the main system, then map each unit to your own portal customers."
        meta={[
          { label: 'Assigned', value: assignments.length, helper: 'Shared from the main workspace' },
          { label: 'Linked', value: assignments.filter((assignment) => assignment.partnerCustomer).length, helper: 'Already mapped to portal customers' },
          { label: 'Customers', value: customers.length, helper: 'Available for assignment handoff' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {lastRefreshedAt ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }} aria-live="polite">
                Updated {lastRefreshedAt.toLocaleTimeString()}
              </p>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4 text-emerald-500" />}
              onClick={() => {
                if (filteredAssignments.length === 0) {
                  toast.error('No shipments to export');
                  return;
                }
                const shipmentList = filteredAssignments.map((a) => ({
                  ...a.shipment,
                  customer: a.partnerCustomer?.name || 'Unassigned',
                }));
                exportShipments(shipmentList, 'excel', `${portal?.name || 'portal'}-shipments`, { isCustomer: true });
                toast.success('Shipments exported successfully');
              }}
            >
              Export Shipments
            </Button>
            <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>
              Refresh
            </Button>
            <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Open Customers</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'var(--panel)', display: 'grid', gap: 6 }}>
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="35%" height={34} />
              </div>
            ))}
          </DashboardGrid>
          <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
            <div style={{ display: 'grid', gap: 16 }}>
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={48} />
              <SkeletonTable rows={6} columns={5} />
            </div>
          </DashboardPanel>
        </>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 6 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Assigned Units</p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800 }}>{filteredAssignments.length}</p>
              <LocalShippingOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'rgba(var(--accent-rgb),0.08)', display: 'grid', gap: 6 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer Linked</p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800 }}>{linkedCount}</p>
              <AssignmentTurnedInOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'rgba(var(--text-primary-rgb),0.05)', display: 'grid', gap: 6 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Needs Handoff</p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800 }}>{unlinkedCount}</p>
              <PersonOutlineOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'rgba(245,158,11,0.08)', display: 'grid', gap: 6 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Active Statuses</p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800 }}>{uniqueStatuses}</p>
              <Inventory2OutlinedIcon style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'rgba(34,197,94,0.08)', display: 'grid', gap: 6 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ready Now</p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800 }}>{readyCount}</p>
              <CheckCircleOutlineOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
            </div>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
              <div style={{ display: 'grid', gap: 16 }}>
                <FormField label="Search shipments" placeholder="Search by vehicle, VIN, status, or customer" value={query} onChange={(event) => setQuery(event.target.value)} />
                <div style={{ maxWidth: 240 }}>
                  <Select label="Ready filter" value={readinessFilter} onChange={(val) => setReadinessFilter(val as 'all' | 'ready' | 'not-ready')} options={[{ value: 'all', label: 'All shipments' }, { value: 'ready', label: 'Ready only' }, { value: 'not-ready', label: 'Not ready only' }]} />
                </div>

                <div
                  style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 14, backgroundColor: 'var(--panel)', display: 'grid', gap: 10 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Bulk actions
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Select rows in the table below, then apply an action to all of them at once.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 200 }}>
                      <Select label="Action" size="small" value={bulkAction} onChange={(val) => setBulkAction(val as 'LINK_CUSTOMER' | 'SET_NOTES' | '')} options={[{ value: '', label: 'Choose action...' }, { value: 'LINK_CUSTOMER', label: 'Link / unlink customer' }, { value: 'SET_NOTES', label: 'Set notes' }]} />
                    </div>

                    {bulkAction === 'LINK_CUSTOMER' ? (
                      <div style={{ minWidth: 220 }}>
                        <Select label="Customer" size="small" value={bulkCustomerId} onChange={(val) => setBulkCustomerId(val as string)} options={[{ value: '', label: 'Unassigned (unlink all)' }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))]} />
                      </div>
                    ) : null}

                    {bulkAction === 'SET_NOTES' ? (
                      <div style={{ minWidth: 260, maxWidth: 380 }}><FormField label="Notes" placeholder="Note to apply to selected shipments" value={bulkNotes} onChange={(event) => setBulkNotes(event.target.value)} size="small" /></div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!bulkAction || bulkBusy || selectedShipmentIds.length === 0}
                      onClick={() => {
                        if (bulkAction === 'LINK_CUSTOMER') {
                          handleBulkLinkCustomer(selectedShipmentIds);
                        } else if (bulkAction === 'SET_NOTES') {
                          handleBulkSetNotes(selectedShipmentIds);
                        }
                      }}
                    >
                      {bulkBusy
                        ? 'Applying...'
                        : `Apply to ${selectedShipmentIds.length} selected`}
                    </Button>
                    {selectedShipmentIds.length === 0 && !bulkBusy ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }} role="status">
                        Select shipments using the checkboxes in the table to enable this.
                      </p>
                    ) : null}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Tip: use the checkboxes in the table and the toolbar that appears above it to remove shipments from the portal in bulk. Removing a shipment only unassigns it from this portal — the shipment itself stays untouched in the main system.
                  </p>
                </div>

                {assignments.length === 0 ? (
                  <EmptyState icon={<Inventory2OutlinedIcon />} title="No assigned shipments" description="Your portal does not have any shipments assigned yet. Ask the internal team to assign shipments to this portal first." />
                ) : filteredAssignments.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>No shipments matched the current search and ready-state filters.</div>
                ) : (
                  <DataTable
                    data={filteredAssignments}
                    columns={columns}
                    keyField="id"
                    selectable
                    onSelectionChange={setSelectedShipmentIds}
                    onDelete={handleBulkDelete}
                    onExport={(rows) => {
                      const shipmentList = rows.map((r) => ({
                        ...r.shipment,
                        customer: r.partnerCustomer?.name || 'Unassigned',
                      }));
                      exportShipments(shipmentList, 'excel', `portal-shipments-${new Date().toISOString().slice(0, 10)}`, { isCustomer: true });
                    }}
                  />
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Assignment Board" description="Use customer mapping to turn shared logistics into partner-owned workload.">
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Coverage</p>
                  <p style={{ fontSize: '1.45rem', fontWeight: 800 }}>{assignments.length === 0 ? '0%' : `${Math.round((assignments.filter((assignment) => assignment.partnerCustomer).length / assignments.length) * 100)}%`}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {assignments.filter((assignment) => assignment.partnerCustomer).length} of {assignments.length} shipments are already linked to portal customers.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Top customer destinations</p>
                  {topCustomers.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>No shipment links have been created yet.</div>
                  ) : (
                    topCustomers.map(([name, count]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 10, borderRadius: 16, backgroundColor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                        <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>{name}</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count} linked</p>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent portal-visible units</p>
                  {assignments.slice(0, 4).map((assignment) => (
                    <div key={assignment.id} style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 12, display: 'grid', gap: 3.2 }}>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>{formatShipmentLabel(assignment.shipment)}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatStatusLabel(assignment.shipment.status)}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {assignment.partnerCustomer?.name || 'Awaiting portal customer link'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: getAssignmentNoteSource(assignment).tone === 'manual' ? 'var(--brand-primary)' : getAssignmentNoteSource(assignment).tone === 'default' ? 'var(--info)' : 'var(--text-secondary)', fontWeight: 700 }}>
                        {getAssignmentNoteSource(assignment).label}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: getPortalReadiness(portal, assignment).tone === 'ready' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                        {getPortalReadiness(portal, assignment).label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}

      <ConfirmDialog
        open={bulkUnassignTargets !== null}
        onClose={() => setBulkUnassignTargets(null)}
        onConfirm={() => {
          if (bulkUnassignTargets) {
            void runBulkAction('UNASSIGN', bulkUnassignTargets);
          }
          setBulkUnassignTargets(null);
        }}
        title="Remove shipments from portal"
        message={`Remove ${bulkUnassignTargets?.length || 0} shipment${(bulkUnassignTargets?.length || 0) === 1 ? '' : 's'} from this portal? The shipments stay in the main system but will no longer be visible to this portal.`}
        confirmText="Remove"
        severity="warning"
        loading={bulkBusy}
      />
    </DashboardSurface>
  );
}