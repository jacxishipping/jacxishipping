'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Send,
  Wallet,
} from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, FormField, Modal, Select, toast } from '@/components/design-system';
import { hasAnyPermission } from '@/lib/rbac';
import { formatMoney } from '@/lib/format';
import { statusChipClass, statusTone } from '@/lib/status';

type ShipmentChargeInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  containerId?: string | null;
  shipmentId?: string | null;
};

type ShipmentCharge = {
  id: string;
  chargeCode: string;
  category: string;
  billingMilestone: string;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  billableAt: string | null;
  approvedAt: string | null;
  invoicedAt: string | null;
  paidAt: string | null;
  notes?: string | null;
  invoice: ShipmentChargeInvoice | null;
  auditLogs: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    actorLabel: string;
    oldValue: string | null;
    newValue: string | null;
    timestamp: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

type ShipmentBillingResponse = {
  charges: ShipmentCharge[];
  summary: {
    total: number;
    invoiced: number;
    paid: number;
    open: number;
    disputed?: number;
    voided?: number;
    counts: Record<string, number>;
  };
  readiness: {
    status: 'NOT_BILLABLE' | 'PARTIALLY_BILLABLE' | 'READY_TO_INVOICE' | 'INVOICED' | 'PAID';
    label: string;
    description: string;
    approvedUninvoicedCount: number;
    blockedCount: number;
    settledCount: number;
    totalCharges: number;
  };
  postIssueDelta: {
    active: boolean;
    kind: 'SUPPLEMENTAL_INVOICE' | 'CREDIT_NOTE' | 'ADJUSTMENT';
    approvedUninvoicedCount: number;
    deltaAmount: number;
    latestIssuedInvoiceNumber: string | null;
    latestIssuedInvoiceStatus: string | null;
    description: string | null;
  };
};

type InvoicePdfPayload = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  container: {
    containerNumber: string;
    trackingNumber: string | null;
    vesselName: string | null;
    loadingPort: string | null;
    destinationPort: string | null;
  } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    vehicleColor: string | null;
    paymentStatus: string | null;
  } | null;
  lineItems: Array<{
    description: string;
    type: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    shipment?: {
      vehicleYear: number | null;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleVIN: string | null;
    };
  }>;
};

type ShipmentBillingTabProps = {
  shipmentId: string;
  refreshKey?: string;
  purchasePriceRecord?: {
    description: string;
    amount: number;
    transactionDate: string;
  } | null;
  onBillingChanged?: () => void | Promise<void>;
};

type ConfirmActionState =
  | { kind: 'DISCARD_DRAFT'; invoice: ShipmentChargeInvoice }
  | { kind: 'REVERSE_INVOICE'; invoice: ShipmentChargeInvoice }
  | { kind: 'DISPUTE_ISSUED_CHARGE'; charge: ShipmentCharge; invoice: ShipmentChargeInvoice }
  | { kind: 'SEND_DRAFT'; invoice: ShipmentChargeInvoice }
  | null;

type ChargeViewFilter = 'ACTIVE' | 'ALL' | 'VOIDED';

const shipmentChargeStatusKeys = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'PAID', 'DISPUTED', 'VOID'];
const statusStyles: Record<string, string> = Object.fromEntries(
  shipmentChargeStatusKeys.map((value) => [value, statusChipClass(statusTone('shipmentCharge', value))]),
);

const invoiceStatusKeys = ['DRAFT', 'PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID', 'REFUNDED'];
const invoiceStatusStyles: Record<string, string> = Object.fromEntries(
  invoiceStatusKeys.map((value) => [value, statusChipClass(statusTone('invoice', value))]),
);

const readinessStyles: Record<ShipmentBillingResponse['readiness']['status'], string> = {
  NOT_BILLABLE: statusChipClass(statusTone('readiness', 'NOT_BILLABLE')),
  PARTIALLY_BILLABLE: statusChipClass(statusTone('readiness', 'PARTIALLY_BILLABLE')),
  READY_TO_INVOICE: statusChipClass(statusTone('readiness', 'READY_TO_INVOICE')),
  INVOICED: statusChipClass(statusTone('readiness', 'INVOICED')),
  PAID: statusChipClass(statusTone('readiness', 'PAID')),
};

const manualCategoryOptions = [
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'HANDLING', label: 'Handling / Dispatch' },
  { value: 'CUSTOMS', label: 'Customs / Port' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'CREDIT', label: 'Credit / Discount' },
  { value: 'DAMAGE', label: 'Damage Adjustment' },
  { value: 'OTHER', label: 'Other Fee' },
];

const manualMilestoneOptions = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'INTAKE', label: 'Intake' },
  { value: 'ORIGIN_HANDOFF', label: 'Origin Handoff' },
  { value: 'OCEAN_FREIGHT', label: 'Ocean Freight' },
  { value: 'DESTINATION_PORT', label: 'Destination Port' },
  { value: 'RELEASE', label: 'Release' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'FINAL_SETTLEMENT', label: 'Final Settlement' },
];

