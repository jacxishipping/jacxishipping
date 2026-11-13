"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  Download,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  Drawer, 
  StatusBadge, 
  Button, 
  CopyButton, 
  Skeleton
} from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';

interface InvoiceQuickPeekProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expenseSource?: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  paidAmount?: number;
  user?: {
    id?: string;
    name: string | null;
    email: string;
  };
  container?: {
    id: string;
    containerNumber: string;
  } | null;
  shipment?: {
    id: string;
    vehicleVIN?: string | null;
    vehicleYear?: number | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
  } | null;
  items?: InvoiceItem[];
}

export default function InvoiceQuickPeek({
  invoiceId,
  open,
  onClose,
}: InvoiceQuickPeekProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoiceId) {
      setInvoice(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) throw new Error('Failed to load invoice');
        const data = await res.json();
        if (!cancelled) {
          setInvoice(data.invoice || data);
        }
      } catch (err) {
        console.error('Error loading invoice quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        invoice ? (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {invoice.invoiceNumber}
            </span>
            <CopyButton value={invoice.invoiceNumber} label="Invoice Number" />
          </div>
        ) : (
          'Invoice Details'
        )
      }
      description={
        invoice?.issueDate
          ? `Issued on ${new Date(invoice.issueDate).toLocaleDateString()}`
          : undefined
      }
      badge={invoice ? <StatusBadge status={invoice.status} /> : undefined}
      actions={
        invoice && (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <div style={{display: 'flex', gap: '8px'}}>
              <Button
                href={`/dashboard/invoices/${invoice.id}`}
                onClick={onClose}
                variant="primary"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full Invoice
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
      ) : invoice ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          {/* Summary Financials Banner */}
          <div style={{padding: '20px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div>
              <span style={{fontWeight: 600, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em'}} className="text-[0.75rem]">
                Total Invoiced Amount
              </span>
              <p style={{fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary, #111827)', marginTop: '2px'}}>
                {formatCurrency(invoice.total || 0)}
              </p>
            </div>
            <StatusBadge status={invoice.status} size="md" />
          </div>

          {/* Key Metadata Cards */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            {/* Customer */}
            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <User className="w-4 h-4 text-blue-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">Billed To</span>
              </div>
              <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                {invoice.user?.name || invoice.user?.email || 'Client'}
              </p>
            </div>

            {/* Due Date */}
            <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                <Calendar className="w-4 h-4 text-amber-600" />
                <span style={{fontWeight: 600}} className="text-[0.75rem]">Payment Due</span>
              </div>
              <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #111827)'}} className="truncate">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}
              </p>
            </div>

            {/* Linked Container */}
            {invoice.container && (
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span style={{fontWeight: 600}} className="text-[0.75rem]">Container</span>
                </div>
                <Link
                  href={`/dashboard/containers/${invoice.container.id}`}
                  onClick={onClose}
                  style={{ textDecoration: 'none' }}
                >
                  <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-gold, #D4AF37)', fontFamily: 'monospace'}} className="truncate">
                    {invoice.container.containerNumber}
                  </p>
                </Link>
              </div>
            )}

            {/* Linked Shipment */}
            {invoice.shipment && (
              <div style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #6B7280)', marginBottom: '4px'}}>
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span style={{fontWeight: 600}} className="text-[0.75rem]">Cargo Vehicle</span>
                </div>
                <Link
                  href={`/dashboard/shipments/${invoice.shipment.id}`}
                  onClick={onClose}
                  style={{ textDecoration: 'none' }}
                >
                  <p style={{whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-gold, #D4AF37)'}} className="truncate">
                    {[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                  </p>
                </Link>
              </div>
            )}
          </div>

          {/* Line Items List */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <p style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary, #111827)'}}>
              Itemized Line Items ({invoice.items?.length || 0})
            </p>

            {invoice.items && invoice.items.length > 0 ? (
              <div style={{border: '1px solid var(--border, #E5E7EB)', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'var(--panel-bg, #FFFFFF)'}}>
                <div className="grid grid-cols-12 bg-[var(--background,#F9FAFB)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary,#6B7280)] border-b border-[var(--border,#E5E7EB)]">
                  <div className="col-span-7">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>
                <div className="divide-y divide-[var(--border,#E5E7EB)] max-h-[220px] overflow-y-auto">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center px-3 py-2 text-xs">
                      <div className="col-span-7 font-medium text-[var(--text-primary,#111827)] truncate">
                        {item.description}
                      </div>
                      <div className="col-span-2 text-center text-gray-500">
                        {item.quantity}
                      </div>
                      <div className="col-span-3 text-right font-semibold text-[var(--text-primary,#111827)]">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{padding: '24px', border: '1px dashed var(--border, #E5E7EB)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-secondary, #6B7280)'}}>
                <p className="text-[0.875rem]">No individual line items specified.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={{color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '32px', paddingBottom: '32px'}} className="text-[0.875rem]">
          No invoice selected.
        </p>
      )}
    </Drawer>
  );
}
