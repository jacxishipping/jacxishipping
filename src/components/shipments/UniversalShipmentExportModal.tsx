'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Box, 
  Typography, 
  CircularProgress
} from '@mui/material';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer,
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check
} from 'lucide-react';
import { Button, toast } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';
import {
  SHIPMENT_EXPORT_HEADERS,
  CUSTOMER_SHIPMENT_EXPORT_HEADERS,
  exportToPrintableManifest,
  FormattedShipmentExportRow,
} from '@/lib/export';

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

type DatePreset = 'all' | '30days' | 'month' | 'ytd' | 'custom';

export function UniversalShipmentExportModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<UniversalShipmentExportOptions>({});
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showColumnCustomizer, setShowColumnCustomizer] = useState<boolean>(false);

  const isCustomer = Boolean(
    session?.user?.role === 'user' ||
    (session?.user?.role && !hasPermission(session.user.role, 'shipments:read_all'))
  );
  const availableHeaders = useMemo(() => {
    return isCustomer ? CUSTOMER_SHIPMENT_EXPORT_HEADERS : SHIPMENT_EXPORT_HEADERS;
  }, [isCustomer]);

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Initialize selected columns whenever available headers change
  useEffect(() => {
    const allKeys = availableHeaders.map((h) => h.key);
    if (typeof window !== 'undefined') {
      const storageKey = isCustomer ? 'jacxi.export_cols_customer' : 'jacxi.export_cols_admin';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((k: string) => allKeys.includes(k as keyof FormattedShipmentExportRow));
            if (valid.length > 0) {
              setSelectedColumns(valid);
              return;
            }
          }
        } catch {}
      }
    }
    setSelectedColumns(allKeys);
  }, [availableHeaders, isCustomer]);

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

    if (detail.filters?.dateFrom || detail.filters?.dateTo) {
      setDatePreset('custom');
      setCustomFrom(detail.filters.dateFrom || '');
      setCustomTo(detail.filters.dateTo || '');
    } else {
      setDatePreset('all');
      setCustomFrom('');
      setCustomTo('');
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

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      let next: string[];
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          toast.warning('At least one column must be selected');
          return prev;
        }
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      if (typeof window !== 'undefined') {
        const storageKey = isCustomer ? 'jacxi.export_cols_customer' : 'jacxi.export_cols_admin';
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    const allKeys = availableHeaders.map((h) => h.key);
    setSelectedColumns(allKeys);
    if (typeof window !== 'undefined') {
      const storageKey = isCustomer ? 'jacxi.export_cols_customer' : 'jacxi.export_cols_admin';
      localStorage.setItem(storageKey, JSON.stringify(allKeys));
    }
  };

  const handleResetColumns = () => {
    const allKeys = availableHeaders.map((h) => h.key);
    setSelectedColumns(allKeys);
    if (typeof window !== 'undefined') {
      const storageKey = isCustomer ? 'jacxi.export_cols_customer' : 'jacxi.export_cols_admin';
      localStorage.removeItem(storageKey);
    }
    toast.success('Columns reset to default');
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // Format param
      params.append('format', format === 'pdf' ? 'json' : format);

      // Columns filter param
      if (selectedColumns.length > 0) {
        params.append('columns', selectedColumns.join(','));
      }

      // Scope filters
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
      }

      if (selectedStatus && scope !== 'selected') {
        params.set('status', selectedStatus);
      }

      // Calculate Effective Date Range
      let effDateFrom = '';
      let effDateTo = '';

      if (datePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        effDateFrom = d.toISOString().split('T')[0];
      } else if (datePreset === 'month') {
        const d = new Date();
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        effDateFrom = first.toISOString().split('T')[0];
      } else if (datePreset === 'ytd') {
        const d = new Date();
        const first = new Date(d.getFullYear(), 0, 1);
        effDateFrom = first.toISOString().split('T')[0];
      } else if (datePreset === 'custom') {
        effDateFrom = customFrom;
        effDateTo = customTo;
      }

      if (effDateFrom) params.set('dateFrom', effDateFrom);
      if (effDateTo) params.set('dateTo', effDateTo);

      // PDF Manifest Format
      if (format === 'pdf') {
        const response = await fetch(`/api/shipments/export?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Export failed');
        }
        const data = await response.json();
        const activeHeaderObjs = availableHeaders.filter((h) => selectedColumns.includes(h.key));

        exportToPrintableManifest({
          title: options.title || (isCustomer ? 'Customer Vehicle Manifest' : 'Master Shipment Manifest'),
          subtitle: options.subtitle || `${data.count || 0} vehicle record(s)`,
          rows: data.shipments || [],
          headers: activeHeaderObjs,
          isCustomer,
        });

        toast.success('Printable manifest prepared', {
          description: `Generated manifest for ${data.count || 0} vehicle(s)`,
        });

        setOpen(false);
        return;
      }

      // CSV / Excel File Download
      const response = await fetch(`/api/shipments/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = `${isCustomer ? 'my-shipments' : 'shipments'}-export-${new Date().toISOString().split('T')[0]}.csv`;

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
              {options.subtitle || (isCustomer ? 'Download your vehicle shipments in Excel, CSV, or PDF format' : 'Download shipments in Excel, CSV, or PDF format from anywhere')}
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

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, maxHeight: '75vh', overflowY: 'auto' }}>
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

        {/* Date Range Presets */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Date Range Filter
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { id: 'all' as DatePreset, label: 'All Time' },
              { id: '30days' as DatePreset, label: 'Last 30 Days' },
              { id: 'month' as DatePreset, label: 'This Month' },
              { id: 'ytd' as DatePreset, label: 'Year To Date' },
              { id: 'custom' as DatePreset, label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  datePreset === p.id
                    ? 'bg-[var(--accent-gold)]/15 border-[var(--accent-gold)] text-[var(--text-primary)] font-bold'
                    : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
            </div>
          )}
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

        {/* Format Selection (Excel, CSV, PDF Manifest) */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            File Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('excel')}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                format === 'excel'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Excel</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">.csv w/ BOM</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                format === 'csv'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Plain CSV</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">Universal text</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                format === 'pdf'
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">PDF Manifest</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">Printable table</p>
              </div>
            </button>
          </div>
        </div>

        {/* Column Customizer Collapsible */}
        <div className="border border-[var(--border)] rounded-xl bg-[var(--background)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowColumnCustomizer((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-[rgba(var(--text-primary-rgb),0.02)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-gold)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Customize Columns
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20">
                {selectedColumns.length} of {availableHeaders.length} selected
              </span>
            </div>
            {showColumnCustomizer ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
          </button>

          {showColumnCustomizer && (
            <div className="p-3 pt-0 border-t border-[var(--border)]/60">
              <div className="flex items-center justify-between py-2 mb-1.5">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Toggle fields to include or omit in your report:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-[10px] font-bold text-[var(--accent-gold)] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-[var(--border)]">|</span>
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="text-[10px] font-bold text-[var(--text-secondary)] hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {availableHeaders.map((header) => {
                  const isChecked = selectedColumns.includes(header.key);
                  return (
                    <button
                      key={header.key}
                      type="button"
                      onClick={() => toggleColumn(header.key)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-colors ${
                        isChecked
                          ? 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10 text-[var(--text-primary)] font-medium'
                          : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                        isChecked ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-slate-900 font-bold' : 'border-[var(--border)]'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-[11px] truncate">{header.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Included Data Columns Overview */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Report Information
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {isCustomer
              ? 'Includes vehicle details, VIN, lot, auction, title & key status, container #, departure (ETD), arrival (ETA), payment status, shipping fare, and direct tracking link.'
              : 'Includes full vehicle details, keys & title checkpoints, customer profile, container, transit/dispatch tracking, ETD/ETA, shipping fare, purchase cost & ledger balances.'}
          </p>
          {isCustomer && (
            <p className="text-[10px] text-emerald-500 font-medium mt-1">
              Customer Safe: Confidential carrier costs and internal operations records are strictly excluded.
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
          disabled={loading || selectedColumns.length === 0}
          icon={loading ? <CircularProgress size={16} color="inherit" /> : format === 'pdf' ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          iconPosition="start"
        >
          {loading ? 'Preparing Export...' : format === 'pdf' ? 'Print Manifest (PDF)' : `Download ${format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