const manualStatusOptions = [
  { value: 'APPROVED', label: 'Approved (Ready to Invoice)' },
  { value: 'DRAFT', label: 'Draft (Needs Review)' },
];

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChargeCode(value: string) {
  const friendlyChargeCodes: Record<string, string> = {
    PRICE_LIST_DISPATCH: 'Dispatch portion from price list',
    PRICE_LIST_SHIPPING: 'Shipping portion from price list',
  };

  return friendlyChargeCodes[value] || formatLabel(value);
}

function isContainerScopedInvoice(invoice: ShipmentChargeInvoice, shipmentId: string) {
  return Boolean(invoice.containerId && invoice.shipmentId !== shipmentId);
}

function isActionableCharge(charge: ShipmentCharge) {
  // Charges locked to an issued (sent/partially-paid/overdue/paid) invoice can only
  // be changed after that invoice is voided. Draft/pending/void/cancelled invoices do not lock rows.
  if (charge.invoice && !['DRAFT', 'PENDING', 'VOID', 'CANCELLED'].includes(charge.invoice.status)) {
    return false;
  }

  if (charge.status === 'PAID') {
    return false;
  }

  if (charge.status === 'INVOICED') {
    return Boolean(charge.invoice && ['DRAFT', 'PENDING', 'VOID', 'CANCELLED'].includes(charge.invoice.status));
  }

  return ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED', 'VOID'].includes(charge.status);
}

function canDisputeCharge(charge: ShipmentCharge) {
  if (charge.status === 'APPROVED') return true;
  // A charge sitting on a draft/pending invoice can be pulled off it and disputed.
  if (charge.status === 'INVOICED') {
    return Boolean(charge.invoice && ['DRAFT', 'PENDING'].includes(charge.invoice.status));
  }
  return false;
}

function formatAuditAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractAuditNote(metadata?: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.note !== 'string') {
    return null;
  }

  const note = metadata.note.trim();
  return note || null;
}

