'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Button, FormField, Modal, Select, toast } from '@/components/design-system';

interface Shipment {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN: string | null;
	user?: {
		id: string;
		name: string | null;
		email: string;
	};
}

interface AddDamageModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	shipments: Shipment[];
	onSuccess: () => void;
}

const damageTypeOptions = [
	{
		value: 'WE_PAY',
		label: 'We Pay (Compensate Customer)',
		description: 'Business compensates the customer — credits customer ledger',
	},
	{
		value: 'COMPANY_PAYS',
		label: 'Company Pays (Shipping Company Responsible)',
		description: 'Shipping company is liable — debits company ledger',
	},
];

export default function AddDamageModal({
	open,
	onClose,
	containerId,
	shipments,
	onSuccess,
}: AddDamageModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		shipmentId: '',
		damageType: 'WE_PAY',
		amount: '',
		companyAmount: '',
		description: '',
	});

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.shipmentId) {
			toast.error('Please select a shipment');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		if (!formData.description.trim()) {
			toast.error('Please enter a description');
			return;
		}

		if (
			formData.damageType === 'COMPANY_PAYS' &&
			formData.companyAmount &&
			parseFloat(formData.companyAmount) <= 0
		) {
			toast.error('Please enter a valid company charge amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/damages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId: formData.shipmentId,
					damageType: formData.damageType,
					amount: parseFloat(formData.amount),
					companyAmount:
						formData.damageType === 'COMPANY_PAYS' && formData.companyAmount
							? parseFloat(formData.companyAmount)
							: undefined,
					description: formData.description.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to add damage record');
			}

			toast.success('Damage record added successfully');
			handleClose();
			onSuccess();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add damage record');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({ shipmentId: '', damageType: 'WE_PAY', amount: '', companyAmount: '', description: '' });
			onClose();
		}
	};

	const selectedDamageType = damageTypeOptions.find((d) => d.value === formData.damageType);
	const formId = 'container-damage-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="sm"
			title={
				<div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
					<DollarSign style={{ width: 20, height: 20, color: 'var(--accent-gold)' }} />
					<span style={{fontWeight: 700}}>Add Damage Record</span>
				</div>
			}
			description="Create a damage adjustment and choose which ledger absorbs the resulting charge."
			showCloseButton={!loading}
			disableBackdropClick={loading}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading}>
						{loading ? 'Adding...' : 'Add Damage'}
					</Button>
				</>
			}
		>
			<form id={formId} onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
					{/* Shipment selector */}
					<div style={{color: 'var(--text-primary)'}}><Select label="Shipment" value={formData.shipmentId} onChange={(val) => handleChange('shipmentId', String(val))} options={[{ value: "", label: `${'Select a shipment…'}` }, ...shipments.map((s) => ({ value: s.id, label: `${[s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Unknown Vehicle'} ${s.vehicleVIN ? ` — ${s.vehicleVIN}` : ''} ${s.user ? ` (${s.user.name || s.user.email})` : ''}` }))]} /></div>

					{/* Damage Type */}
					<div style={{color: 'var(--text-primary)'}}><Select label="Damage Type" value={formData.damageType} onChange={(val) => handleChange('damageType', String(val))} options={damageTypeOptions.map((opt) => ({ value: opt.value, label: opt.label }))} /></div>

					{/* Damage type explanation */}
					{selectedDamageType && (
						<div style={{padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', border: '1px solid rgba(var(--accent-gold-rgb), 0.2)'}}>
							<p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
								{selectedDamageType.description}
							</p>
						</div>
					)}

					{/* Amount */}
					<FormField label={formData.damageType === 'COMPANY_PAYS' ? 'Customer Credit Amount (USD)' : 'Amount (USD)'} type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} size="small" leftIcon={'$'} />

					{formData.damageType === 'COMPANY_PAYS' && (
						<FormField label="Company Charge Amount (USD)" type="number" value={formData.companyAmount} onChange={(e) => handleChange('companyAmount', e.target.value)} inputProps={{ min: 0, step: 0.01 }} helperText="Optional. Leave empty to use the same value as customer credit amount." size="small" leftIcon={'$'} />
					)}

					{/* Description */}
					<FormField label="Description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} required multiline rows={3} placeholder="Describe the damage..." size="small" />
			</form>
		</Modal>
	);
}
