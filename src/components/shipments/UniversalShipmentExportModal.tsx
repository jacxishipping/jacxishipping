'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Box, 
  Typography, 
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button, toast } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';

export interface ShipmentExportFilters {
  query?: string;
  status?: string;
  workflowStage?: string;
  yardReceived?: string;
  containerId?: string;
  transitId?: string;
  dispatchId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UniversalShipmentExportOptions {
  filters?: ShipmentExportFilters;
  shipmentIds?: string[];
  title?: string;
  subtitle?: string;
}

export function openUniversalShipmentExport(options?: UniversalShipmentExportOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('open-shipment-export', {
      detail: options || {},
    })
  );
}

export function UniversalShipmentExportModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<UniversalShipmentExportOptions>({});
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const isCustomer = session?.user?.role === 'user' || (session?.user?.role && !hasPermission(session.user.role, 'shipments:read_all'));


  const handleOpen = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<UniversalShipmentExportOptions>;
    const detail = customEvent.detail || {};
    setOptions(detail);
    if (detail.shipmentIds && detail.shipmentIds.length > 0) {
      setScope('selected');
    } else if (
      detail.filters?.query || 
      detail.filters?.status || 
      detail.filters?.containerId ||
      detail.filters?.transitId ||
      detail.filters?.dispatchId ||
      detail.filters?.userId
    ) {
      setScope('filtered');
    } else {
      setScope('all');
    }
    if (detail.filters?.status) {
      setSelectedStatus(detail.filters.status);
    } else {
      setSelectedStatus('');
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('open-shipment-export', handleOpen);
    return () => {
      window.removeEventListener('open-shipment-export', handleOpen);
    };
  }, [handleOpen]);

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('format', format);

      if (scope === 'selected' && options.shipmentIds && options.shipmentIds.length > 0) {
        params.append('ids', options.shipmentIds.join(','));
      } else if (scope === 'filtered' && options.filters) {
        const { filters } = options;
        if (filters.query) params.append('query', filters.query);
        if (filters.status) params.append('status', filters.status);
        if (filters.workflowStage) params.append('workflowStage', filters.workflowStage);
        if (filters.yardReceived) params.append('yardReceived', filters.yardReceived);
        if (filters.containerId) params.append('containerId', filters.containerId);
        if (filters.transitId) params.append('transitId', filters.transitId);
        if (filters.dispatchId) params.append('dispatchId', filters.dispatchId);
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
      }

      if (selectedStatus && scope !== 'selected') {
        params.set('status', selectedStatus);
      }

      const response = await fetch(`/api/shipments/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = `shipments-export-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'csv' : 'csv'}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          downloadFilename = match[1];
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export completed successfully', {
        description: `Downloaded ${downloadFilename}`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Export download error:', error);
      toast.error('Failed to export shipments', {
        description: 'Please check your connection or try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasSpecificIds = Boolean(options.shipmentIds && options.shipmentIds.length > 0);
  const hasActiveFilters = Boolean(
    options.filters?.query ||
    options.filters?.status ||
    options.filters?.containerId ||
    options.filters?.transitId ||
    options.filters?.dispatchId ||
    options.filters?.userId
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'var(--panel)',
          backgroundImage: 'none',
          border: '1px solid var(--border)',
          borderRadius: 3,
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          color: 'var(--text-primary)',
        },
      }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20 shadow-xs">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {options.title || (isCustomer ? 'Export My Shipments' : 'Export Shipments')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.2 }}>
              {options.subtitle || (isCustomer ? 'Download your vehicle shipments in Excel or CSV format' : 'Download shipments in Excel or CSV format from anywhere')}
            </Typography>
          </div>
        </div>
        <button
          onClick={handleClose}
          type="button"
          disabled={loading}
          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Scope Selection */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Export Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                scope === 'all'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)]/40'
              }`}
            >
              <span className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                {isCustomer ? 'All My Shipments' : 'All Shipments'}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                {isCustomer ? 'Export all your shipments' : 'Export the entire inventory'}
              </span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  scope === 'filtered'
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                    : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)]/40'
                }`}
              >
                <span className="text-xs font-bold text-[var(--text-primary)] mb-0.5">Current Filter</span>
                <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  {options.filters?.query ? `Search: "${options.filters.query}"` : 'Active search / view'}
                </span>
              </button>
            )}

            {hasSpecificIds && (
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  scope === 'selected'
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                    : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)]/40'
                }`}
              >
                <span className="text-xs font-bold text-[var(--text-primary)] mb-0.5">Selected Only</span>
                <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  {options.shipmentIds?.length} chosen record(s)
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Status Filter when exporting All or Filtered */}
        {scope !== 'selected' && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Status Filter (Optional)
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
            >
              <option value="">All Statuses (No Status Filter)</option>
              <option value="ON_HAND">On Hand (Yard / Warehouse)</option>
              <option value="DISPATCHING">Dispatching (Inland Towing)</option>
              <option value="IN_TRANSIT">In Transit (Ocean Container)</option>
              <option value="IN_TRANSIT_TO_DESTINATION">In Transit To Destination</option>
              <option value="RELEASED">Released (Ready for Pickup)</option>
              <option value="DELIVERED">Delivered (Completed)</option>
            </select>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            File Format
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFormat('excel')}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                format === 'excel'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Excel (.csv / BOM)</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Optimized for Excel & Sheets</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                format === 'csv'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Standard CSV</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Universal plain text CSV</p>
              </div>
            </button>
          </div>
        </div>

        {/* Included Data Columns Overview */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Included Columns in Export
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {isCustomer
              ? 'Vehicle (Year/Make/Model), VIN, Lot #, Auction, Vehicle Type, Color, Status, Yard Received, Container #, Origin & Destination Ports, ETA, Payment Status, and Created Date.'
              : 'Vehicle Year/Make/Model, VIN, Lot #, Auction, Status, Yard Received, Container #, Transit #, Dispatch #, Origin & Destination Ports, ETA, Customer details, Purchase Price, Amount Paid, and Balance.'}
          </p>
          {isCustomer && (
            <p className="text-[10px] text-emerald-500 font-medium mt-1">
              Customer View: Only your authorized vehicle and shipment tracking data is exported.
            </p>
          )}
        </div>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleExport}
          disabled={loading}
          icon={loading ? <CircularProgress size={16} color="inherit" /> : <Download className="w-4 h-4" />}
          iconPosition="start"
        >
          {loading ? 'Preparing Export...' : `Download ${format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
