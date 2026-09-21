'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Download, Edit, Columns, Eye, Search, AlignJustify, ListFilter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@mui/material';
import { EmptyState } from '@/components/design-system';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  selectable?: boolean;
  enableColumnVisibility?: boolean;
  initialHiddenColumns?: string[];
  stickyHeader?: boolean;
  zebraStripes?: boolean;
  onRowClick?: (row: T) => void;
  onDelete?: (selectedIds: string[]) => void;
  onEdit?: (row: T) => void;
  onExport?: (selectedRows: T[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkStatusOptions?: { value: string; label: string }[];
  onBulkStatusChange?: (selectedIds: string[], status: string) => void;
  currentPage?: number;
  totalPages?: number;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

type AriaSort = 'ascending' | 'descending' | 'none';

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  enableColumnVisibility = true,
  initialHiddenColumns = [],
  stickyHeader = true,
  zebraStripes = true,
  onRowClick,
  onDelete,
  onEdit,
  onExport,
  onSelectionChange,
  bulkStatusOptions = [],
  onBulkStatusChange,
  currentPage,
  totalPages,
  getRowClassName,
  className,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(initialHiddenColumns)
  );
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const hasActionsColumn = Boolean(onRowClick || onEdit || onDelete);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const visibleColumns = useMemo(() => {
    return columns.filter((column) => !hiddenColumns.has(column.key));
  }, [columns, hiddenColumns]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        if (columns.length - next.size <= 1) {
          return prev;
        }
        next.add(columnKey);
      }
      return next;
    });
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map((row) => String(row[keyField])));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange?.(Array.from(newSelectedIds));
  };

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (onDelete) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = () => {
    if (onExport) {
      const selectedRows = data.filter((row) =>
        selectedIds.has(String(row[keyField]))
      );
      onExport(selectedRows);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!onBulkStatusChange || !bulkStatus) return;
    onBulkStatusChange(Array.from(selectedIds), bulkStatus);
    setBulkStatus('');
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-[var(--accent-gold)]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[var(--accent-gold)]" />
    );
  };

  const getAriaSort = (columnKey: string): AriaSort => {
    if (sortColumn !== columnKey || !sortDirection) {
      return 'none';
    }

    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const getSortButtonLabel = (columnHeader: string, columnKey: string) => {
    if (sortColumn !== columnKey || !sortDirection) {
      return `Sort by ${columnHeader} ascending`;
    }

    if (sortDirection === 'asc') {
      return `Sort by ${columnHeader} descending`;
    }

    return `Clear sorting for ${columnHeader}`;
  };

  useEffect(() => {
    if (!isColumnMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(target) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(target)
      ) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Density Mode Switcher */}
        <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5 text-xs text-[var(--text-secondary)] shadow-xs">
          <button
            type="button"
            onClick={() => setDensity('compact')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
              density === 'compact'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
            )}
            title="Compact row density"
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span>Compact</span>
          </button>
          <button
            type="button"
            onClick={() => setDensity('comfortable')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
              density === 'comfortable'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
            )}
            title="Comfortable row density"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Comfortable</span>
          </button>
        </div>

        {/* Columns Customization */}
        {enableColumnVisibility && (
          <div className="relative">
            <button
              ref={columnButtonRef}
              onClick={() => setIsColumnMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--panel)] hover:bg-[var(--background)] transition-colors shadow-xs"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isColumnMenuOpen}
            >
              <Columns className="h-3.5 w-3.5" />
              Columns
            </button>
            {isColumnMenuOpen && (
              <div
                ref={columnMenuRef}
                className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2 shadow-xl"
                role="menu"
              >
                {columns.map((column) => {
                  const isVisible = !hiddenColumns.has(column.key);
                  const isLastVisible = isVisible && visibleColumns.length === 1;
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
                    >
                      <Checkbox
                        checked={isVisible}
                        onChange={() => toggleColumnVisibility(column.key)}
                        size="small"
                        disabled={isLastVisible}
                        sx={{
                          p: 0.5,
                          color: 'var(--text-secondary)',
                          '&.Mui-checked': { color: 'var(--accent-gold)' },
                        }}
                      />
                      <span className="truncate">{column.header}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Dock */}
      {selectable && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-[var(--border)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-gold)] text-[11px] font-bold text-black">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            {onBulkStatusChange && bulkStatusOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                >
                  <option value="">Status...</option>
                  {bulkStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-black bg-[var(--accent-gold)] hover:brightness-105 rounded-lg transition-all disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}
            {onExport && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--border)] rounded-lg transition-colors border border-[var(--border)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[var(--error)] hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedIds(new Set());
                onSelectionChange?.([]);
              }}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
        <table className="w-full">
          <thead
            className={cn(
              'bg-[var(--panel)] border-b border-[var(--border)]',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {selectable && (
                <th className={cn("w-12 text-left", density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3')}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="small"
                    sx={{
                      p: density === 'compact' ? 0.25 : 0.5,
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': {
                        color: 'var(--accent-gold)',
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: 'var(--accent-gold)',
                      },
                    }}
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? getAriaSort(column.key) : undefined}
                  className={cn(
                    'text-left font-semibold text-[var(--text-primary)]',
                    density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'
                  )}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
                      aria-label={getSortButtonLabel(column.header, column.key)}
                    >
                      <span>{column.header}</span>
                      {getSortIcon(column.key)}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-1 py-1">
                      {column.header}
                    </div>
                  )}
                </th>
              ))}
              {hasActionsColumn && (
                <th
                  scope="col"
                  className={cn(
                    'w-28 text-left font-semibold text-[var(--text-primary)]',
                    density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'
                  )}
                >
                  <span>Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-[var(--background)] divide-y divide-[var(--border)]">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (hasActionsColumn ? 1 : 0)}
                  className="px-4 py-8"
                >
                  <EmptyState
                    icon={<Search />}
                    title="No results found"
                    description="Try adjusting your search or filters"
                  />
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const rowId = String(row[keyField]);
                const isSelected = selectedIds.has(rowId);
                const customRowClassName = getRowClassName?.(row, rowIndex);

                return (
                  <tr
                    key={rowId}
                    data-row-id={rowId}
                    className={cn(
                      'transition-colors',
                      zebraStripes && rowIndex % 2 === 1 && 'bg-[var(--panel)]/40',
                      onRowClick && 'cursor-pointer hover:bg-[var(--panel)]',
                      isSelected && 'bg-[var(--accent-gold)]/5',
                      customRowClassName
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={cn(density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3')} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          size="small"
                          sx={{
                            p: density === 'compact' ? 0.25 : 0.5,
                            color: 'var(--text-secondary)',
                            '&.Mui-checked': {
                              color: 'var(--accent-gold)',
                            },
                          }}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'text-[var(--text-primary)]',
                          density === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'
                        )}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || '-'}
                      </td>
                    ))}
                    {hasActionsColumn && (
                      <td className={cn(density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3')} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onRowClick && (
                            <button
                              type="button"
                              onClick={() => onRowClick(row)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-colors"
                              aria-label={`Open details for row ${rowId}`}
                              title="Open details"
                            >
                              <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                              <span className="sr-only">Open details</span>
                            </button>
                          )}
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="p-1.5 rounded hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-colors"
                              aria-label={`Edit row ${rowId}`}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete([rowId])}
                              className="p-1.5 rounded hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-colors"
                              aria-label={`Delete row ${rowId}`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--error)]" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Showing {sortedData.length} results
            {typeof currentPage === 'number' && typeof totalPages === 'number' ? (
              <> | Page {currentPage} of {totalPages}</>
            ) : null}
          </span>
          {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
        </div>
      )}
    </div>
  );
}
