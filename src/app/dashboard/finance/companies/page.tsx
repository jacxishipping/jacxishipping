'use client';
import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

import { useEffect, useMemo, useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Download, GitCompareArrows, Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, FormField, IconButton, PageHeader, StatsCard, Tooltip, toast, Modal } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';

/** Bare input with the Jacxi field look (no label) — search fields, table-cell editors. */
const BareInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BareInputProps>(function BareInput(
  { leftIcon, rightIcon, rightElement, error = false, helperText, size = 'small', multiline = false, rows, minRows, inputProps, className, style, ...rest },
  ref,
) {
  const controlClass = [
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
    size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
    leftIcon ? 'pl-9' : '',
    rightIcon || rightElement ? 'pr-9' : '',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    rest.disabled ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? minRows ?? 3}
            aria-invalid={error || undefined}
            style={style}
            className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
          />
        ) : (
          <input
            {...rest}
            {...inputProps}
            ref={ref as React.Ref<HTMLInputElement>}
            aria-invalid={error || undefined}
            style={style}
            className={controlClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightIcon}</span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightElement}</span>
        )}
      </div>
      {helperText && (
        <p className="mt-0.5 text-[0.75rem]" style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>{helperText}</p>
      )}
    </div>
  );
});

type BareInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  rightElement?: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};


/** Bare select with the Jacxi field look (no label) — filter dropdowns. Keeps the native event onChange. */
function BareSelect({ options, placeholder, error = false, size = 'small', leftIcon, className, style, ...rest }: BareSelectProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
      )}
      <select
        {...rest}
        aria-invalid={error || undefined}
        style={style}
        className={[
          'w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors',
          size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
          leftIcon ? 'pl-9' : '',
          'pr-9',
          error
            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
            : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
          rest.disabled ? 'opacity-50' : '',
          className,
        ].filter(Boolean).join(' ')}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={String(option.value)} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
    </div>
  );
}

type BareSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
  error?: boolean;
  size?: 'small' | 'medium';
  leftIcon?: ReactNode;
};


interface Company {
  id: string;
  name: string;
  code: string | null;
  companyType: 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  isDispatch: boolean;
  isShipping: boolean;
  isTransit: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  priceLists?: Array<{
    importedAuctionRateCount: number;
    importedStateRateCount: number;
    sourceFileName: string;
    destinationLabel: string;
    createdAt: string;
  }>;
  _count: {
    ledgerEntries: number;
    priceLists?: number;
  };
}

const emptyForm = { name: '', code: '', email: '', phone: '', address: '', country: '', notes: '', isDispatch: false, isShipping: false, isTransit: false };

