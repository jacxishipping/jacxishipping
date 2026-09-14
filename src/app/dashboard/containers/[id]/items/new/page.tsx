'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Section from '@/components/layout/Section';

type ItemFormData = {
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost: string;
	towingCost: string;
	clearanceCost: string;
	vatCost: string;
	customsCost: string;
	otherCost: string;
};

export default function NewItemPage() {
	const { data: session, status } = useSession();
	const params = useParams();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<ItemFormData>({
		defaultValues: {
			vin: '',
			lotNumber: '',
			auctionCity: '',
			freightCost: '0',
			towingCost: '0',
			clearanceCost: '0',
			vatCost: '0',
			customsCost: '0',
			otherCost: '0',
		},
	});

	const watchedValues = watch();
	
	const totalCost = useMemo(() => {
		const toNumber = (value: string | undefined) => {
			const parsed = Number.parseFloat(value ?? '0');
			return Number.isFinite(parsed) ? parsed : 0;
		};

		return (
			toNumber(watchedValues.freightCost) +
			toNumber(watchedValues.towingCost) +
			toNumber(watchedValues.clearanceCost) +
			toNumber(watchedValues.vatCost) +
			toNumber(watchedValues.customsCost) +
			toNumber(watchedValues.otherCost)
		);
	}, [watchedValues]);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
		}
	}, [session, status, router]);

	const containerIdRaw = params?.id;
	const containerId = Array.isArray(containerIdRaw) ? containerIdRaw[0] : containerIdRaw;

	const onSubmit = async (data: ItemFormData) => {
		setIsSubmitting(true);
		setError('');

		const payload = {
			...data,
			containerId: containerId, // Always use the current container ID from the URL
			freightCost: Number.parseFloat(data.freightCost) || 0,
			towingCost: Number.parseFloat(data.towingCost) || 0,
			clearanceCost: Number.parseFloat(data.clearanceCost) || 0,
			vatCost: Number.parseFloat(data.vatCost) || 0,
			customsCost: Number.parseFloat(data.customsCost) || 0,
			otherCost: Number.parseFloat(data.otherCost) || 0,
		};

		try {
			const response = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				router.push(`/dashboard/containers/${containerId}`);
				return;
			}

			const result = (await response.json()) as { message?: string };
			setError(result.message ?? 'Failed to create item');
		} catch (err) {
			console.error('Error creating item:', err);
			setError('An error occurred while creating the item');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!session || session.user?.role !== 'admin') {
		return null;
	}

	return (
		<>
			<Section className="relative bg-[var(--text-primary)] py-8 sm:py-12 lg:py-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-primary)]" />
				<div className="absolute inset-0 opacity-[0.03]">
					<svg className="w-full h-full" preserveAspectRatio="none">
						<defs>
							<pattern id="grid-new-item" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#grid-new-item)" className="text-white" />
					</svg>
				</div>

				<div className="relative z-10">
					<div className="flex items-center gap-6">
						<Link href={`/dashboard/containers/${containerId ?? ''}`}>
							<Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
								<ArrowLeft className="w-4 h-4 mr-2" />
								Back
							</Button>
						</Link>
						<div>
							<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">Add Item</h1>
							<p className="text-lg sm:text-xl text-[var(--panel)]/85 mt-2">Add a new item to container</p>
						</div>
					</div>
				</div>
			</Section>

			<Section className="bg-[var(--text-primary)] py-8 sm:py-12">
				<div className="max-w-4xl mx-auto">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* Basic Info */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="relative rounded-xl bg-[var(--panel)] backdrop-blur-sm border border-[var(--border)] p-6 sm:p-8"
						>
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-xl bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center">
									<Package className="w-5 h-5 text-[var(--info)]" />
								</div>
								<h2 className="text-xl sm:text-2xl font-bold text-white">Item Information</h2>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="vin" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">
										VIN <span className="text-[var(--error)]">*</span>
									</label>
									<input
										type="text"
										id="vin"
										{...register('vin', { required: 'VIN is required' })}
										className={`w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
											errors.vin ? 'border-[rgba(var(--error-rgb),0.5)]' : 'border-[var(--border)]'
										}`}
									/>
									{errors.vin && <p className="mt-2 text-sm text-[var(--error)]">{errors.vin.message as string}</p>}
								</div>

								<div>
									<label htmlFor="lotNumber" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">
										Lot Number <span className="text-[var(--error)]">*</span>
									</label>
									<input
										type="text"
										id="lotNumber"
										{...register('lotNumber', { required: 'Lot number is required' })}
										className={`w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
											errors.lotNumber ? 'border-[rgba(var(--error-rgb),0.5)]' : 'border-[var(--border)]'
										}`}
									/>
									{errors.lotNumber && <p className="mt-2 text-sm text-[var(--error)]">{errors.lotNumber.message as string}</p>}
								</div>

								<div className="md:col-span-2">
									<label htmlFor="auctionCity" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">
										Auction City <span className="text-[var(--error)]">*</span>
									</label>
									<input
										type="text"
										id="auctionCity"
										{...register('auctionCity', { required: 'Auction city is required' })}
										className={`w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
											errors.auctionCity ? 'border-[rgba(var(--error-rgb),0.5)]' : 'border-[var(--border)]'
										}`}
									/>
									{errors.auctionCity && <p className="mt-2 text-sm text-[var(--error)]">{errors.auctionCity.message as string}</p>}
								</div>
							</div>
						</motion.div>

						{/* Costs */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="relative rounded-xl bg-[var(--panel)] backdrop-blur-sm border border-[var(--border)] p-6 sm:p-8"
						>
							<div className="flex items-center gap-3 mb-6">
								<div className="w-10 h-10 rounded-xl bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center">
									<DollarSign className="w-5 h-5 text-[var(--info)]" />
								</div>
								<h2 className="text-xl sm:text-2xl font-bold text-white">Costs (USD)</h2>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="freightCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">Freight Cost</label>
									<input type="number" step="0.01" id="freightCost" {...register('freightCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
								<div>
									<label htmlFor="towingCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">Towing Cost</label>
									<input type="number" step="0.01" id="towingCost" {...register('towingCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
								<div>
									<label htmlFor="clearanceCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">Clearance Cost</label>
									<input type="number" step="0.01" id="clearanceCost" {...register('clearanceCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
								<div>
									<label htmlFor="vatCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">VAT Cost</label>
									<input type="number" step="0.01" id="vatCost" {...register('vatCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
								<div>
									<label htmlFor="customsCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">Customs Cost</label>
									<input type="number" step="0.01" id="customsCost" {...register('customsCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
								<div>
									<label htmlFor="otherCost" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">Other Cost</label>
									<input type="number" step="0.01" id="otherCost" {...register('otherCost')} defaultValue={0} className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
								</div>
							</div>

							<div className="mt-6 p-4 rounded-lg bg-[var(--panel)]/25 border border-[rgba(var(--panel-rgb),0.2)]">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-[var(--panel)]/85">Total Cost:</span>
									<span className="text-xl font-bold text-[var(--info)]">${totalCost.toFixed(2)}</span>
								</div>
							</div>
						</motion.div>

						{error && (
							<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-xl bg-[rgba(var(--error-rgb),0.08)] backdrop-blur-sm border border-[rgba(var(--error-rgb),0.3)] p-6">
								<p className="text-sm text-[var(--error)]">{error}</p>
							</motion.div>
						)}

						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
							<Link href={`/dashboard/containers/${containerId ?? ''}`} className="sm:w-auto w-full">
								<Button type="button" variant="outline" disabled={isSubmitting} className="w-full sm:w-auto border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
									Cancel
								</Button>
							</Link>
							<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-[var(--accent-gold)] text-[var(--text-primary)] hover:bg-[var(--accent-gold)] shadow-lg shadow-[rgba(var(--accent-gold-rgb),0.25)]">
								{isSubmitting ? 'Creating...' : 'Create Item'}
							</Button>
						</motion.div>
					</form>
				</div>
			</Section>
		</>
	);
}

