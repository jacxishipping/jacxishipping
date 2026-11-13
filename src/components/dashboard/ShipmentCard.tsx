"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useState, useEffect } from 'react';
import { Button, StatusBadge } from '@/components/design-system';
import { ArrowRight, Calendar, MapPin, Truck } from 'lucide-react';

type ShipmentCardProps = {
	id: string;
	vehicleType: string;
	vehicleMake?: string | null;
	vehicleModel?: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	status: string;
	containerId?: string | null;
	container?: {
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		estimatedArrival?: string | null;
		vesselName?: string | null;
		shippingLine?: string | null;
		progress?: number;
	} | null;
	delay?: number;
};

export default function ShipmentCard({
	id,
	vehicleType,
	vehicleMake,
	vehicleModel,
	vehicleYear,
	vehicleVIN,
	status,
	containerId,
	container,
	delay = 0,
}: ShipmentCardProps) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setIsVisible(true), delay * 1000);
		return () => clearTimeout(timer);
	}, [delay]);

	const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || vehicleType;

	return (
		<motion.div initial={{ opacity: 0, y: 24 }} animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }} transition={{ duration: 0.4 }}>
			<div>
				<JXBox
					component="article"
					surface="elevated"
					padding="none"
					className="flex w-full min-w-0 flex-col gap-[8.8px] !rounded-lg p-2 sm:p-2.5 box-border text-[var(--text-primary)] jx-elevation-1 jx-spring hover:-translate-y-0.5 hover:!border-[rgba(var(--accent-gold-rgb),0.4)] transition-all duration-200"
					style={{
						border: '1px solid var(--border)',
						background: 'var(--panel)',
						fontFamily: 'inherit',
					}}
				>
					{/* Header: Vehicle Info & Status */}
					<div className="flex min-w-0 justify-between gap-2">
						<div className="min-w-0 flex-1 overflow-hidden">
							<span className="block truncate text-[0.75rem] sm:text-[0.8rem] font-semibold text-[var(--text-primary)]">
								{vehicleInfo}
							</span>
							{vehicleVIN && (
								<span className="mt-[1.6px] block truncate text-[0.6rem] sm:text-[0.65rem] text-[var(--text-secondary)]">
									VIN: {vehicleVIN}
								</span>
							)}
						</div>
						<StatusBadge 
							status={status} 
							variant="outline"
							size="sm"
						/>
					</div>

					{/* Vehicle Details */}
					<div className="flex min-w-0 flex-col gap-1">
						<span className="block text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
							Vehicle Type
						</span>
						<span className="truncate text-[0.72rem] sm:text-[0.78rem] font-medium text-[var(--text-primary)]">
							{vehicleType}
						</span>
					</div>

					{/* Container Shipping Info */}
					{container && (
						<div className="mt-1 flex min-w-0 flex-col gap-2">
							{/* Container Number and Status */}
							<div className="flex min-w-0 items-center justify-between gap-2">
								<div className="flex min-w-0 flex-1 items-center gap-1">
									<Truck className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>
									<Link href={`/dashboard/containers/${containerId}`} style={{ textDecoration: 'none', minWidth: 0, overflow: 'hidden' }}>
										<span className="truncate text-[0.7rem] sm:text-[0.75rem] font-semibold text-[var(--accent-gold-text)] hover:underline">
											{container.containerNumber}
										</span>
									</Link>
								</div>
								{container.status && (
									<StatusBadge 
										status={container.status} 
										variant="outline"
										size="sm"
									/>
								)}
							</div>

							{/* Shipping Progress */}
							{typeof container.progress === 'number' && (
								<div className="flex min-w-0 flex-col gap-[2.4px]">
									<div className="flex items-center justify-between">
										<span className="text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
											Shipping Progress
										</span>
										<span className="text-[0.65rem] sm:text-[0.7rem] font-semibold text-[var(--accent-gold-text)]">
											{container.progress}%
										</span>
									</div>
									<div
										className="h-1 sm:h-[5px] w-full overflow-hidden rounded"
										style={{ backgroundColor: 'rgba(var(--border-rgb, 255, 255, 255), 0.1)' }}
									>
										<div
											className="h-full rounded transition-all duration-300"
											style={{
												width: `${Math.min(100, Math.max(0, container.progress))}%`,
												backgroundColor: 'var(--accent-gold)',
											}}
										/>
									</div>
								</div>
							)}

							{/* Current Location */}
							{container.currentLocation && (
								<div className="flex min-w-0 items-center gap-1">
									<MapPin className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }}/>
									<span className="truncate text-[0.65rem] sm:text-[0.7rem] text-[var(--text-secondary)]">
										{container.currentLocation}
									</span>
								</div>
							)}

							{/* Vessel and ETA */}
							<div className="flex min-w-0 flex-col gap-1">
								{container.vesselName && (
									<span className="truncate text-[0.65rem] sm:text-[0.7rem] text-[var(--text-secondary)]">
										<span style={{ fontWeight: 600 }}>Vessel:</span> {container.vesselName}
									</span>
								)}
								{container.estimatedArrival && (
									<div className="flex min-w-0 items-center gap-1">
										<Calendar className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }}/>
										<span className="truncate text-[0.65rem] sm:text-[0.7rem] text-[var(--text-secondary)]">
											ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Footer: View Details Button */}
					<div className="mt-1 flex min-w-0 items-center justify-end gap-2">
						<Button
							href={`/dashboard/shipments/${id}`}
							variant="ghost"
							size="sm"
							icon={<ArrowRight className="h-3.5 w-3.5"/>}
							iconPosition="end"
							className="!min-w-0 !p-0 !text-[0.65rem] sm:!text-[0.7rem] !font-semibold !normal-case !text-[var(--accent-gold-text)] shrink-0"
						>
							View Details
						</Button>
					</div>
				</JXBox>
			</div>
		</motion.div>
	);
}