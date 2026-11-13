"use client";

import Link from 'next/link';
import { ArrowForward, LocalShipping, LocationOn, CalendarToday } from '@mui/icons-material';
import { Slide } from '@mui/material';
import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { useState, useEffect } from 'react';
import { Button, StatusBadge } from '@/components/design-system';

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
		<Slide in={isVisible} direction="up" timeout={400}>
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
							<JXTypography
								variant="body"
								className="!truncate !text-[0.75rem] sm:!text-[0.8rem] !font-semibold !text-[var(--text-primary)]"
							>
								{vehicleInfo}
							</JXTypography>
							{vehicleVIN && (
								<JXTypography
									variant="caption"
									className="!mt-[1.6px] !block !truncate !text-[0.6rem] sm:!text-[0.65rem] !text-[var(--text-secondary)]"
								>
									VIN: {vehicleVIN}
								</JXTypography>
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
						<JXTypography
							variant="caption"
							className="!block !text-[0.6rem] sm:!text-[0.65rem] !uppercase !tracking-[0.18em] !text-[var(--text-secondary)]"
						>
							Vehicle Type
						</JXTypography>
						<JXTypography
							variant="body"
							className="!truncate !text-[0.72rem] sm:!text-[0.78rem] !font-medium !text-[var(--text-primary)]"
						>
							{vehicleType}
						</JXTypography>
					</div>

					{/* Container Shipping Info */}
					{container && (
						<div className="mt-1 flex min-w-0 flex-col gap-2">
							{/* Container Number and Status */}
							<div className="flex min-w-0 items-center justify-between gap-2">
								<div className="flex min-w-0 flex-1 items-center gap-1">
									<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)', flexShrink: 0 }} />
									<Link href={`/dashboard/containers/${containerId}`} style={{ textDecoration: 'none', minWidth: 0, overflow: 'hidden' }}>
										<JXTypography
											variant="body"
											className="!truncate !text-[0.7rem] sm:!text-[0.75rem] !font-semibold !text-[var(--accent-gold-text)] hover:!underline"
										>
											{container.containerNumber}
										</JXTypography>
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
										<JXTypography
											variant="caption"
											className="!text-[0.6rem] sm:!text-[0.65rem] !uppercase !tracking-[0.15em] !text-[var(--text-secondary)]"
										>
											Shipping Progress
										</JXTypography>
										<JXTypography
											variant="caption"
											className="!text-[0.65rem] sm:!text-[0.7rem] !font-semibold !text-[var(--accent-gold-text)]"
										>
											{container.progress}%
										</JXTypography>
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
									<LocationOn sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)', flexShrink: 0 }} />
									<JXTypography
										variant="caption"
										className="!truncate !text-[0.65rem] sm:!text-[0.7rem] !text-[var(--text-secondary)]"
									>
										{container.currentLocation}
									</JXTypography>
								</div>
							)}

							{/* Vessel and ETA */}
							<div className="flex min-w-0 flex-col gap-1">
								{container.vesselName && (
									<JXTypography
										variant="caption"
										className="!truncate !text-[0.65rem] sm:!text-[0.7rem] !text-[var(--text-secondary)]"
									>
										<span style={{ fontWeight: 600 }}>Vessel:</span> {container.vesselName}
									</JXTypography>
								)}
								{container.estimatedArrival && (
									<div className="flex min-w-0 items-center gap-1">
										<CalendarToday sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)', flexShrink: 0 }} />
										<JXTypography
											variant="caption"
											className="!truncate !text-[0.65rem] sm:!text-[0.7rem] !text-[var(--text-secondary)]"
										>
											ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
										</JXTypography>
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
							icon={<ArrowForward sx={{ fontSize: { xs: 12, sm: 14 } }} />}
							iconPosition="end"
							className="!min-w-0 !p-0 !text-[0.65rem] sm:!text-[0.7rem] !font-semibold !normal-case !text-[var(--accent-gold-text)] shrink-0"
						>
							View Details
						</Button>
					</div>
				</JXBox>
			</div>
		</Slide>
	);
}