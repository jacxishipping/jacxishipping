'use client';
import { Box } from '@mui/material';

import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Breadcrumbs, toast } from '@/components/design-system';
import Section from '@/components/layout/Section';

type ContainerItem = {
	id: string;
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost?: number | null;
	towingCost?: number | null;
	clearanceCost?: number | null;
	vatCost?: number | null;
	customsCost?: number | null;
	otherCost?: number | null;
};

type ContainerDetail = {
	id: string;
	containerNumber: string;
	items: ContainerItem[];
};

type ContainerResponse = {
	container?: ContainerDetail;
};

export default function NewInvoicePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const containerId = searchParams.get('containerId');
	const [container, setContainer] = useState<ContainerDetail | null>(null);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [exchangeRate, setExchangeRate] = useState(3.67);
	const [dueDate, setDueDate] = useState('');
	const [loading, setLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');

	const fetchContainer = useCallback(async () => {
		if (!containerId) return;

		try {
			setLoading(true);
			const response = await fetch(`/api/containers/${containerId}`);
			if (!response.ok) {
				setContainer(null);
				return;
			}
			const data = (await response.json()) as ContainerResponse;
			const containerData = data.container ?? null;
			setContainer(containerData);
			if (containerData?.items?.length) {
				setSelectedItems(containerData.items.map((item) => item.id));
			}
		} catch (error) {
			console.error('Error fetching container:', error);
			setContainer(null);
		} finally {
			setLoading(false);
		}
	}, [containerId]);

	useEffect(() => {
		if (!containerId) {
			router.push('/dashboard/containers');
			return;
		}
	}, [containerId, router]);

	useEffect(() => {
		if (status === 'loading') return;
		if (!session || !isAdmin) {
			router.replace('/dashboard');
			return;
		}
		void fetchContainer();
	}, [fetchContainer, isAdmin, router, session, status]);

	const availableItems = useMemo(() => container?.items ?? [], [container]);

	const handleCreateInvoice = async () => {
		if (!containerId) {
			toast.warning("Missing information");
			return;
		}

		if (selectedItems.length === 0) {
			toast.warning("No items selected");
			return;
		}

		setIsCreating(true);
		try {
			const response = await fetch('/api/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					containerId,
					itemIds: selectedItems,
					exchangeRate: parseFloat(exchangeRate.toString()),
					dueDate: dueDate || null,
				}),
			});

			const result = await response.json();

			if (response.ok) {
				router.push(`/dashboard/invoices/${result.invoice.id}`);
			} else {
				toast.error('Failed to create invoice', result.message || 'Please try again');
			}
		} catch (error) {
			console.error('Error creating invoice:', error);
			toast.error("Failed to create invoice");
		} finally {
			setIsCreating(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)]"></div>
			</div>
		);
	}

	if (!container) {
		return (
			<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="text-center">
					<p className="text-[var(--panel)]/85 mb-4">Container not found</p>
					<Link href="/dashboard/containers">
						<Button>Back to Containers</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2, position: "relative", zIndex: 10 }}>
				<Breadcrumbs />
			</Box>

			<Section className="relative bg-[var(--text-primary)] py-8 sm:py-12 lg:py-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-primary)]" />
				<div className="absolute inset-0 opacity-[0.03]">
					<svg className="w-full h-full" preserveAspectRatio="none">
						<defs>
							<pattern id="grid-new-invoice" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
							</pattern>
						</defs>
								<rect width="100%" height="100%" fill="url(#grid-new-invoice)" className="text-white" />
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
							<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">Create Invoice</h1>
							<p className="text-lg sm:text-xl text-[var(--panel)]/85 mt-2">Generate invoice for container items</p>
						</div>
					</div>
				</div>
			</Section>

			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2, position: "relative", zIndex: 10 }}>
				<Breadcrumbs />
			</Box>

			<Section className="bg-[var(--text-primary)] py-8 sm:py-12">
				<div className="max-w-4xl mx-auto space-y-6">
					{/* Exchange Rate & Due Date */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-[rgba(var(--info-rgb),0.3)] p-6 sm:p-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="exchangeRate" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">
									Exchange Rate (USD to AED)
								</label>
								<input
									type="number"
									step="0.0001"
									id="exchangeRate"
									value={exchangeRate}
									onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
									className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]"
								/>
							</div>
							<div>
								<label htmlFor="dueDate" className="block text-sm font-medium text-[var(--panel)]/90 mb-2">
									Due Date
								</label>
								<input
									type="date"
									id="dueDate"
									value={dueDate}
									onChange={(e) => setDueDate(e.target.value)}
									className="w-full px-4 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]"
								/>
							</div>
						</div>
					</motion.div>

					{/* Items Selection */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-[rgba(var(--info-rgb),0.3)] p-6 sm:p-8">
						<h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Select Items</h2>
						{availableItems.length === 0 ? (
							<p className="text-center text-[var(--panel)]/85 py-8">No items available in this container</p>
						) : (
							<div className="space-y-3">
								{availableItems.map((item) => {
									const totalCost =
										(item.freightCost || 0) +
										(item.towingCost || 0) +
										(item.clearanceCost || 0) +
										(item.vatCost || 0) +
										(item.customsCost || 0) +
										(item.otherCost || 0);
									const isSelected = selectedItems.includes(item.id);
									return (
										<label
											key={item.id}
											className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
												isSelected
													? 'bg-[rgba(var(--accent-gold-rgb),0.08)] border-[var(--accent-gold)]'
													: 'bg-[var(--panel)] border-[var(--border)] hover:border-[var(--accent-gold)]'
											}`}
										>
											<input
												type="checkbox"
												checked={isSelected}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedItems((prev) => [...prev, item.id]);
													} else {
														setSelectedItems((prev) => prev.filter((id) => id !== item.id));
													}
												}}
												className="w-5 h-5 rounded border-[var(--border)] text-[var(--info)] focus:ring-[rgba(var(--info-rgb),0.4)]"
											/>
											<div className="flex-1">
												<div className="flex items-center gap-4 flex-wrap">
													<span className="text-sm font-medium text-[var(--text-primary)]">VIN: {item.vin}</span>
													<span className="text-sm text-[var(--text-secondary)]">Lot: {item.lotNumber}</span>
													<span className="text-sm text-[var(--text-secondary)]">City: {item.auctionCity}</span>
												</div>
											</div>
											<span className="text-sm font-semibold text-[var(--accent-gold)]">${totalCost.toFixed(2)}</span>
										</label>
									);
								})}
							</div>
						)}
					</motion.div>

					{/* Summary */}
					{selectedItems.length > 0 && (
						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative rounded-xl bg-[var(--text-primary)]/50 backdrop-blur-sm border border-[rgba(var(--info-rgb),0.3)] p-6">
							<h3 className="text-lg font-bold text-white mb-4">Summary</h3>
							<div className="space-y-2">
								<div className="flex justify-between text-sm text-[var(--panel)]/85">
									<span>Selected Items:</span>
									<span className="text-white">{selectedItems.length}</span>
								</div>
								<div className="flex justify-between text-sm text-[var(--panel)]/85">
									<span>Exchange Rate:</span>
									<span className="text-white">{exchangeRate.toFixed(4)}</span>
								</div>
							</div>
						</motion.div>
					)}

					{/* Actions */}
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
						<Link href={`/dashboard/containers/${containerId}`} className="sm:w-auto w-full">
							<Button type="button" variant="outline" disabled={isCreating} className="w-full sm:w-auto border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
								Cancel
							</Button>
						</Link>
						<Button onClick={handleCreateInvoice} disabled={isCreating || selectedItems.length === 0} className="w-full sm:w-auto bg-[var(--accent-gold)] text-[var(--text-primary)] hover:bg-[var(--accent-gold)] shadow-lg shadow-[rgba(var(--accent-gold-rgb),0.25)]">
							{isCreating ? 'Creating...' : 'Create Invoice'}
						</Button>
					</motion.div>
				</div>
			</Section>
		</>
	);
}

