'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Database,
  RefreshCw,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Trash2,
  Layers,
  FileJson,
  Check,
  Eye,
  RotateCcw,
  Package,
  Car,
  Building2,
  DollarSign,
  Truck,
  Users,
  Settings as SettingsIcon,
  HelpCircle,
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, StatusBadge, toast } from '@/components/design-system';

interface BackupCategory {
  id: string;
  name: string;
  description: string;
  models: string[];
}

interface StoredBackup {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  timestamp: string;
  version: string;
  scope: 'full' | 'custom';
  categories: string[];
  totalRecords: number;
}

interface BackupApiResponse {
  lastBackupAt: string | null;
  backupPath: string;
  backups: StoredBackup[];
  dbStats: Record<string, number>;
  supportedCategories: BackupCategory[];
}

interface PreviewData {
  valid: boolean;
  version: string;
  timestamp: string;
  scope: string;
  totalRecords: number;
  categoriesAvailable: string[];
  modelsFound: Record<string, number>;
  error?: string;
  filename?: string;
  rawContent?: string;
}

export function BackupDatabaseTab() {
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  // Server state
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [storedBackups, setStoredBackups] = useState<StoredBackup[]>([]);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<BackupCategory[]>([]);

  // Backup configuration
  const [backupMode, setBackupMode] = useState<'full' | 'custom'>('full');
  const [selectedBackupCats, setSelectedBackupCats] = useState<string[]>([]);

  // Restore configuration & preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedRestoreCats, setSelectedRestoreCats] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackupMetadata = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/backup', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load backup data');
      const data: BackupApiResponse = await res.json();

      setLastBackupAt(data.lastBackupAt);
      setStoredBackups(data.backups || []);
      setDbStats(data.dbStats || {});
      setCategories(data.supportedCategories || []);

      if (selectedBackupCats.length === 0 && data.supportedCategories?.length) {
        setSelectedBackupCats(data.supportedCategories.map((c) => c.id));
      }
    } catch (err: any) {
      console.error('Error fetching backup info:', err);
      toast.error('Could not retrieve database backup metadata');
    } finally {
      setLoading(false);
    }
  }, [selectedBackupCats.length]);

  useEffect(() => {
    fetchBackupMetadata();
  }, [fetchBackupMetadata]);

  // Toggle backup category selection
  const handleToggleBackupCat = (catId: string) => {
    setSelectedBackupCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectAllBackupCats = () => {
    setSelectedBackupCats(categories.map((c) => c.id));
  };

  const handleDeselectAllBackupCats = () => {
    setSelectedBackupCats([]);
  };

  // Trigger browser file download of JSON payload
  const downloadJsonFile = (filename: string, content: string | object) => {
    const jsonStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Create Backup
  const handleCreateBackup = async () => {
    if (backupMode === 'custom' && selectedBackupCats.length === 0) {
      toast.error('Please select at least one category to backup');
      return;
    }

    try {
      setCreatingBackup(true);
      toast.info('Generating database snapshot...');

      const catsToSend = backupMode === 'full' ? undefined : selectedBackupCats;
      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup', categories: catsToSend }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create backup');
      }

      toast.success(data.message || 'Backup created successfully!');
      setLastBackupAt(data.lastBackupAt);

      // Automatically download the generated backup JSON
      if (data.backup) {
        downloadJsonFile(data.filename || `jacxi-backup-${new Date().toISOString()}.json`, data.backup);
      }

      await fetchBackupMetadata();
    } catch (err: any) {
      console.error('Create backup error:', err);
      toast.error(err.message || 'Error creating database backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Handle uploaded file inspection
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info(`Analyzing backup file: ${file.name}...`);
      const text = await file.text();

      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', backupContent: text }),
      });

      const preview = await res.json();
      if (!preview.valid) {
        toast.error(preview.error || 'Invalid backup file structure');
        return;
      }

      setPreviewData({
        ...preview,
        filename: file.name,
        rawContent: text,
      });
      setSelectedRestoreCats(preview.categoriesAvailable || []);
      setPreviewModalOpen(true);
    } catch (err: any) {
      console.error('File parsing error:', err);
      toast.error('Failed to read backup file JSON');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle stored backup restoration click
  const handleInspectStoredBackup = async (backup: StoredBackup) => {
    try {
      toast.info(`Inspecting stored backup ${backup.filename}...`);
      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', filename: backup.filename }),
      });

      const preview = await res.json();
      if (!preview.valid) {
        toast.error(preview.error || 'Invalid backup structure');
        return;
      }

      setPreviewData({
        ...preview,
        filename: backup.filename,
      });
      setSelectedRestoreCats(preview.categoriesAvailable || []);
      setPreviewModalOpen(true);
    } catch (err: any) {
      console.error('Preview error:', err);
      toast.error('Failed to inspect backup file');
    }
  };

  // Execute Restoration
  const handleExecuteRestore = async () => {
    if (!previewData) return;
    if (selectedRestoreCats.length === 0) {
      toast.error('Please select at least one category to restore');
      return;
    }

    try {
      setRestoringBackup(true);
      toast.info('Restoring database records with dependency preservation...');

      const payload: any = {
        action: 'restore',
        selectedCategories: selectedRestoreCats,
      };

      if (previewData.rawContent) {
        payload.backupContent = previewData.rawContent;
      } else if (previewData.filename) {
        payload.filename = previewData.filename;
      }

      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Restoration failed');
      }

      toast.success(data.message || `Successfully restored ${data.totalRestored} records!`);
      setPreviewModalOpen(false);
      setPreviewData(null);
      await fetchBackupMetadata();
    } catch (err: any) {
      console.error('Restoration error:', err);
      toast.error(err.message || 'Failed to restore database');
    } finally {
      setRestoringBackup(false);
    }
  };

  // Delete stored backup
  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete backup "${filename}" from server?`)) {
      return;
    }

    try {
      setDeletingFilename(filename);
      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', filename }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete backup');
      }

      toast.success(data.message || 'Backup file deleted');
      await fetchBackupMetadata();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Could not delete backup file');
    } finally {
      setDeletingFilename(null);
    }
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'shipments':
        return <Car className="w-4 h-4 text-amber-500" />;
      case 'containers':
        return <Package className="w-4 h-4 text-emerald-500" />;
      case 'companies':
        return <Building2 className="w-4 h-4 text-sky-500" />;
      case 'financials':
        return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'logistics':
        return <Truck className="w-4 h-4 text-orange-500" />;
      case 'partners':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'settings':
        return <SettingsIcon className="w-4 h-4 text-cyan-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <DashboardGrid className="grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 mb-1 text-[var(--text-secondary)]">
            <Clock className="w-4 h-4 text-[var(--accent-gold)]" />
            <Typography variant="caption" fontWeight="600">LAST BACKUP</Typography>
          </div>
          <Typography variant="h6" fontWeight="700" className="text-[var(--text-primary)]">
            {lastBackupAt ? new Date(lastBackupAt).toLocaleDateString() : 'Never'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {lastBackupAt ? new Date(lastBackupAt).toLocaleTimeString() : 'No recorded backups'}
          </Typography>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 mb-1 text-[var(--text-secondary)]">
            <Car className="w-4 h-4 text-amber-500" />
            <Typography variant="caption" fontWeight="600">LIVE SHIPMENTS</Typography>
          </div>
          <Typography variant="h6" fontWeight="700" className="text-[var(--text-primary)]">
            {dbStats.shipments ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Vehicles in database
          </Typography>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 mb-1 text-[var(--text-secondary)]">
            <Package className="w-4 h-4 text-emerald-500" />
            <Typography variant="caption" fontWeight="600">LIVE CONTAINERS</Typography>
          </div>
          <Typography variant="h6" fontWeight="700" className="text-[var(--text-primary)]">
            {dbStats.containers ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ocean freight containers
          </Typography>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 mb-1 text-[var(--text-secondary)]">
            <DollarSign className="w-4 h-4 text-purple-500" />
            <Typography variant="caption" fontWeight="600">LIVE INVOICES</Typography>
          </div>
          <Typography variant="h6" fontWeight="700" className="text-[var(--text-primary)]">
            {dbStats.invoices ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Customer invoice records
          </Typography>
        </div>
      </DashboardGrid>

      {/* Main Actions: Create Backup vs Restore Database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CREATE BACKUP PANEL */}
        <DashboardPanel
          title="Create Database Backup"
          description="Generate full or custom snapshots and download immediately."
          actions={
            <div className="flex items-center gap-1.5 bg-[var(--background)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setBackupMode('full')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  backupMode === 'full'
                    ? 'bg-[var(--accent-gold)] text-black shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Full Backup
              </button>
              <button
                type="button"
                onClick={() => setBackupMode('custom')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  backupMode === 'custom'
                    ? 'bg-[var(--accent-gold)] text-black shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Custom Selection
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {backupMode === 'full' ? (
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Full System Snapshot
                </div>
                <Typography variant="caption" className="text-[var(--text-secondary)]">
                  Backs up all 8 business categories (Shipments, Containers, Financials, Companies, Logistics, Partners, Settings, and Users).
                </Typography>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Typography variant="caption" className="text-[var(--text-secondary)] font-medium">
                    Select categories to include in custom backup:
                  </Typography>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllBackupCats}
                      className="text-xs text-[var(--accent-gold)] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--text-tertiary)]">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllBackupCats}
                      className="text-xs text-[var(--text-secondary)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isChecked = selectedBackupCats.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleToggleBackupCat(cat.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5'
                            : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--background)]'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          size="small"
                          sx={{ p: 0, mt: 0.25, color: 'var(--border)', '&.Mui-checked': { color: 'var(--accent-gold)' } }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
                            {getCategoryIcon(cat.id)}
                            <span>{cat.name}</span>
                          </div>
                          <Typography variant="caption" className="text-[var(--text-secondary)] line-clamp-1 block mt-0.5 text-[11px]">
                            {cat.description}
                          </Typography>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateBackup}
              disabled={creatingBackup || (backupMode === 'custom' && selectedBackupCats.length === 0)}
              variant="primary"
              fullWidth
              icon={creatingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            >
              {creatingBackup ? 'Creating Snapshot & Compiling...' : 'Create & Download Backup JSON'}
            </Button>
          </div>
        </DashboardPanel>

        {/* RESTORE DATABASE PANEL */}
        <DashboardPanel
          title="Restore Database"
          description="Upload a JSON backup file or choose from stored server backups."
        >
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileSelected}
              className="hidden"
              id="upload-backup-file"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent-gold)] rounded-xl p-6 text-center cursor-pointer transition-all bg-[var(--background)]/50 hover:bg-[var(--accent-gold)]/5 group"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6 text-[var(--accent-gold)]" />
              </div>
              <Typography variant="subtitle2" fontWeight="600" className="text-[var(--text-primary)] mb-1">
                Click to browse or drop backup JSON
              </Typography>
              <Typography variant="caption" className="text-[var(--text-secondary)]">
                Accepts official `jacxi-backup-*.json` files. Content will be analyzed before applying.
              </Typography>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
              <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-400 block mb-0.5">Safe Selective Restoration</span>
                Existing records are updated via relational upsert while unconflicted records remain intact. You can pick exact categories before confirming.
              </div>
            </div>
          </div>
        </DashboardPanel>
      </div>

      {/* STORED SERVER BACKUPS TABLE */}
      <DashboardPanel
        title={`Server Backups (${storedBackups.length})`}
        description="Previous snapshots stored on server. You can download or restore anytime."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBackupMetadata}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh List
          </Button>
        }
      >
        {storedBackups.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <Typography variant="body2">No stored backups found on server.</Typography>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Backup File</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {storedBackups.map((b) => (
                  <tr key={b.filename} className="hover:bg-[var(--background)]/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                        <span className="truncate max-w-xs">{b.filename}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <Chip
                        label={b.scope === 'full' ? 'Full Backup' : 'Custom'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '10px',
                          bgcolor: b.scope === 'full' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: b.scope === 'full' ? '#10B981' : '#F59E0B',
                          fontWeight: 600,
                        }}
                      />
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)] font-mono">
                      {b.sizeFormatted}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          href={`/api/settings/backup/download?filename=${encodeURIComponent(b.filename)}`}
                          icon={<Download className="w-3.5 h-3.5" />}
                        >
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspectStoredBackup(b)}
                          icon={<RotateCcw className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                        >
                          Restore
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBackup(b.filename)}
                          disabled={deletingFilename === b.filename}
                          title="Delete backup"
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      {/* RESTORE PREVIEW & CONFIRMATION MODAL */}
      <Dialog
        open={previewModalOpen}
        onClose={() => !restoringBackup && setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-primary)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--border)', pb: 2 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[var(--accent-gold)]" />
              <Typography variant="h6" fontWeight="700">Restore Database from Backup</Typography>
            </div>
            {previewData?.version && (
              <Chip label={`v${previewData.version}`} size="small" variant="outlined" />
            )}
          </div>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          {previewData && (
            <div className="space-y-4">
              {/* File Summary Card */}
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <Typography variant="caption" className="text-[var(--text-secondary)] block">Source File / Snapshot</Typography>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{previewData.filename || 'Uploaded Backup'}</span>
                </div>
                <div>
                  <Typography variant="caption" className="text-[var(--text-secondary)] block">Created At</Typography>
                  <span className="text-[var(--text-primary)]">{new Date(previewData.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <Typography variant="caption" className="text-[var(--text-secondary)] block">Scope</Typography>
                  <span className="capitalize text-[var(--text-primary)] font-medium">{previewData.scope}</span>
                </div>
                <div>
                  <Typography variant="caption" className="text-[var(--text-secondary)] block">Total Records Found</Typography>
                  <span className="font-bold text-[var(--accent-gold)]">{previewData.totalRecords}</span>
                </div>
              </div>

              {/* Selective Categories Checkbox List */}
              <div>
                <Typography variant="subtitle2" fontWeight="600" className="mb-2">
                  Select categories to restore into database:
                </Typography>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isAvailable = (previewData.categoriesAvailable || []).includes(cat.id);
                    const isChecked = selectedRestoreCats.includes(cat.id);
                    const countInCat = cat.models.reduce((sum, m) => sum + (previewData.modelsFound[m] || 0), 0);

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (!isAvailable) return;
                          setSelectedRestoreCats((prev) =>
                            prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                          !isAvailable
                            ? 'opacity-40 border-[var(--border)] bg-[var(--background)] cursor-not-allowed'
                            : isChecked
                            ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5 cursor-pointer'
                            : 'border-[var(--border)] bg-[var(--background)] cursor-pointer hover:border-[var(--border-hover)]'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={!isAvailable}
                          size="small"
                          sx={{ p: 0, mt: 0.25, color: 'var(--border)', '&.Mui-checked': { color: 'var(--accent-gold)' } }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
                              {getCategoryIcon(cat.id)}
                              <span>{cat.name}</span>
                            </div>
                            <span className="text-[11px] font-mono text-[var(--accent-gold)]">
                              {countInCat} records
                            </span>
                          </div>
                          <Typography variant="caption" className="text-[var(--text-secondary)] block mt-0.5 text-[11px]">
                            {isAvailable ? cat.description : 'Not included in this backup snapshot'}
                          </Typography>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Important Confirmation Notice</span>
                  Restoring will update matching records by unique identifiers (e.g. VINs, container numbers, IDs) and insert missing records. Ensure no team members are performing active bulk edits during restore.
                </div>
              </div>

              {restoringBackup && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>Executing database restore...</span>
                    <span>Please do not close this window</span>
                  </div>
                  <LinearProgress sx={{ bgcolor: 'var(--background)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-gold)' } }} />
                </div>
              )}
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid var(--border)', p: 2 }}>
          <Button
            variant="outline"
            onClick={() => setPreviewModalOpen(false)}
            disabled={restoringBackup}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleExecuteRestore}
            disabled={restoringBackup || selectedRestoreCats.length === 0}
            icon={restoringBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          >
            {restoringBackup ? 'Restoring Records...' : `Confirm & Restore (${selectedRestoreCats.length} Categories)`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
