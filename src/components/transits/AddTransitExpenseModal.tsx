'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DollarSign, ArrowRightLeft } from 'lucide-react';
import { Button, FormField, Modal, Select, toast } from '@/components/design-system';

export interface EditableTransitExpense {
	id: string;
	type: string;
	amount: number;
	currency: string;
	date: string;
	vendor: string | null;
	invoiceNumber?: string | null;
	notes?: string | null;
	originalAmount?: number | null;
	originalCurrency?: string | null;
	fxRate?: number | null;
}

interface AddTransitExpenseModalProps {
	open: boolean;
	onClose: () => void;
	transitId: string;
	onSuccess: () => void;
	/** When provided, the modal edits the existing expense instead of creating one. */
	initialExpense?: EditableTransitExpense | null;
}

const expenseTypes = [
	{ value: 'SHIPPING_FEE', label: 'Shipping Fee' },
	{ value: 'PORT_CHARGES', label: 'Port Charges' },
	{ value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
	{ value: 'STORAGE_FEE', label: 'Storage Fee' },
	{ value: 'HANDLING_FEE', label: 'Handling Fee' },
	{ value: 'INSURANCE', label: 'Insurance' },
	{ value: 'DOCUMENTATION', label: 'Documentation' },
	{ value: 'INLAND_TRANSPORT', label: 'Inland Transport' },
	{ value: 'INSPECTION', label: 'Inspection' },
	{ value: 'OTHER', label: 'Other' },
];

const CURRENCY_OPTIONS = [
	{ value: 'USD', label: 'USD - US Dollar ($)' },
	{ value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
	{ value: 'AFN', label: 'AFN - Afghan Afghani (؋)' },
];

const DEFAULT_FX_RATES: Record<string, number> = {
	USD: 1.0,
	AED: 3.6725,
	AFN: 67.50,
};

function createInitialForm(expense?: EditableTransitExpense | null) {
	const currency = expense?.originalCurrency || expense?.currency || 'USD';
	const amount = expense?.originalAmount
		? String(expense.originalAmount)
		: (expense ? String(expense.amount) : '');
	const fxRate = expense?.fxRate ? String(expense.fxRate) : String(DEFAULT_FX_RATES[currency] || 1.0);

	return {
		type: expense?.type || 'SHIPPING_FEE',
		amount,
		currency,
		fxRate,
		vendor: expense?.vendor || '',
		invoiceNumber: expense?.invoiceNumber || '',
		date: expense?.date ? String(expense.date).slice(0, 10) : new Date().toISOString().split('T')[0],
		notes: expense?.notes || '',
	};
}

export default function AddTransitExpenseModal({
	open,
	onClose,
	transitId,
	onSuccess,
	initialExpense,
}: AddTransitExpenseModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState(createInitialForm(initialExpense));
	const [liveRates, setLiveRates] = useState<Record<string, number>>(DEFAULT_FX_RATES);
	const isEditing = Boolean(initialExpense?.id);

	// Fetch latest FX rates from the system
	useEffect(() => {
		if (!open) return;
		let mounted = true;

		async function loadRates() {
			try {
				const res = await fetch('/api/finance/exchange-rates');
				if (res.ok) {
					const data = await res.json();
					if (data?.rates && mounted) {
						const fetched: Record<string, number> = { ...DEFAULT_FX_RATES };
						for (const [curr, info] of Object.entries(data.rates as Record<string, { rate: number }>)) {
							if (info?.rate) fetched[curr] = info.rate;
						}
						setLiveRates(fetched);
					}
				}
			} catch {
				// Fall back to DEFAULT_FX_RATES
			}
		}

		loadRates();
		return () => {
			mounted = false;
		};
	}, [open]);

	useEffect(() => {
		if (open) {
			setFormData(createInitialForm(initialExpense));
		}
	}, [initialExpense, open]);

	const handleChange = useCallback((field: string, value: string) => {
		setFormData((prev) => {
			const updated = { ...prev, [field]: value };
			if (field === 'currency') {
				const rate = liveRates[value] || DEFAULT_FX_RATES[value] || 1.0;
				updated.fxRate = String(rate);
			}
			return updated;
		});
	}, [liveRates]);

	const handleClose = useCallback(() => {
		if (!loading) {
			setFormData(createInitialForm(null));
			onClose();
		}
	}, [loading, onClose]);

	// Live USD conversion
	const convertedUSD = useMemo(() => {
		const rawAmount = parseFloat(formData.amount);
		if (isNaN(rawAmount) || rawAmount <= 0) return 0;
		if (formData.currency === 'USD') return rawAmount;
		const rate = parseFloat(formData.fxRate);
		if (isNaN(rate) || rate <= 0) return 0;
		return Number((rawAmount / rate).toFixed(2));
	}, [formData.amount, formData.currency, formData.fxRate]);

	const currencyPrefix = useMemo(() => {
		if (formData.currency === 'AED') return 'AED ';
		if (formData.currency === 'AFN') return '؋ ';
		return '$';
	}, [formData.currency]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const parsedAmount = parseFloat(formData.amount);
		if (isNaN(parsedAmount) || parsedAmount <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		const parsedFxRate = parseFloat(formData.fxRate) || (liveRates[formData.currency] || 1.0);
		const amountUSD = formData.currency === 'USD' ? parsedAmount : Number((parsedAmount / parsedFxRate).toFixed(2));

		if (amountUSD <= 0) {
			toast.error('Converted USD amount must be greater than zero');
			return;
		}

		setLoading(true);

		try {
			const payload: Record<string, unknown> = {
				...(initialExpense?.id ? { expenseId: initialExpense.id } : {}),
				type: formData.type,
				amount: amountUSD,
				currency: 'USD',
				originalAmount: parsedAmount,
				originalCurrency: formData.currency,
				fxRate: formData.currency !== 'USD' ? parsedFxRate : 1.0,
				date: formData.date,
				vendor: formData.vendor || null,
				invoiceNumber: formData.invoiceNumber || null,
				notes: formData.notes || null,
			};

			const response = await fetch(`/api/transits/${transitId}/expenses`, {
				method: isEditing ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				toast.success(isEditing ? 'Expense updated successfully' : 'Expense added successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || `Failed to ${isEditing ? 'update' : 'add'} expense`);
			}
		} catch (error) {
			console.error('Error saving expense:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const formId = 'transit-expense-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="md"
			title={
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<DollarSign style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>{isEditing ? 'Edit Transit Expense' : 'Add Transit Expense'}</span>
				</div>
			}
			description="Record transit costs in USD, AED, or AFN with automatic multi-currency conversion to ledger base."
			showCloseButton={!loading}
			disableBackdropClick={loading}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading}>
						{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
					</Button>
				</>
			}
		>
			<form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
				<Select
					label="Expense Type"
					value={formData.type}
					onChange={(val) => handleChange('type', String(val))}
					options={[
						...(!expenseTypes.some((type) => type.value === formData.type)
							? [{ value: formData.type, label: formData.type.replace(/_/g, ' ') }]
							: []),
						...expenseTypes.map((type) => ({ value: type.value, label: type.label })),
					]}
				/>

				<div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
					<Select
						label="Payment Currency"
						value={formData.currency}
						onChange={(val) => handleChange('currency', String(val))}
						options={CURRENCY_OPTIONS}
					/>
					<FormField
						id="transit-expense-amount"
						name="amount"
						label={`Amount (${formData.currency})`}
						type="number"
						value={formData.amount}
						onChange={(e) => handleChange('amount', e.target.value)}
						required
						inputProps={{ min: 0, step: 0.01 }}
						size="small"
						leftIcon={currencyPrefix}
					/>
				</div>

				{formData.currency !== 'USD' && (
					<div
						style={{
							background: 'rgba(var(--accent-gold-rgb, 212, 175, 55), 0.08)',
							border: '1px solid rgba(var(--accent-gold-rgb, 212, 175, 55), 0.25)',
							borderRadius: '8px',
							padding: '12px 14px',
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
								<ArrowRightLeft className="w-4 h-4 text-[var(--accent-gold)]" />
								<span>Multi-Currency Conversion</span>
							</div>
							<div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
								1 USD = {formData.fxRate} {formData.currency}
							</div>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
							<FormField
								id="transit-expense-fx"
								name="fxRate"
								label={`Exchange Rate (${formData.currency} per $1 USD)`}
								type="number"
								value={formData.fxRate}
								onChange={(e) => handleChange('fxRate', e.target.value)}
								inputProps={{ min: 0.0001, step: 0.0001 }}
								size="small"
							/>
							<div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
								<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ledger Base (USD)</span>
								<span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
									${convertedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
								</span>
							</div>
						</div>
					</div>
				)}

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
					<FormField
						id="transit-expense-vendor"
						name="vendor"
						label="Vendor / Payee"
						value={formData.vendor}
						onChange={(e) => handleChange('vendor', e.target.value)}
						placeholder="e.g., Islam Qala Customs, Transport Co."
						size="small"
					/>
					<FormField
						id="transit-expense-invoice"
						name="invoiceNumber"
						label="Invoice / Receipt #"
						value={formData.invoiceNumber}
						onChange={(e) => handleChange('invoiceNumber', e.target.value)}
						placeholder="e.g., INV-9042 or Voucher #"
						size="small"
					/>
				</div>

				<FormField
					id="transit-expense-date"
					name="date"
					label="Expense Date"
					type="date"
					value={formData.date}
					onChange={(e) => handleChange('date', e.target.value)}
					required
					InputLabelProps={{ shrink: true }}
					size="small"
				/>

				<FormField
					id="transit-expense-notes"
					name="notes"
					label="Notes / Settlement Remarks"
					value={formData.notes}
					onChange={(e) => handleChange('notes', e.target.value)}
					multiline
					rows={2}
					placeholder="Additional operational context or payment reference..."
					size="small"
				/>
			</form>
		</Modal>
	);
}