export default function ShipmentBillingTab({
  shipmentId,
  refreshKey,
  purchasePriceRecord,
  onBillingChanged,
}: ShipmentBillingTabProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<ShipmentBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingChargeId, setUpdatingChargeId] = useState<string | null>(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceActioningId, setInvoiceActioningId] = useState<string | null>(null);
  const [chargeFilter, setChargeFilter] = useState<ChargeViewFilter>('ACTIVE');
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(null);

  // Manual Charge Modal State
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [creatingCharge, setCreatingCharge] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualCategory, setManualCategory] = useState('OTHER');
  const [manualMilestone, setManualMilestone] = useState('MANUAL');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualUnitAmount, setManualUnitAmount] = useState('');
  const [manualStatus, setManualStatus] = useState<'APPROVED' | 'DRAFT'>('APPROVED');
  const [manualNotes, setManualNotes] = useState('');

  const canManageChargeStatus = hasAnyPermission(session?.user?.role, ['shipments:manage', 'invoices:manage', 'finance:manage']);
  const canGenerateInvoices = hasAnyPermission(session?.user?.role, ['invoices:manage']);

  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/shipments/${shipmentId}/charges?materialize=true`, { cache: 'no-store' });
      const payload = (await response.json()) as ShipmentBillingResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load shipment billing');
      }

      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load shipment billing');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  const notifyAndReload = useCallback(async () => {
    await fetchCharges();
    if (onBillingChanged) {
      void onBillingChanged();
    }
  }, [fetchCharges, onBillingChanged]);

  useEffect(() => {
    void fetchCharges();
  }, [fetchCharges, refreshKey]);

  const charges = useMemo(() => data?.charges || [], [data?.charges]);
  const voidedChargesCount = useMemo(
    () => charges.filter((charge) => charge.status === 'VOID').length,
    [charges],
  );
  const activeChargesCount = charges.length - voidedChargesCount;

  const visibleCharges = useMemo(() => {
    if (chargeFilter === 'VOIDED') {
      return charges.filter((charge) => charge.status === 'VOID');
    }
    if (chargeFilter === 'ACTIVE' && activeChargesCount > 0) {
      return charges.filter((charge) => charge.status !== 'VOID');
    }
    return charges;
  }, [charges, chargeFilter, activeChargesCount]);

  useEffect(() => {
    setSelectedChargeIds((current) => {
      const validIds = new Set(visibleCharges.filter(isActionableCharge).map((charge) => charge.id));
      return current.filter((id) => validIds.has(id));
    });
  }, [visibleCharges]);

  const updateChargeStatus = async (chargeId: string, status: 'APPROVED' | 'DISPUTED' | 'VOID') => {
    try {
      setUpdatingChargeId(chargeId);
      const response = await fetch(`/api/shipments/${shipmentId}/charges/${chargeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update shipment charge');
      }

      toast.success(
        status === 'APPROVED'
          ? 'Charge approved'
          : status === 'VOID'
          ? 'Charge voided'
          : 'Charge disputed',
      );
      await notifyAndReload();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Failed to update shipment charge');
    } finally {
      setUpdatingChargeId(null);
    }
  };

  const toggleSelectedCharge = (chargeId: string) => {
    setSelectedChargeIds((current) =>
      current.includes(chargeId) ? current.filter((id) => id !== chargeId) : [...current, chargeId],
    );
  };

  const actionableVisibleCharges = visibleCharges.filter(isActionableCharge);
  const allActionableSelected =
    actionableVisibleCharges.length > 0 &&
    actionableVisibleCharges.every((charge) => selectedChargeIds.includes(charge.id));

  const toggleAllActionableCharges = () => {
    if (allActionableSelected) {
      setSelectedChargeIds([]);
      return;
    }

    setSelectedChargeIds(actionableVisibleCharges.map((charge) => charge.id));
  };

  const bulkUpdateCharges = async (status: 'APPROVED' | 'DISPUTED' | 'VOID') => {
    if (!selectedChargeIds.length) {
      toast.error('Select at least one shipment charge first');
      return;
    }

    try {
      setBulkUpdating(true);
      const response = await fetch(`/api/shipments/${shipmentId}/charges`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chargeIds: selectedChargeIds,
          status,
          note: bulkNote.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; updated?: number };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to bulk update shipment charges');
      }

      const count = payload.updated || selectedChargeIds.length;
      toast.success(
        status === 'APPROVED'
          ? `${count} charge(s) approved`
          : status === 'VOID'
          ? `${count} charge(s) voided`
          : `${count} charge(s) disputed`,
      );
      setSelectedChargeIds([]);
      setBulkNote('');
      await notifyAndReload();
    } catch (bulkError) {
      toast.error(bulkError instanceof Error ? bulkError.message : 'Failed to bulk update shipment charges');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleCreateManualCharge = async () => {
    const qty = Number(manualQuantity);
    const unit = Number(manualUnitAmount);
    if (!manualDescription.trim()) {
      toast.error('Enter a charge description');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (!Number.isFinite(unit) || unit === 0) {
      toast.error('Enter a non-zero unit amount');
      return;
    }

    try {
      setCreatingCharge(true);
      const response = await fetch(`/api/shipments/${shipmentId}/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: manualDescription.trim(),
          category: manualCategory,
          billingMilestone: manualMilestone,
          quantity: qty,
          unitAmount: unit,
          currency: primaryCurrency,
          status: manualStatus,
          notes: manualNotes.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create charge');
      }

      toast.success('Manual charge added');
      setAddChargeOpen(false);
      setManualDescription('');
      setManualCategory('OTHER');
      setManualMilestone('MANUAL');
      setManualQuantity('1');
      setManualUnitAmount('');
      setManualStatus('APPROVED');
      setManualNotes('');
      await notifyAndReload();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Failed to create charge');
    } finally {
      setCreatingCharge(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      setDownloadingInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as InvoicePdfPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load invoice for download');
      }

      const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
      await downloadInvoicePDF(payload);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.kind === 'DISCARD_DRAFT') {
        setInvoiceActioningId(confirmAction.invoice.id);
        const response = await fetch(`/api/invoices/${confirmAction.invoice.id}`, { method: 'DELETE' });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Failed to discard draft invoice');
        toast.success(`Draft invoice ${confirmAction.invoice.invoiceNumber} discarded — charges released`);
        setConfirmAction(null);
        await notifyAndReload();
        return;
      }

      if (confirmAction.kind === 'SEND_DRAFT') {
        setInvoiceActioningId(confirmAction.invoice.id);
        const response = await fetch(`/api/invoices/${confirmAction.invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SENT' }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Failed to issue invoice');
        toast.success(`Invoice ${confirmAction.invoice.invoiceNumber} marked as Sent`);
        setConfirmAction(null);
        await notifyAndReload();
        return;
      }

      if (confirmAction.kind === 'REVERSE_INVOICE') {
        setInvoiceActioningId(confirmAction.invoice.id);
        const response = await fetch(`/api/invoices/${confirmAction.invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'VOID',
            notes: 'Voided from shipment billing so rows could be disputed or re-invoiced',
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Failed to reverse invoice');
        toast.success(`Invoice ${confirmAction.invoice.invoiceNumber} voided — charges released`);
        setConfirmAction(null);
        await notifyAndReload();
        return;
      }

      if (confirmAction.kind === 'DISPUTE_ISSUED_CHARGE') {
        setInvoiceActioningId(confirmAction.invoice.id);
        // 1. Void the issued invoice (releases all of its charges server-side).
        const reverseResponse = await fetch(`/api/invoices/${confirmAction.invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'VOID',
            notes: 'Voided to dispute a charge from the shipment billing tab',
          }),
        });
        const reversePayload = (await reverseResponse.json().catch(() => ({}))) as { error?: string };
        if (!reverseResponse.ok) throw new Error(reversePayload.error || 'Failed to void invoice');

        // 2. Dispute the target charge itself.
        const disputeResponse = await fetch(
          `/api/shipments/${shipmentId}/charges/${confirmAction.charge.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DISPUTED' }),
          },
        );
        const disputePayload = (await disputeResponse.json().catch(() => ({}))) as { error?: string };
        if (!disputeResponse.ok) throw new Error(disputePayload.error || 'Failed to dispute charge');

        toast.success('Invoice voided and charge disputed');
        setConfirmAction(null);
        await notifyAndReload();
      }
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Invoice action failed');
    } finally {
      setInvoiceActioningId(null);
    }
  };

  const generateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId,
          sendEmail: false,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: {
          newInvoices?: number;
          updatedInvoices?: number;
          supplementalInvoices?: number;
          creditNotes?: number;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate shipment invoice');
      }

      const detailParts = [
        payload.summary?.newInvoices ? `Created ${payload.summary.newInvoices} new invoice(s)` : null,
        payload.summary?.updatedInvoices ? `updated ${payload.summary.updatedInvoices} draft invoice(s)` : null,
        payload.summary?.supplementalInvoices ? `issued ${payload.summary.supplementalInvoices} supplemental invoice(s)` : null,
        payload.summary?.creditNotes ? `issued ${payload.summary.creditNotes} credit note(s)` : null,
      ].filter(Boolean);

      toast.success('Shipment invoice generated', {
        description: detailParts.join(', ') || 'No invoice changes were required.',
      });
      await notifyAndReload();
    } catch (generationError) {
      toast.error(generationError instanceof Error ? generationError.message : 'Failed to generate shipment invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const primaryCurrency = useMemo(() => {
    const firstActive = charges.find((c) => c.status !== 'VOID' && c.currency);
    return firstActive?.currency || charges[0]?.currency || 'USD';
  }, [charges]);

  if (loading) {
    return (
      <DashboardPanel title="Shipment Billing" description="Charge lifecycle for this shipment.">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">
          Loading billing charges...
        </div>
      </DashboardPanel>
    );
  }

  if (error) {
    return (
      <DashboardPanel title="Shipment Billing" description="Charge lifecycle for this shipment.">
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] p-4 text-sm text-[rgb(185,28,28)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </DashboardPanel>
    );
  }

  const summary = data?.summary || { total: 0, invoiced: 0, paid: 0, open: 0, disputed: 0, voided: 0, counts: {} };
  const readOnlyOrDraftInvoice = charges.some((charge) => charge.invoice && ['DRAFT', 'PENDING'].includes(charge.invoice.status));
  const readiness =
    data?.readiness ||
    {
      status: 'NOT_BILLABLE' as const,
      label: 'Not Billable',
      description: 'No active shipment charges are available yet.',
      approvedUninvoicedCount: 0,
      blockedCount: 0,
      settledCount: 0,
      totalCharges: 0,
    };
  const canGenerateFromDraft = readiness.approvedUninvoicedCount > 0 || readOnlyOrDraftInvoice;
  const postIssueDelta =
    data?.postIssueDelta ||
    {
      active: false,
      kind: 'ADJUSTMENT' as const,
      approvedUninvoicedCount: 0,
      deltaAmount: 0,
      latestIssuedInvoiceNumber: null,
      latestIssuedInvoiceStatus: null,
      description: null,
    };

  const linkedInvoices = Array.from(
    new Map(
      charges
        .filter((charge) => charge.invoice && !['CANCELLED', 'VOID'].includes(charge.invoice.status))
        .map((charge) => [charge.invoice!.id, charge.invoice!]),
    ).values(),
  );
  const activeShipmentInvoice = linkedInvoices.find((inv) => inv.shipmentId === shipmentId) || linkedInvoices[0] || null;
  const purchasePriceCharge = charges.find(
    (charge) => charge.chargeCode === 'PURCHASE_PRICE' && charge.status !== 'VOID',
  );

  const confirmCopy = (() => {
    if (!confirmAction) return null;
    const inv = confirmAction.invoice;
    const containerWarning = isContainerScopedInvoice(inv, shipmentId)
      ? ' Note: This is a container-level invoice spanning multiple shipments—this action affects every shipment linked to it.'
      : '';

    if (confirmAction.kind === 'DISCARD_DRAFT') {
      return {
        title: `Discard Draft ${inv.invoiceNumber}?`,
        message: `The draft will be deleted and all of its charges released back to Approved so you can dispute or edit the rows. A new invoice will be generated next time you click Generate.${containerWarning}`,
        confirmText: 'Discard Draft',
        severity: 'error' as const,
      };
    }

    if (confirmAction.kind === 'SEND_DRAFT') {
      return {
        title: `Issue Invoice ${inv.invoiceNumber}?`,
        message: `This marks ${inv.invoiceNumber} as Sent and locks its current charges against direct edits until voided.${containerWarning}`,
        confirmText: 'Mark as Sent',
        severity: 'info' as const,
      };
    }

    if (confirmAction.kind === 'REVERSE_INVOICE') {
      return {
        title: `Void Invoice ${inv.invoiceNumber}?`,
        message: `The invoice will be voided (kept for the audit trail) and all of its charges released back to Approved so you can dispute or edit rows and generate a fresh invoice.${containerWarning}`,
        confirmText: 'Void Invoice',
        severity: 'error' as const,
      };
    }

    return {
      title: `Void ${inv.invoiceNumber} & Dispute Charge?`,
      message: `Disputing "${confirmAction.charge.description}" first voids issued invoice ${inv.invoiceNumber}, releasing ALL of its charges back to Approved and marking this charge Disputed.${containerWarning}`,
      confirmText: 'Void & Dispute',
      severity: 'error' as const,
    };
  })();

  const renderInvoiceCell = (charge: ShipmentCharge) => {
    if (!charge.invoice) {
      return <span className="text-[var(--text-secondary)]">Not invoiced</span>;
    }

    const inv = charge.invoice;
    const isDraftOrPending = ['DRAFT', 'PENDING'].includes(inv.status);
    const isReversibleIssued = ['SENT', 'OVERDUE'].includes(inv.status);

    return (
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/dashboard/invoices/${inv.id}`}
            className="inline-flex items-center gap-1 font-semibold text-[var(--accent-gold)] hover:underline"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            {inv.invoiceNumber}
          </Link>
          <span
            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
              invoiceStatusStyles[inv.status] || invoiceStatusStyles.DRAFT
            }`}
          >
            {formatLabel(inv.status)}
          </span>
          {inv.shipmentId === shipmentId ? (
            <span className="rounded bg-[rgba(29,78,216,0.12)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[rgb(29,78,216)]">
              Shipment
            </span>
          ) : inv.containerId ? (
            <span className="rounded bg-[rgba(217,119,6,0.12)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[rgb(180,83,9)]">
              Container
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-3 w-3" />}
            onClick={() => void downloadInvoice(inv.id)}
            disabled={downloadingInvoiceId === inv.id}
          >
            {downloadingInvoiceId === inv.id ? '...' : 'PDF'}
          </Button>
          {canGenerateInvoices && inv.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="h-3 w-3" />}
              onClick={() => setConfirmAction({ kind: 'SEND_DRAFT', invoice: inv })}
              disabled={invoiceActioningId === inv.id}
            >
              Send
            </Button>
          )}
          {canGenerateInvoices && isDraftOrPending && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmAction({ kind: 'DISCARD_DRAFT', invoice: inv })}
              disabled={invoiceActioningId === inv.id}
            >
              {invoiceActioningId === inv.id ? '...' : 'Discard'}
            </Button>
          )}
          {canGenerateInvoices && isReversibleIssued && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmAction({ kind: 'REVERSE_INVOICE', invoice: inv })}
              disabled={invoiceActioningId === inv.id}
            >
              {invoiceActioningId === inv.id ? '...' : 'Void'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderRowAction = (charge: ShipmentCharge) => {
    if (canManageChargeStatus && isActionableCharge(charge)) {
      if (canDisputeCharge(charge)) {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void updateChargeStatus(charge.id, 'DISPUTED')}
            disabled={updatingChargeId === charge.id || bulkUpdating}
          >
            {updatingChargeId === charge.id ? '...' : 'Dispute'}
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          onClick={() => void updateChargeStatus(charge.id, 'APPROVED')}
          disabled={updatingChargeId === charge.id || bulkUpdating}
        >
          {updatingChargeId === charge.id ? '...' : charge.status === 'VOID' ? 'Restore' : 'Approve'}
        </Button>
      );
    }

    if (
      canGenerateInvoices &&
      charge.invoice &&
      ['SENT', 'OVERDUE'].includes(charge.invoice.status) &&
      charge.status === 'INVOICED'
    ) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setConfirmAction({
              kind: 'DISPUTE_ISSUED_CHARGE',
              charge,
              invoice: charge.invoice!,
            })
          }
          disabled={invoiceActioningId === charge.invoice.id || bulkUpdating}
          title="Disputing this charge voids its invoice and releases all charges on that invoice"
        >
          {invoiceActioningId === charge.invoice.id ? '...' : 'Dispute'}
        </Button>
      );
    }

    return <span className="text-[11px] text-[var(--text-secondary)]">-</span>;
  };

  const renderAuditHistory = (charge: ShipmentCharge) => {
    if (charge.auditLogs.length === 0) return null;
    return (
      <details className="group mt-2 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90" />
          <span>Audit History ({charge.auditLogs.length})</span>
        </summary>
        <div className="mt-2 space-y-2">
          {charge.auditLogs.map((log) => {
            const note = extractAuditNote(log.metadata);

            return (
              <div
                key={log.id}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-[11px] text-[var(--text-secondary)]"
              >
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium text-[var(--text-primary)]">{formatAuditAction(log.action)}</span>
                  <span>· {log.actorLabel}</span>
                  <span>· {new Date(log.timestamp).toLocaleString()}</span>
                  {log.oldValue ? <span>· {formatLabel(log.oldValue)}</span> : null}
                  {log.newValue ? <span>to {formatLabel(log.newValue)}</span> : null}
                </div>
                <p className="mt-1 text-[var(--text-primary)]">{log.description}</p>
                {note ? <p className="mt-1 italic text-[var(--text-secondary)]">Note: {note}</p> : null}
              </div>
            );
          })}
        </div>
      </details>
    );
  };

  return (
    <>
      <DashboardPanel
        title="Shipment Billing"
        description="Approved shipment charges are the source of truth for invoice generation and settlement."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManageChargeStatus && (
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setAddChargeOpen(true)}
              >
                Add Charge
              </Button>
            )}
            {activeShipmentInvoice && linkedInvoices.length === 1 && (
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={() => void downloadInvoice(activeShipmentInvoice.id)}
                disabled={downloadingInvoiceId === activeShipmentInvoice.id}
              >
                {downloadingInvoiceId === activeShipmentInvoice.id
                  ? 'Downloading...'
                  : `Download ${activeShipmentInvoice.invoiceNumber}`}
              </Button>
            )}
            {canGenerateInvoices && (
              <Button
                size="sm"
                onClick={() => void generateInvoice()}
                disabled={generatingInvoice || !canGenerateFromDraft}
              >
                {generatingInvoice
                  ? 'Generating...'
                  : postIssueDelta.active
                  ? postIssueDelta.kind === 'CREDIT_NOTE'
                    ? 'Generate Credit Note'
                    : 'Generate Supplemental Invoice'
                  : readOnlyOrDraftInvoice && readiness.approvedUninvoicedCount === 0
                  ? 'Refresh Draft Invoice'
                  : 'Generate Invoice'}
              </Button>
            )}
            <div className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {activeChargesCount} active{voidedChargesCount > 0 ? ` · ${voidedChargesCount} void` : ''}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Open To Invoice', amount: summary.open, tone: 'text-[rgb(29,78,216)]' },
              { label: 'Invoiced', amount: summary.invoiced, tone: 'text-[var(--accent-gold)]' },
              { label: 'Paid', amount: summary.paid, tone: 'text-[rgb(21,128,61)]' },
              { label: 'Active Total', amount: summary.total, tone: 'text-[var(--text-primary)]' },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {card.label}
                </p>
                <p className={`mt-1.5 text-base font-semibold sm:text-lg ${card.tone}`}>
                  {formatMoney(card.amount, primaryCurrency)}
                </p>
              </div>
            ))}
          </div>

          {/* Status Counts + Disputed / Voided Callout */}
          {(Object.keys(summary.counts).length > 0 || (summary.disputed ?? 0) > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.counts).map(([status, count]) => (
                  <span
                    key={status}
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      statusStyles[status] || statusStyles.DRAFT
                    }`}
                  >
                    {formatLabel(status)}: {count}
                  </span>
                ))}
              </div>
              {(summary.disputed ?? 0) > 0 && (
                <span className="text-xs font-medium text-[rgb(185,28,28)]">
                  Disputed (held from active total): {formatMoney(summary.disputed || 0, primaryCurrency)}
                </span>
              )}
            </div>
          )}

          {/* Linked Invoices Strip (surfaces all invoices including supplemental/credit notes) */}
          {linkedInvoices.length > 1 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Linked Invoices ({linkedInvoices.length})
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {linkedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs"
                  >
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--accent-gold)] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {inv.invoiceNumber}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                        invoiceStatusStyles[inv.status] || invoiceStatusStyles.DRAFT
                      }`}
                    >
                      {formatLabel(inv.status)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Download className="h-3 w-3" />}
                      onClick={() => void downloadInvoice(inv.id)}
                      disabled={downloadingInvoiceId === inv.id}
                    >
                      {downloadingInvoiceId === inv.id ? '...' : 'PDF'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Car Purchase Price Record */}
          {purchasePriceRecord ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      Car Price Record
                    </p>
                    {purchasePriceCharge ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          statusStyles[purchasePriceCharge.status] || statusStyles.APPROVED
                        }`}
                      >
                        Charge: {formatLabel(purchasePriceCharge.status)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{purchasePriceRecord.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Customer ledger reference from {new Date(purchasePriceRecord.transactionDate).toLocaleDateString()}.
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Amount</p>
                  <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    {formatMoney(purchasePriceRecord.amount, primaryCurrency)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                {purchasePriceCharge
                  ? 'Tracked as a Vehicle Purchase charge below and settled separately from shipping expenses in the customer ledger.'
                  : 'Matches the purchase-price entry in Ledger Comparison and is tracked separately from shipping expenses.'}
              </p>
            </div>
          ) : null}

          {/* Post-Issue Delta Banner */}
          {postIssueDelta.active && (
            <div className="rounded-lg border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.10)] p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(180,83,9)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(180,83,9)]">
                    Post-Issue Delta Detected
                  </p>
                  <p className="mt-1 text-sm text-[rgb(120,53,15)]">
                    {postIssueDelta.description}
                    {postIssueDelta.latestIssuedInvoiceNumber
                      ? ` Latest issued invoice: ${postIssueDelta.latestIssuedInvoiceNumber}.`
                      : ''}
                  </p>
                  <p className="mt-2 text-sm text-[rgb(120,53,15)]">
                    The issued invoice stays unchanged. Any newly approved charges will generate a
                    {postIssueDelta.kind === 'CREDIT_NOTE' ? ' credit note' : ' supplemental invoice'} instead of modifying
                    the original document.
                  </p>
                  <p className="mt-2 text-xs text-[rgb(120,53,15)]">
                    Current approved delta: {formatMoney(postIssueDelta.deltaAmount, primaryCurrency)} across{' '}
                    {postIssueDelta.approvedUninvoicedCount} charge
                    {postIssueDelta.approvedUninvoicedCount === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Readiness */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Invoice Readiness
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      readinessStyles[readiness.status]
                    }`}
                  >
                    {readiness.label}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {readiness.totalCharges} active charge{readiness.totalCharges === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{readiness.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Ready</p>
                  <p className="mt-1 text-base font-semibold text-[rgb(29,78,216)]">{readiness.approvedUninvoicedCount}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Review</p>
                  <p className="mt-1 text-base font-semibold text-[rgb(180,83,9)]">{readiness.blockedCount}</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Settled</p>
                  <p className="mt-1 text-base font-semibold text-[var(--accent-gold)]">{readiness.settledCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Contextual Bulk Toolbar */}
          {charges.length > 0 && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: 'ACTIVE', label: `Active (${activeChargesCount})` },
                      { key: 'ALL', label: `All (${charges.length})` },
                      ...(voidedChargesCount > 0
                        ? [{ key: 'VOIDED' as const, label: `Voided (${voidedChargesCount})` }]
                        : []),
                    ] as Array<{ key: ChargeViewFilter; label: string }>
                  ).map((pill) => {
                    const selected = chargeFilter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => setChargeFilter(pill.key)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.14)] text-[var(--accent-gold-text)]'
                            : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>

                {canManageChargeStatus && actionableVisibleCharges.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-primary)] sm:text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)]"
                      checked={allActionableSelected}
                      onChange={toggleAllActionableCharges}
                    />
                    Select all actionable ({actionableVisibleCharges.length})
                  </label>
                )}
              </div>

              {/* Contextual Bulk Controls — only expanded when rows are selected */}
              {canManageChargeStatus && selectedChargeIds.length > 0 && (
                <div className="grid gap-3 border-t border-[var(--border)] pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <FormField
                    id="bulk-charge-note"
                    label={`Bulk Action Note (${selectedChargeIds.length} selected)`}
                    value={bulkNote}
                    onChange={(event) => setBulkNote(event.target.value)}
                    placeholder="Optional note saved onto each selected charge and its audit log..."
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => void bulkUpdateCharges('APPROVED')}
                      disabled={bulkUpdating}
                    >
                      {bulkUpdating ? 'Working...' : `Approve (${selectedChargeIds.length})`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void bulkUpdateCharges('DISPUTED')}
                      disabled={bulkUpdating}
                    >
                      {bulkUpdating ? 'Working...' : `Dispute (${selectedChargeIds.length})`}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void bulkUpdateCharges('VOID')}
                      disabled={bulkUpdating}
                    >
                      {bulkUpdating ? 'Working...' : `Void (${selectedChargeIds.length})`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Charges List: Empty State / Desktop Table / Mobile Cards */}
          {visibleCharges.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-6 py-10 text-center">
              <Wallet className="h-8 w-8 text-[var(--text-secondary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {charges.length === 0 ? 'No shipment charges yet' : 'No charges match this filter'}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {charges.length === 0
                    ? 'Charges will appear here from shipment pricing, expenses, container allocations, or manual additions.'
                    : 'Switch filters above to view voided or all charges.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table with Horizontal Scroll Safety */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--panel)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="w-10 px-3 py-3">Sel</th>
                      <th className="px-3 py-3">Charge</th>
                      <th className="w-36 px-3 py-3">Milestone</th>
                      <th className="w-32 px-3 py-3">Status</th>
                      <th className="w-56 px-3 py-3">Invoice</th>
                      <th className="w-28 px-3 py-3 text-right">Amount</th>
                      <th className="w-28 px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {visibleCharges.map((charge) => (
                      <tr key={charge.id} className="align-top">
                        <td className="px-3 py-3 pt-3.5">
                          {canManageChargeStatus && isActionableCharge(charge) ? (
                            <input
                              type="checkbox"
                              aria-label={`Select ${charge.description}`}
                              className="h-4 w-4 rounded border-[var(--border)]"
                              checked={selectedChargeIds.includes(charge.id)}
                              onChange={() => toggleSelectedCharge(charge.id)}
                            />
                          ) : (
                            <span className="text-[11px] text-[var(--text-secondary)]">-</span>
                          )}
                        </td>
                        <td className="max-w-xs px-3 py-3">
                          <p className="font-medium text-[var(--text-primary)] break-words" title={charge.description}>
                            {charge.description}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {formatChargeCode(charge.chargeCode)} · {formatLabel(charge.category)}
                            {charge.billableAt ? ` · ${new Date(charge.billableAt).toLocaleDateString()}` : ''}
                          </p>
                          {charge.notes ? (
                            <p className="mt-1 text-xs italic text-[var(--text-secondary)]">Note: {charge.notes}</p>
                          ) : null}
                          {renderAuditHistory(charge)}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                          {formatLabel(charge.billingMilestone)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              statusStyles[charge.status] || statusStyles.DRAFT
                            }`}
                          >
                            {formatLabel(charge.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs">{renderInvoiceCell(charge)}</td>
                        <td
                          className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${
                            charge.totalAmount < 0 ? 'text-[rgb(185,28,28)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {formatMoney(charge.totalAmount, charge.currency)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end">{renderRowAction(charge)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Compact Tablet Stacked Cards */}
              <div className="space-y-3 lg:hidden">
                {visibleCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {canManageChargeStatus && isActionableCharge(charge) && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${charge.description}`}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                            checked={selectedChargeIds.includes(charge.id)}
                            onChange={() => toggleSelectedCharge(charge.id)}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)] break-words">{charge.description}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {formatChargeCode(charge.chargeCode)} · {formatLabel(charge.category)} ·{' '}
                            {formatLabel(charge.billingMilestone)}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`shrink-0 font-semibold whitespace-nowrap ${
                          charge.totalAmount < 0 ? 'text-[rgb(185,28,28)]' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {formatMoney(charge.totalAmount, charge.currency)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)]/60 pt-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          statusStyles[charge.status] || statusStyles.DRAFT
                        }`}
                      >
                        {formatLabel(charge.status)}
                      </span>
                      <div>{renderRowAction(charge)}</div>
                    </div>

                    <div className="mt-2.5 border-t border-[var(--border)]/60 pt-2.5 text-xs">
                      {renderInvoiceCell(charge)}
                    </div>

                    {charge.notes ? (
                      <p className="mt-2 text-xs italic text-[var(--text-secondary)]">Note: {charge.notes}</p>
                    ) : null}
                    {renderAuditHistory(charge)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DashboardPanel>

      {/* Confirmation Dialog for Destructive / Invoice State Actions */}
      <ConfirmDialog
        open={Boolean(confirmAction && confirmCopy)}
        onClose={() => {
          if (!invoiceActioningId) setConfirmAction(null);
        }}
        onConfirm={() => void executeConfirmedAction()}
        title={confirmCopy?.title || 'Confirm Action'}
        message={confirmCopy?.message || ''}
        confirmText={confirmCopy?.confirmText || 'Confirm'}
        severity={confirmCopy?.severity || 'warning'}
        loading={Boolean(invoiceActioningId)}
      />

      {/* Add Manual Charge Modal */}
      <Modal
        open={addChargeOpen}
        onClose={() => {
          if (!creatingCharge) setAddChargeOpen(false);
        }}
        title="Add Manual Shipment Charge"
        description="Add a fee, credit, or adjustment directly to this shipment's billing lifecycle."
        size="md"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAddChargeOpen(false)} disabled={creatingCharge}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleCreateManualCharge()} disabled={creatingCharge}>
              {creatingCharge ? 'Adding...' : 'Add Charge'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            id="manual-charge-description"
            label="Description"
            required
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder="e.g., Forklift unloading fee, Demurrage adjustment, Credit..."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              id="manual-charge-category"
              label="Category"
              value={manualCategory}
              onChange={(value) => setManualCategory(String(value))}
              options={manualCategoryOptions}
            />
            <Select
              id="manual-charge-milestone"
              label="Billing Milestone"
              value={manualMilestone}
              onChange={(value) => setManualMilestone(String(value))}
              options={manualMilestoneOptions}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField
              id="manual-charge-quantity"
              label="Quantity"
              type="number"
              value={manualQuantity}
              onChange={(e) => setManualQuantity(e.target.value)}
            />
            <FormField
              id="manual-charge-unit-amount"
              label={`Unit Amount (${primaryCurrency})`}
              type="number"
              required
              value={manualUnitAmount}
              onChange={(e) => setManualUnitAmount(e.target.value)}
              placeholder="Negative for credit"
            />
            <Select
              id="manual-charge-status"
              label="Initial Status"
              value={manualStatus}
              onChange={(value) => setManualStatus(value === 'DRAFT' ? 'DRAFT' : 'APPROVED')}
              options={manualStatusOptions}
            />
          </div>
          <FormField
            id="manual-charge-notes"
            label="Notes"
            multiline
            minRows={2}
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Optional context saved to the charge and audit log."
          />
        </div>
      </Modal>
    </>
  );
}
