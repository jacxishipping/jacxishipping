'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  X, 
  Printer, 
  Package, 
  FileText, 
  MessageSquare, 
  SlidersHorizontal, 
  Download, 
  Trash2,
  Send,
  QrCode,
  Sparkles
} from 'lucide-react';
import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from '@/components/design-system/JacxiButton';
import { toast } from '@/components/design-system';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';

export interface BatchItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  consignee?: string;
  phone?: string;
  vin?: string;
}

interface BatchActionsHUDProps {
  selectedItems: BatchItem[];
  entityName?: string; // 'Shipments' | 'Containers' | 'Invoices'
  onClearSelection: () => void;
  onBulkStatusUpdate?: (status: string) => void;
  onBulkAssignContainer?: () => void;
  onBulkThermalPrint?: () => void;
  onBulkMessage?: () => void;
}

export function BatchActionsHUD({
  selectedItems,
  entityName = 'Shipments',
  onClearSelection,
  onBulkStatusUpdate,
  onBulkAssignContainer,
  onBulkThermalPrint,
  onBulkMessage,
}: BatchActionsHUDProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (selectedItems.length === 0) return null;

  const handlePrintLabels = () => {
    setPrinting(true);
    if (onBulkThermalPrint) {
      onBulkThermalPrint();
    } else {
      toast.success(`Generated batch thermal labels for ${selectedItems.length} items`);
    }
    setPrinting(false);
  };

  const handleExportManifest = () => {
    if (entityName === 'Shipments') {
      openUniversalShipmentExport({
        shipmentIds: selectedItems.map((item) => item.id),
        title: `Export Selected (${selectedItems.length}) Shipments`,
        subtitle: 'Export chosen shipments in Excel or CSV format',
      });
      return;
    }

    const csvHeader = 'ID,Title,Subtitle,Status,VIN,Consignee\n';
    const csvRows = selectedItems.map(
      (item) => `"${item.id}","${item.title}","${item.subtitle || ''}","${item.status || ''}","${item.vin || ''}","${item.consignee || ''}"`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Consolidated_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported manifest for ${selectedItems.length} items`);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-slide-up">
      <JXBox
        surface="elevated"
        padding="none"
        className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 !rounded-2xl !bg-[var(--panel)] !border-2 !border-[var(--accent-gold)] jx-elevation-3 jx-spring shadow-2xl backdrop-blur-lg"
        style={{ fontFamily: 'inherit' }}
      >
        {/* Selection Count Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-[var(--accent-gold)] text-white font-bold text-xs shadow-sm">
            {selectedItems.length}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {selectedItems.length} {entityName} Selected
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
              Execute batch operations across active pool
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Batch Thermal QR Button */}
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={handlePrintLabels}
            style={{ fontFamily: 'inherit' }}
            className="flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !rounded-xl !border !border-[var(--border)] !bg-[var(--background)] hover:!border-[var(--accent-gold)] !text-xs !font-semibold !text-[var(--text-primary)] shadow-sm"
            title="Batch Print 4x6 Thermal Yard QR Stickers"
          >
            <QrCode className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Thermal Badges</span>
          </JacxiButton>

          {/* Bulk Assign Container */}
          {onBulkAssignContainer && (
            <JacxiButton
              type="button"
              variant="outline"
              tone="primary"
              onClick={onBulkAssignContainer}
              style={{ fontFamily: 'inherit' }}
              className="flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !rounded-xl !border !border-[var(--border)] !bg-[var(--background)] hover:!border-[var(--accent-gold)] !text-xs !font-semibold !text-[var(--text-primary)] shadow-sm"
            >
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Assign Container</span>
            </JacxiButton>
          )}

          {/* Consolidated Manifest Export */}
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={handleExportManifest}
            style={{ fontFamily: 'inherit' }}
            className="flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !rounded-xl !border !border-[var(--border)] !bg-[var(--background)] hover:!border-[var(--accent-gold)] !text-xs !font-semibold !text-[var(--text-primary)] shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export Manifest</span>
          </JacxiButton>

          {/* Bulk Notification */}
          {onBulkMessage && (
            <JacxiButton
              type="button"
              variant="outline"
              tone="primary"
              onClick={onBulkMessage}
              style={{ fontFamily: 'inherit' }}
              className="flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !rounded-xl !border !border-[var(--border)] !bg-[var(--background)] hover:!border-[var(--accent-gold)] !text-xs !font-semibold !text-[var(--text-primary)] shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Notify</span>
            </JacxiButton>
          )}

          {/* Clear Selection X Button */}
          <JacxiButton
            type="button"
            variant="outline"
            tone="primary"
            onClick={onClearSelection}
            style={{ fontFamily: 'inherit' }}
            className="!h-auto !min-h-0 !p-1.5 !rounded-xl !border-0 !bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!bg-[var(--background)] ml-1 !shadow-none"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </JacxiButton>
        </div>
      </JXBox>
    </div>
  );
}
