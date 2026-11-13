'use client';
import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { Search } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText,
  CreditCard,
  ArrowRight,
  Info
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Alert, Breadcrumbs, Button, DashboardPageSkeleton, EmptyState, FormField, LoadingState, PageHeader, Select, toast, Modal, MilestoneStepper } from '@/components/design-system';
import AdminRoute from '@/components/auth/AdminRoute';

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


interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  lotNumber?: string | null;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string | null;
  price?: number;
  purchasePrice?: number | null;
  serviceType?: string;
  amountDue?: number;
  purchaseAmountDue?: number;
  expenseAmountDue?: number;
  paymentStatus: string;
}

interface PaymentAllocation {
  shipmentId: string;
  trackingNumber: string;
  vehicleInfo: string;
  amountDue: number;
  amountToPay: number;
}

type PaymentCategory = 'PURCHASE_PRICE' | 'EXPENSES';

const paymentCategoryLabels: Record<PaymentCategory, string> = {
  PURCHASE_PRICE: 'Car Purchase Price',
  EXPENSES: 'Expenses',
};

const steps = ['Select Customer', 'Choose Shipments', 'Payment Details', 'Review & Submit'];

export default function RecordPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('PURCHASE_PRICE');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [session, status, router]);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedShipmentIds([]);
      setShipmentSearch('');
      setCustomerBalance(null);
      fetchUserShipments(selectedUserId);
      fetchCustomerBalance(selectedUserId);
    } else {
      setShipments([]);
      setSelectedShipmentIds([]);
      setShipmentSearch('');
      setCustomerBalance(null);
      setActiveStep(0);
    }
  }, [selectedUserId]);

  useEffect(() => {
    setSelectedShipmentIds([]);
    setAmount('');
  }, [paymentCategory]);

  // Auto-fill amount when shipments are selected
  useEffect(() => {
    if (selectedShipmentIds.length > 0 && !amount) {
      const total = calculateTotalSelected();
      setAmount(total.toFixed(2));
    }
  }, [selectedShipmentIds, paymentCategory]);

  const getShipmentDueForCategory = (shipment: Shipment) =>
    paymentCategory === 'PURCHASE_PRICE'
      ? shipment.purchaseAmountDue || 0
      : shipment.expenseAmountDue || 0;

  const fetchUsers = async () => {
    try {
      let allUsers: User[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;
      while (hasMore) {
        const response = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) break;
        const data = await response.json();
        allUsers = [...allUsers, ...(data.users || [])];
        hasMore = allUsers.length < (data.total || 0);
        page++;
      }
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchCustomerBalance = async (userId: string) => {
    try {
      setLoadingBalance(true);
      const response = await fetch(`/api/ledger?recalc=true&userId=${userId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        setCustomerBalance(data.summary?.currentBalance ?? 0);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchUserShipments = async (userId: string) => {
    try {
      setLoadingShipments(true);
      const response = await fetch(`/api/shipments?userId=${userId}&limit=100&includeFinancial=true`);
      if (response.ok) {
        const data = await response.json();
        const dueShipments = (data.shipments as Shipment[])
          .filter(
            (s) =>
              s.paymentStatus !== 'CANCELLED' &&
              s.paymentStatus !== 'REFUNDED' &&
              (s.amountDue || 0) > 0
          );
        setShipments(dueShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to load shipments');
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShipmentToggle = (shipmentId: string) => {
    setSelectedShipmentIds((prev) => {
      const newSelection = prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [shipmentId]; // only one shipment at a time
      
      // Auto-fill amount with the outstanding balance for the selected payment category
      if (newSelection.length === 1) {
        const selected = shipments.find(s => s.id === newSelection[0]);
        const outstandingAmount = selected ? getShipmentDueForCategory(selected) : 0;
        if (outstandingAmount > 0) {
          setAmount(outstandingAmount.toFixed(2));
        } else {
          setAmount('');
        }
      } else {
        setAmount('');
      }
      
      return newSelection;
    });
  };

  const calculateTotalSelected = () => {
    const selectedSet = new Set(selectedShipmentIds);
    let total = 0;
    for (const s of shipments) {
      if (selectedSet.has(s.id)) {
        total += getShipmentDueForCategory(s);
      }
    }
    return total;
  };

  const calculatePaymentAllocation = (): PaymentAllocation[] => {
    const paymentAmount = parseFloat(amount) || 0;
    const allocations: PaymentAllocation[] = [];
    let remainingAmount = paymentAmount;

    const selectedShips = shipments.filter(s => selectedShipmentIds.includes(s.id));

    for (const shipment of selectedShips) {
      const amountDue = getShipmentDueForCategory(shipment);
      const amountToPay = Math.min(remainingAmount, amountDue);
      remainingAmount -= amountToPay;
      allocations.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        vehicleInfo: `${shipment.vehicleMake} ${shipment.vehicleModel}`,
        amountDue,
        amountToPay,
      });
    }

    return allocations;
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedUserId) {
      toast.error('Please select a customer');
      return;
    }
    if (activeStep === 1 && selectedShipmentIds.length === 0) {
      toast.error('Please select at least one shipment');
      return;
    }
    if (activeStep === 2) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedUserId || selectedShipmentIds.length === 0 || !amount || parseFloat(amount) <= 0) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ledger/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          shipmentIds: selectedShipmentIds,
          amount: parseFloat(amount),
          paymentCategory,
          paymentMethod,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment recorded successfully!');
        setShowConfirmDialog(false);
        setTimeout(() => {
          router.push('/dashboard/finance');
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('An error occurred while recording the payment');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedAmount = calculateTotalSelected();
  const selectedUser = users.find(u => u.id === selectedUserId);
  const paymentAmount = parseFloat(amount) || 0;
  const paymentAllocations = calculatePaymentAllocation();
  const isPartialPayment = paymentAmount < totalSelectedAmount && paymentAmount > 0;

  if (status === 'loading') {
    return (
      <AdminRoute>
        <DashboardPageSkeleton />
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
          <Breadcrumbs />
        </JXBox>

        <PageHeader
          title="Record Shipment Payment"
          description="Record either a car purchase payment or an expense payment for a shipment"
          actions={
            <Link href="/dashboard/finance" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Finance
              </Button>
            </Link>
          }
        />

        {/* Progress Stepper */}
        <JXBox padding="none" border={false} style={{borderRadius: 0, paddingLeft: '32px', paddingRight: '32px', paddingTop: '24px', paddingBottom: '24px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)'}}>
          <MilestoneStepper steps={steps.map((label, index) => ({ id: String(index), label: label }))} currentStepId={String(activeStep)} />
        </JXBox>

        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingBottom: '32px', paddingTop: '24px'}}>
          {/* Step 1: Customer Selection */}
          {activeStep === 0 && (
            <DashboardPanel
              title="Step 1: Select Customer"
              description="Choose the customer who made the payment"
            >
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {/* Search field */}
                <div className="min-w-0 flex-1"><BareInput placeholder="Search by name or email..." value={customerSearch} onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedUserId) setSelectedUserId('');
                  }} autoComplete="off" leftIcon={<Search className="mr-2 h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} size="small" /></div>

                {/* Selected customer display */}
                {selectedUserId && (() => {
                  const sel = users.find(u => u.id === selectedUserId);
                  return sel ? (
                    <>
                      <JXBox padding="none" border={false} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', border: '2px solid var(--accent-gold)', backgroundColor: 'rgba(201,155,47,0.08)'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                            {sel.name || sel.email}
                          </JXBox>
                          {sel.name && (
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{sel.email}</JXBox>
                          )}
                        </JXBox>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedUserId(''); setCustomerSearch(''); }}
                        >
                          Change
                        </Button>
                      </JXBox>

                      {/* Account balance status */}
                      {loadingBalance ? (
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', paddingTop: '8px', paddingBottom: '8px'}}>Checking account balance...</JXBox>
                      ) : customerBalance !== null && (
                        <Alert severity={customerBalance > 0 ? 'warning' : 'info'} variant="subtle" className="font-medium">
                          {customerBalance > 0
                            ? `Outstanding balance: ${formatCurrency(customerBalance)} — record payment to reduce the balance.`
                            : customerBalance < 0
                            ? `Customer has ${formatCurrency(-customerBalance)} credit on account.`
                            : `No outstanding balance on this account.`}
                        </Alert>
                      )}
                    </>
                  ) : null;
                })()}

                {/* Search results */}
                {!selectedUserId && customerSearch.trim() && (() => {
                  const q = customerSearch.toLowerCase();
                  const results = users.filter(
                    u =>
                      (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
                  );
                  return (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto'}}>
                      {results.length === 0 ? (
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                          No customers found
                        </JXBox>
                      ) : (
                        results.map((user, idx) => (
                          <JXBox padding="none" border={false} key={user.id} onClick={() => {
                              setSelectedUserId(user.id);
                              setCustomerSearch('');
                            }} style={{borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', cursor: 'pointer', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', backgroundColor: 'var(--surface)', transition: 'background 0.15s'}}>
                            <User className="w-4 h-4" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)'}}>
                                {user.name || user.email}
                              </JXBox>
                              {user.name && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>{user.email}</JXBox>
                              )}
                            </JXBox>
                          </JXBox>
                        ))
                      )}
                    </JXBox>
                  );
                })()}

                {selectedUserId && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', display: 'flex', justifyContent: 'flex-end'}}>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      icon={<ArrowRight className="w-4 h-4" />}
                      disabled={loadingBalance}
                    >
                      Continue to Shipments
                    </Button>
                  </JXBox>
                )}
              </JXBox>
            </DashboardPanel>
          )}

          {/* Step 2: Shipment Selection */}
          {activeStep === 1 && (
            <DashboardPanel
              title="Step 2: Select Vehicle Shipment"
              description={`Choose the shipment and payment category — ${selectedUser?.name || selectedUser?.email}`}
            >
              {loadingShipments ? (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, textAlign: 'center', paddingTop: '32px', paddingBottom: '32px'}}>
                  <LoadingState message="Loading shipments..." />
                </JXBox>
              ) : shipments.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="w-12 h-12" />}
                  title="No Shipments With Outstanding Balance"
                  description="This customer has no shipments with an outstanding balance"
                />
              ) : (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div className="min-w-0 flex-1"><Select label="Payment Category" options={Object.entries(paymentCategoryLabels).map(([value, label]) => ({ value, label }))} value={paymentCategory} size="small" required onChange={(val) => setPaymentCategory(val as PaymentCategory)} /></div>

                  {(() => {
                    const q = shipmentSearch.trim().toLowerCase();
                    const filtered = q
                      ? shipments.filter(
                          (s) => {
                            const vin = (s.vehicleVIN || '').toLowerCase();
                            const lot = (s.lotNumber || '').toLowerCase();
                            return (vin.includes(q) || lot.includes(q)) && getShipmentDueForCategory(s) > 0;
                          }
                        )
                      : shipments.filter((shipment) => getShipmentDueForCategory(shipment) > 0);
                    return (
                      <>
                        <Alert severity="info" icon={<Info className="w-5 h-5" />} variant="subtle">
                          Enter VIN or Lot Number to find the vehicle. The list shows shipments with outstanding {paymentCategoryLabels[paymentCategory].toLowerCase()} balances.
                        </Alert>

                        <div className="min-w-0 flex-1"><BareInput placeholder="Enter VIN or Lot Number..." value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} autoComplete="off" leftIcon={<Search className="mr-2 h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} size="small" /></div>

                        {filtered.length === 0 ? (
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '24px', paddingBottom: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                            {q ? 'No shipment matches this VIN or Lot Number for this payment category' : `No shipments have outstanding ${paymentCategoryLabels[paymentCategory].toLowerCase()} balances`}
                          </JXBox>
                        ) : filtered.map((shipment) => (
                    <JXBox padding="none" border={false} key={shipment.id} style={{padding: '20px', border: '2px solid', borderColor: selectedShipmentIds.includes(shipment.id) 
                          ? 'var(--accent-gold)' 
                          : 'var(--border)', borderRadius: '16px', backgroundColor: selectedShipmentIds.includes(shipment.id) 
                          ? 'rgba(201, 155, 47, 0.08)' 
                          : 'transparent', cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => handleShipmentToggle(shipment.id)}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px'}}>
                        <input type="checkbox" onChange={() => handleShipmentToggle(shipment.id)} checked={selectedShipmentIds.includes(shipment.id)} style={{color: 'var(--accent-gold)'}} className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" />
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}}>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px'}}>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                              {shipment.trackingNumber}
                            </JXBox>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontSize: '0.7rem', backgroundColor: shipment.paymentStatus === 'FAILED' ? 'rgba(var(--error-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)', color: shipment.paymentStatus === 'FAILED' ? 'var(--error)' : 'var(--warning)'}}>{shipment.paymentStatus}</span>
                          </JXBox>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                            {shipment.vehicleMake} {shipment.vehicleModel}
                          </JXBox>
                          {shipment.vehicleVIN && (
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                              VIN: {shipment.vehicleVIN}
                            </JXBox>
                          )}
                          {shipment.lotNumber && (
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                              Lot: {shipment.lotNumber}
                            </JXBox>
                          )}
                        </JXBox>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, textAlign: 'right'}}>
                          <>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                              {paymentCategoryLabels[paymentCategory]} Due
                            </JXBox>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
                              {formatCurrency(getShipmentDueForCategory(shipment))}
                            </JXBox>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2.8px'}}>
                              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: paymentCategory === 'PURCHASE_PRICE' ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: paymentCategory === 'PURCHASE_PRICE' ? 700 : 500}}>
                                Purchase due: {formatCurrency(shipment.purchaseAmountDue || 0)}
                              </JXBox>
                              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: paymentCategory === 'EXPENSES' ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: paymentCategory === 'EXPENSES' ? 700 : 500}}>
                                Expense due: {formatCurrency(shipment.expenseAmountDue || 0)}
                              </JXBox>
                              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)'}}>
                                Total shipment due: {formatCurrency(shipment.amountDue || 0)}
                              </JXBox>
                            </JXBox>
                          </>
                        </JXBox>
                      </JXBox>
                    </JXBox>
                        ))}
                      </>
                    );
                  })()}

                  {selectedShipmentIds.length > 0 && (
                    <>
                      <div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{marginTop: '16px', marginBottom: '16px', borderColor: 'var(--border)'}} />
                      <JXBox padding="none" border={false} style={{padding: '24px', borderRadius: '16px', backgroundColor: 'rgba(201, 155, 47, 0.12)', border: '2px solid var(--accent-gold)'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                              {paymentCategoryLabels[paymentCategory]} Remaining Due
                            </JXBox>
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.9rem', color: 'var(--text-primary)'}}>
                              {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''} selected
                            </JXBox>
                          </JXBox>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
                            {formatCurrency(totalSelectedAmount)}
                          </JXBox>
                        </JXBox>
                      </JXBox>
                    </>
                  )}

                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end'}}>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="primary"
                      disabled={selectedShipmentIds.length === 0}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Payment
                    </Button>
                  </JXBox>
                </JXBox>
              )}
            </DashboardPanel>
          )}

          {/* Step 3: Payment Details */}
          {activeStep === 2 && (
            <DashboardPanel
              title="Step 3: Enter Payment Details"
              description={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`}
            >
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                {/* Payment Summary */}
                <JXBox padding="none" border={false} style={{padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(201, 155, 47, 0.08)', border: '1px solid var(--accent-gold)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                      {paymentCategoryLabels[paymentCategory]} Payment Summary
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                      {selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''}
                    </JXBox>
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.95rem', color: 'var(--text-secondary)'}}>
                      {paymentCategoryLabels[paymentCategory]} Outstanding:
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
                      {formatCurrency(totalSelectedAmount)}
                    </JXBox>
                  </JXBox>
                  {selectedShipmentIds.length === 1 && (() => {
                    const selectedShipment = shipments.find((shipment) => shipment.id === selectedShipmentIds[0]);
                    if (!selectedShipment) {
                      return null;
                    }

                    return (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
                          Purchase due: {formatCurrency(selectedShipment.purchaseAmountDue || 0)}
                        </JXBox>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
                          Expense due: {formatCurrency(selectedShipment.expenseAmountDue || 0)}
                        </JXBox>
                      </JXBox>
                    );
                  })()}
                </JXBox>

                {/* Amount Input */}
                <div className="min-w-0 flex-1"><FormField label="Payment Amount (USD) *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required inputProps={{ step: '0.01', min: '0.01' }} helperText={`Enter the amount to apply against the shipment's ${paymentCategoryLabels[paymentCategory].toLowerCase()} balance`} leftIcon={<DollarSign className="w-5 h-5 text-[var(--text-secondary)]" />} /></div>

                <div className="min-w-0 flex-1"><Select label="Payment Category" options={Object.entries(paymentCategoryLabels).map(([value, label]) => ({ value, label }))} value={paymentCategory} required onChange={(val) => setPaymentCategory(val as PaymentCategory)} /></div>

                {/* Payment Method */}
                <div className="min-w-0 flex-1"><Select label="Payment Method" options={[{ value: "CASH", label: 'Cash' }, { value: "BANK_TRANSFER", label: 'Bank Transfer' }, { value: "CHECK", label: 'Check' }, { value: "CREDIT_CARD", label: 'Credit Card' }, { value: "WIRE", label: 'Wire Transfer' }]} value={paymentMethod} required onChange={(val) => setPaymentMethod(val as string)} /></div>

                {/* Notes */}
                <div className="min-w-0 flex-1"><FormField label="Notes (Optional)" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes about this payment (e.g., reference number, check number, etc.)" /></div>

                {/* Navigation */}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', display: 'flex', gap: '16px', justifyContent: 'flex-end'}}>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    disabled={!amount || parseFloat(amount) <= 0}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Review Payment
                  </Button>
                </JXBox>
              </JXBox>
            </DashboardPanel>
          )}

          {/* Step 4: Review & Confirm */}
          {activeStep === 3 && (
            <DashboardPanel
              title="Step 4: Review & Confirm"
              description="Review the payment details before submitting"
            >
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                {/* Customer Info */}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'}}>
                    Customer
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                    {selectedUser?.name || selectedUser?.email}
                  </JXBox>
                </JXBox>

                <div aria-hidden="true" className="my-4 border-t border-[var(--border)]" />

                {/* Payment Details Summary */}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px'}}>
                    Payment Details
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                        Payment Amount
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
                        {formatCurrency(paymentAmount)}
                      </JXBox>
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                        Payment Method
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                        {paymentMethod.replace('_', ' ')}
                      </JXBox>
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                        Payment Category
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--accent-gold)'}}>
                        {paymentCategoryLabels[paymentCategory]}
                      </JXBox>
                    </JXBox>
                  </JXBox>
                </JXBox>

                <div aria-hidden="true" className="my-4 border-t border-[var(--border)]" />

                {/* Payment Allocation */}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px'}}>
                    Payment Allocation
                  </JXBox>
                  
                  <div style={{border: '1px solid var(--border)'}} className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
                      <thead>
                        <tr style={{backgroundColor: 'var(--surface)'}} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
                          <th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Tracking #</th>
                          <th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Vehicle</th>
                          <th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Outstanding Due</th>
                          <th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Amount Applied</th>
                          <th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentAllocations.map((allocation) => (
                          <tr key={allocation.shipmentId} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
                            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{allocation.trackingNumber}</th>
                            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{allocation.vehicleInfo}</th>
                            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">{formatCurrency(allocation.amountDue)}</th>
                            <th style={{fontWeight: 600, color: 'var(--accent-gold)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
                              {formatCurrency(allocation.amountToPay)}
                            </th>
                            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontSize: '0.7rem', fontWeight: 600, backgroundColor: allocation.amountToPay >= allocation.amountDue ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)', color: allocation.amountToPay >= allocation.amountDue ? 'var(--success)' : 'var(--warning)'}}>{allocation.amountToPay >= allocation.amountDue ? 'PAID' : 'PARTIAL'}</span>
                            </th>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Row */}
                  <JXBox padding="none" border={false} style={{marginTop: '16px', padding: '16px', backgroundColor: 'rgba(201, 155, 47, 0.08)', borderRadius: '8px'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.9rem', fontWeight: 600}}>Total Payment:</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
                        {formatCurrency(paymentAmount)}
                      </JXBox>
                    </JXBox>
                  </JXBox>
                </JXBox>

                {/* Info */}
                {isPartialPayment && (
                  <Alert severity="info" icon={<Info className="w-5 h-5" />} variant="subtle">
                    <strong>Partial Payment:</strong> This payment will cover {formatCurrency(paymentAmount)} of the total {formatCurrency(totalSelectedAmount)}. 
                    The remaining {formatCurrency(totalSelectedAmount - paymentAmount)} will stay pending.
                  </Alert>
                )}

                {notes && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'}}>
                      Notes
                    </JXBox>
                    <JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-primary)'}}>
                      {notes}
                    </JXBox>
                  </JXBox>
                )}

                {/* Navigation */}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end'}}>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    disabled={loading}
                  >
                    Record Payment
                  </Button>
                </JXBox>
              </JXBox>
            </DashboardPanel>
          )}
        </JXBox>

        {/* Confirmation Dialog */}
        <Modal
          open={showConfirmDialog}
          onClose={() => !loading && setShowConfirmDialog(false)}
          title="Confirm Payment Recording"
          size="sm"
          actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px'}}
          actions={<>

            <Button
              onClick={() => setShowConfirmDialog(false)}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Confirm & Record'}
            </Button>
          </>}
        >

            <Alert severity="info" variant="subtle" className="mb-4">
              You are about to record a payment of <strong>{formatCurrency(paymentAmount)}</strong> from{' '}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>.
            </Alert>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
              This action will:
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Create a {paymentCategoryLabels[paymentCategory].toLowerCase()} payment ledger entry</li>
                <li>Update the customer's balance</li>
                <li>Apply payment to the shipment's {paymentCategoryLabels[paymentCategory].toLowerCase()} balance</li>
              </ul>
            </JXBox>
        </Modal>
      </DashboardSurface>
    </AdminRoute>
  );
}