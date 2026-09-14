'use client';
import { Box } from '@mui/material';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Section from '@/components/layout/Section';
import AdminRoute from '@/components/auth/AdminRoute';
import { Button, Breadcrumbs, toast } from '@/components/design-system';

interface Shipment {
  id: string;
  trackingNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  userId: string;
  user: {
    name?: string;
    email: string;
  };
}

const expenseTypes = [
  { value: 'SHIPPING_FEE', label: 'Shipping Fee' },
  { value: 'FUEL', label: 'Fuel' },
  { value: 'PORT_CHARGES', label: 'Port Charges' },
  { value: 'TOWING', label: 'Towing' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipmentIdParam = searchParams.get('shipmentId');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipmentIdParam || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('SHIPPING_FEE');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'DUE'>('DUE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingShipments, setLoadingShipments] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchShipments();
  }, [session, status, router]);

  const fetchShipments = async () => {
    try {
      setLoadingShipments(true);
      const response = await fetch('/api/shipments?limit=100');
      if (response.ok) {
        const data = await response.json();
        setShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!selectedShipmentId) {
      setError('Please select a shipment');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ledger/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId: selectedShipmentId,
          description,
          amount: parseFloat(amount),
          expenseType,
          paymentMode,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Expense added successfully!');
        setDescription('');
        setAmount('');
        setNotes('');
        setPaymentMode('DUE');
        if (!shipmentIdParam) {
          setSelectedShipmentId('');
        }
        
        // Redirect after 2 seconds
        setTimeout(() => {
          if (shipmentIdParam) {
            router.push(`/dashboard/shipments/${shipmentIdParam}`);
          } else {
            router.push('/dashboard/finance');
          }
        }, 2000);
      } else {
        setError(data.error || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('An error occurred while adding the expense');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);

  if (status === 'loading' || loadingShipments) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto" />
            <p>Loading expense form…</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[var(--background)]">
			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2, position: "relative", zIndex: 10 }}>
				<Breadcrumbs />
			</Box>

        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href={shipmentIdParam ? `/dashboard/shipments/${shipmentIdParam}` : '/dashboard/finance'}>
                <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Add Expense</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Add a cost or expense to a shipment
                </p>
              </div>
            </div>
          </div>
        </Section>

			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2, position: "relative", zIndex: 10 }}>
				<Breadcrumbs />
			</Box>

        <Section className="pb-16">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            {/* Shipment Selection */}
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 sm:p-6 border-b border-[var(--border)]">
                <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Select Shipment</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div>
                  <label htmlFor="shipment" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Shipment <span className="text-[var(--error)]">*</span>
                  </label>
                  <select
                    id="shipment"
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    disabled={!!shipmentIdParam}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] transition-colors"
                    required
                  >
                    <option value="">Select a shipment...</option>
                    {shipments.map((shipment) => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.trackingNumber} - {shipment.vehicleMake} {shipment.vehicleModel} ({shipment.user.name || shipment.user.email})
                      </option>
                    ))}
                  </select>
                  {shipmentIdParam && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Shipment pre-selected from URL
                    </p>
                  )}
                </div>

                {selectedShipment && (
                  <div className="mt-4 p-4 rounded-lg bg-[rgba(var(--info-rgb),0.08)] border-[rgba(var(--info-rgb),0.25)]">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[var(--info)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {selectedShipment.trackingNumber}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {selectedShipment.vehicleMake} {selectedShipment.vehicleModel} - {selectedShipment.user.name || selectedShipment.user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Details */}
            {selectedShipmentId && (
              <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                <CardHeader className="p-4 sm:p-6 border-b border-[var(--border)]">
                  <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Expense Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div>
                    <label htmlFor="expenseType" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Expense Type <span className="text-[var(--error)]">*</span>
                    </label>
                    <select
                      id="expenseType"
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] transition-colors"
                      required
                    >
                      {expenseTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Description <span className="text-[var(--error)]">*</span>
                    </label>
                    <input
                      type="text"
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Port clearance fee at Dubai Port"
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Amount (USD) <span className="text-[var(--error)]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-[var(--text-secondary)]" />
                      </div>
                      <input
                        type="number"
                        id="amount"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Payment Mode <span className="text-[var(--error)]">*</span>
                    </label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMode === 'DUE' ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.1)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'}`}>
                        <input
                          type="radio"
                          name="paymentMode"
                          value="DUE"
                          checked={paymentMode === 'DUE'}
                          onChange={() => setPaymentMode('DUE')}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Due</p>
                          <p className="text-xs text-[var(--text-secondary)]">Only DEBIT — customer still owes</p>
                        </div>
                      </label>
                      <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMode === 'CASH' ? 'border-[var(--success)] bg-[rgba(var(--success-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'}`}>
                        <input
                          type="radio"
                          name="paymentMode"
                          value="CASH"
                          checked={paymentMode === 'CASH'}
                          onChange={() => setPaymentMode('CASH')}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Cash</p>
                          <p className="text-xs text-[var(--text-secondary)]">DEBIT + CREDIT — already paid</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about this expense..."
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)] transition-colors"
                    />
                  </div>

                  <div className={`p-4 rounded-lg border ${paymentMode === 'CASH' ? 'bg-[rgba(var(--success-rgb),0.08)] border-[rgba(var(--success-rgb),0.25)]' : 'bg-[rgba(var(--warning-rgb),0.08)] border-[rgba(var(--warning-rgb),0.25)]'}`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${paymentMode === 'CASH' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${paymentMode === 'CASH' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                          {paymentMode === 'CASH' ? 'Cash Payment' : 'Due Payment'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {paymentMode === 'CASH'
                            ? 'Two ledger entries will be created: a DEBIT for the expense and a CREDIT for the cash payment received. Net effect on balance is zero.'
                            : "One ledger entry will be created: a DEBIT for the expense. This will increase the customer's outstanding balance."}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-lg border border-[rgba(var(--error-rgb),0.3)] bg-[rgba(var(--error-rgb),0.08)] px-4 py-3 text-sm text-[var(--error)]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-[rgba(var(--success-rgb),0.3)] bg-[rgba(var(--success-rgb),0.08)] px-4 py-3 text-sm text-[var(--success)]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedShipmentId && (
              <div className="flex justify-end gap-3">
                <Link href={shipmentIdParam ? `/dashboard/shipments/${shipmentIdParam}` : '/dashboard/finance'}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]"
                >
                  {loading ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            )}
          </form>
        </Section>
      </div>
    </AdminRoute>
  );
}
