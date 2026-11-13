'use client';

import React from 'react';
import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { CheckSquare, X, ChevronDown, Download, QrCode, Trash2, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/design-system';

export interface BulkActionOption {
  label: string;
  value: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onBulkStatusChange?: (status: string) => void;
  statusOptions?: BulkActionOption[];
  onBulkExport?: () => void;
  onBulkPrintQR?: () => void;
  onBulkAssignContainer?: () => void;
  onBulkDelete?: () => void;
  customActions?: React.ReactNode;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  statusOptions = [],
  onBulkExport,
  onBulkPrintQR,
  onBulkAssignContainer,
  onBulkDelete,
  customActions,
}: BulkActionBarProps) {
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <JXBox
      surface="elevated"
      padding="none"
      className="fixed bottom-6 left-1/2 z-[1000] flex max-w-[92vw] -translate-x-1/2 items-center gap-4 !rounded-xl px-5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderTop: '2px solid var(--accent-gold)',
        fontFamily: 'inherit',
      }}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            backgroundColor: 'rgba(var(--accent-gold-rgb), 0.15)',
            color: 'var(--accent-gold)',
          }}
        >
          <CheckSquare size={16} />
        </div>
        <JXTypography
          variant="body"
          className="!whitespace-nowrap !text-[0.85rem] !font-bold !text-[var(--text-primary)]"
        >
          {selectedCount} selected
        </JXTypography>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          icon={<X size={12} />}
          className="!px-1.5 !py-0.5 !text-[0.7rem] !h-auto !min-w-0 !border-0 !text-[var(--text-secondary)]"
        >
          Deselect
        </Button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-[var(--border)]" />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.length > 0 && onBulkStatusChange && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              icon={<RefreshCw size={14} />}
            >
              Update Status <ChevronDown size={14} style={{ marginLeft: 4 }} />
            </Button>
            {showStatusMenu && (
              <JXBox
                surface="elevated"
                padding="none"
                className="absolute bottom-full left-0 z-[1001] mb-2 min-w-[180px] !rounded-lg py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                style={{
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              >
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onBulkStatusChange(opt.value);
                      setShowStatusMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-[0.8rem] font-semibold text-[var(--text-primary)] hover:bg-[var(--background)] hover:text-[var(--accent-gold-text)] transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </JXBox>
            )}
          </div>
        )}

        {onBulkAssignContainer && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkAssignContainer}
            icon={<Layers size={14} />}
          >
            Assign Container
          </Button>
        )}

        {onBulkPrintQR && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkPrintQR}
            icon={<QrCode size={14} />}
          >
            Print Yard QR
          </Button>
        )}

        {onBulkExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkExport}
            icon={<Download size={14} />}
          >
            Export Selected
          </Button>
        )}

        {customActions}

        {onBulkDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            icon={<Trash2 size={14} />}
            className="!text-[var(--error)] !border-[rgba(239,68,68,0.3)]"
          >
            Delete
          </Button>
        )}
      </div>
    </JXBox>
  );
}