export default function CompanyFinancePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT'>('ALL');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Edit state
  const [openEdit, setOpenEdit] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeTypeLabel =
    typeFilter === 'ALL'
      ? 'All Companies'
      : typeFilter === 'SHIPPING'
      ? 'Shipping Companies'
      : typeFilter === 'DISPATCH'
      ? 'Dispatch Companies'
      : 'Transit Companies';

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter !== 'ALL') params.append('companyType', typeFilter);

      const response = await fetch(`/api/finance/companies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch companies');
      }

      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [search, typeFilter]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.isDispatch && !formData.isShipping && !formData.isTransit) {
      toast.error('Select at least one company type');
      return;
    }

    try {
      setCreating(true);
      // Derive companyType for backward compat (first selected)
      const companyType = formData.isDispatch ? 'DISPATCH' : formData.isShipping ? 'SHIPPING' : 'TRANSIT';
      const response = await fetch('/api/finance/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company');
      }

      toast.success('Company created');
      setOpenCreate(false);
      setFormData(emptyForm);
      await fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (company: Company, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditCompany(company);
    setEditForm({
      name: company.name,
      code: company.code || '',
      isDispatch: company.isDispatch ?? company.companyType === 'DISPATCH',
      isShipping: company.isShipping ?? company.companyType === 'SHIPPING',
      isTransit: company.isTransit ?? company.companyType === 'TRANSIT',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      country: company.country || '',
      notes: company.notes || '',
    });
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editCompany || !editForm.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!editForm.isDispatch && !editForm.isShipping && !editForm.isTransit) {
      toast.error('Select at least one company type');
      return;
    }

    try {
      setSaving(true);
      const companyType = editForm.isDispatch ? 'DISPATCH' : editForm.isShipping ? 'SHIPPING' : 'TRANSIT';
      const response = await fetch(`/api/finance/companies/${editCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          code: editForm.code || null,
          companyType,
          isDispatch: editForm.isDispatch,
          isShipping: editForm.isShipping,
          isTransit: editForm.isTransit,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          country: editForm.country || null,
          notes: editForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company');
      }

      toast.success('Company updated');
      setOpenEdit(false);
      setEditCompany(null);
      await fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: Company, event: React.MouseEvent) => {
    event.stopPropagation();

    const hasEntries = company._count.ledgerEntries > 0;
    const message = hasEntries
      ? `Delete "${company.name}" and all ${company._count.ledgerEntries} transaction(s)? This cannot be undone.`
      : `Delete company "${company.name}"? This cannot be undone.`;

    if (!confirm(message)) return;

    try {
      setDeleting(company.id);
      const url = hasEntries
        ? `/api/finance/companies/${company.id}?force=true`
        : `/api/finance/companies/${company.id}`;

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete company');
      }

      toast.success('Company deleted');
      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete company');
    } finally {
      setDeleting(null);
    }
  };

  const stats = useMemo(() => {
    // ⚡ Bolt: Consolidated multiple .reduce() iterations into a single O(N) loop
    let totalDebit = 0;
    let totalCredit = 0;
    let netBalance = 0;

    for (const company of companies) {
      totalDebit += company.totalDebit;
      totalCredit += company.totalCredit;
      netBalance += company.currentBalance;
    }

    return {
      companies: companies.length,
      totalDebit,
      totalCredit,
      netBalance,
    };
  }, [companies]);

  const columns = useMemo<Column<Company>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        sortable: true,
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{row.name}</JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
              {row.code || row.email || 'No reference'}
            </JXBox>
          </JXBox>
        ),
      },
      {
        key: 'companyType',
        header: 'Type',
        align: 'center',
        render: (_, row) => {
          const roles: string[] = [];
          if (row.isDispatch) roles.push('Dispatch');
          if (row.isShipping) roles.push('Shipping');
          if (row.isTransit) roles.push('Transit');
          return roles.length > 0 ? roles.join(' / ') : row.companyType === 'SHIPPING' ? 'Shipping' : row.companyType === 'DISPATCH' ? 'Dispatch' : 'Transit';
        },
      },
      {
        key: 'phone',
        header: 'Contact',
        render: (_, row) => row.phone || row.email || '-',
      },
      {
        key: 'priceLists',
        header: 'Price List',
        align: 'center',
        render: (_, row) => {
          const activeList = row.priceLists?.[0];
          if (!activeList) {
            return (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Not uploaded
              </span>
            );
          }
          const rowCount = activeList.importedAuctionRateCount || activeList.importedStateRateCount;
          return (
            <Tooltip title="View company price list inside ledger" arrow={false}>
              <button type="button" onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/finance/companies/${row.id}?tab=price-list`);
                }} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2.8px', paddingBottom: '2.8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', cursor: 'pointer', transition: 'all 0.15s ease'}}>
                <ReceiptText className="w-3.5 h-3.5" />
                {rowCount} rates
              </button>
            </Tooltip>
          );
        },
      },
      {
        key: 'totalDebit',
        header: 'Total Debit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalDebit),
      },
      {
        key: 'totalCredit',
        header: 'Total Credit',
        align: 'right',
        render: (_, row) => formatCurrency(row.totalCredit),
      },
      {
        key: 'currentBalance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => (
          <span style={{ color: row.currentBalance >= 0 ? 'var(--text-primary)' : 'var(--error)', fontWeight: 600 }}>
            {formatCurrency(row.currentBalance)}
          </span>
        ),
      },
      {
        key: '_count',
        header: 'Transactions',
        align: 'center',
        render: (_, row) => row._count.ledgerEntries,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Edit company" arrow={false}>
              <IconButton icon={<Pencil className="w-4 h-4" />} ariaLabel="Edit company" variant="ghost" size="sm" onClick={(event) => openEditDialog(row, event)} />
            </Tooltip>
            <Tooltip title="Delete company" arrow={false}>
              <IconButton icon={<Trash2 className="w-4 h-4" />} ariaLabel="Delete company" variant="ghost" size="sm" color="error" onClick={(event) => void handleDelete(row, event)} disabled={deleting === row.id} />
            </Tooltip>
          </JXBox>
        ),
      },
    ],
    []
  );

  return (
    <PermissionRoute permission="finance:manage">
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Company Finance Ledgers"
          description="Create and manage ledgers for partner companies"
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4 text-emerald-500" />}
                onClick={() =>
                  openUniversalShipmentExport({
                    title: 'Export Shipments Across Partner Companies',
                    subtitle: 'All company dispatch, shipping, and transit records',
                  })
                }
              >
                Export Shipments
              </Button>
              <Button variant="outline" icon={<GitCompareArrows className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance/price-comparison')}>
                Compare Prices
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
                Add Company
              </Button>
            </JXBox>
          }
        />

        <DashboardPanel noHeaderBorder>
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Companies" value={stats.companies} variant="default" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Debit" value={formatCurrency(stats.totalDebit)} variant="error" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Credit" value={formatCurrency(stats.totalCredit)} variant="success" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Net Balance" value={formatCurrency(stats.netBalance)} variant="info" />
          </DashboardGrid>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '16px', display: 'grid', gap: '12px'}} className="grid-cols-1 grid md:grid-cols-[1fr_220px]">
            <div className="min-w-0 flex-1"><BareInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company by name, code, email" leftIcon={<Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />} size="small" /></div>
            <BareSelect options={[{ value: "ALL", label: 'All Types' }, { value: "SHIPPING", label: 'Shipping' }, { value: "DISPATCH", label: 'Dispatch' }, { value: "TRANSIT", label: 'Transit' }]} value={typeFilter} size="small" onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT')} />
          </JXBox>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '16px'}}>
            <JXBox padding="none" border={false} style={{display: 'inline-flex', alignItems: 'center', paddingLeft: '10px', paddingRight: '10px', paddingTop: '4px', paddingBottom: '4px', borderRadius: '79992px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
              Showing:
              <JXBox padding="none" border={false} component="span" style={{backgroundColor: 'transparent', borderRadius: 0, marginLeft: '6px', fontWeight: 700, color: 'var(--text-primary)'}}>
                {activeTypeLabel}
              </JXBox>
            </JXBox>
          </JXBox>

          {loading ? (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '24px', paddingBottom: '24px', textAlign: 'center', color: 'var(--text-secondary)'}}>Loading companies...</JXBox>
          ) : (
            <DataTable
              data={companies}
              columns={columns}
              keyField="id"
              onRowClick={(row) => router.push(`/dashboard/finance/companies/${row.id}`)}
            />
          )}
        </DashboardPanel>

        <Modal
          open={openCreate}
          onClose={() => !creating && setOpenCreate(false)}
          title="Create Company Ledger"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </>}
        >

            <FormField label="Company Name" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
            <FormField label="Code" value={formData.code} onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <span className="text-sm font-medium text-[var(--text-primary)]">Company Type (select all that apply)</span>
              <div className="flex flex-row flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setFormData((prev) => ({ ...prev, isDispatch: e.target.checked }))} checked={formData.isDispatch} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Dispatch"}</span></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setFormData((prev) => ({ ...prev, isShipping: e.target.checked }))} checked={formData.isShipping} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Shipping"}</span></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setFormData((prev) => ({ ...prev, isTransit: e.target.checked }))} checked={formData.isTransit} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Transit"}</span></label>
              </div>
            </JXBox>
            <FormField label="Email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} />
            <FormField label="Phone" value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            <FormField label="Address" value={formData.address} onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))} />
            <FormField label="Country" value={formData.country} onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))} />
            <FormField label="Notes" multiline rows={3} value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        <Modal
          open={openEdit}
          onClose={() => !saving && setOpenEdit(false)}
          title="Edit Company"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </>}
        >

            <FormField label="Company Name" value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} required />
            <FormField label="Code" value={editForm.code} onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <span className="text-sm font-medium text-[var(--text-primary)]">Company Type (select all that apply)</span>
              <div className="flex flex-row flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setEditForm((prev) => ({ ...prev, isDispatch: e.target.checked }))} checked={editForm.isDispatch} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Dispatch"}</span></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setEditForm((prev) => ({ ...prev, isShipping: e.target.checked }))} checked={editForm.isShipping} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Shipping"}</span></label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" onChange={(e) => setEditForm((prev) => ({ ...prev, isTransit: e.target.checked }))} checked={editForm.isTransit} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>{"Transit"}</span></label>
              </div>
            </JXBox>
            <FormField label="Email" value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} />
            <FormField label="Phone" value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <FormField label="Address" value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} />
            <FormField label="Country" value={editForm.country} onChange={(event) => setEditForm((prev) => ({ ...prev, country: event.target.value }))} />
            <FormField label="Notes" multiline rows={3} value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>
      </DashboardSurface>
    </PermissionRoute>
  );
}