"use client";

import Link from 'next/link';
import { Calendar, CreditCard, MapPin, MessageSquare, PanelRightOpen, Pencil, QrCode, Truck } from 'lucide-react';
import { StatusBadge, Button } from '@/components/design-system';

interface ShipmentRowProps {
	id: string;
	vehicleType: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	status: string;
	createdAt: string;
	paymentStatus?: string;
	dispatchId?: string | null;
	containerId?: string | null;
	dispatch?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		origin?: string | null;
		destination?: string | null;
	} | null;
	container?: {
		id: string;
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		progress?: number;
		estimatedArrival?: string | null;
		vesselName?: string | null;
		shippingLine?: string | null;
	} | null;
	transit?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		destination?: string | null;
	} | null;
	yardReceived?: boolean;
	yardReceivedAt?: string | null;
	purchasePrice?: number | null;
	purchasePricePaid?: number | null;
	user?: {
		name: string | null;
		email: string;
	};
	showCustomer?: boolean;
	isAdmin?: boolean;
	onStatusUpdated?: () => void;
	delay?: number;
	onQuickPeek?: (id: string) => void;
	onOpenQR?: (shipment: any) => void;
	onNotify?: (id: string) => void;
	selectable?: boolean;
	selected?: boolean;
	onToggleSelect?: (id: string) => void;
}

const formatStatus = (status: string) => {
	return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function ShipmentRow({
	id,
	vehicleType,
	vehicleMake,
	vehicleModel,
	vehicleYear,
	vehicleVIN,
	status,
	createdAt,
	paymentStatus,
	dispatchId,
	dispatch,
	containerId,
	container,
	transit,
	yardReceived = false,
	yardReceivedAt,
	purchasePrice,
	purchasePricePaid,
	user,
	showCustomer = false,
	delay = 0,
	onQuickPeek,
	onOpenQR,
	onNotify,
	selectable = false,
	selected = false,
	onToggleSelect,
}: ShipmentRowProps) {
	const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || vehicleType;
	const paidAmount = Math.max(0, purchasePricePaid || 0);
	const totalPurchasePrice = Math.max(0, purchasePrice || 0);
	const remainingAmount = Math.max(0, totalPurchasePrice - paidAmount);
	const isPurchasePaidOff = totalPurchasePrice > 0 && remainingAmount <= 0;
	const shipmentHref = `/dashboard/shipments/${id}`;
	const editHref = `/dashboard/shipments/${id}/edit`;
    const statusRow = (
		<div style={{display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, marginTop: '4px'}}>
			<div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0}}>
				<StatusBadge 
					status={status} 
					variant="default" 
					size="sm"
					showIcon
				/>
				{paymentStatus && (
					<StatusBadge 
						status={paymentStatus} 
						variant="default" 
						size="sm"
						icon={<CreditCard className="h-3 w-3"/>}
					/>
				)}
			</div>
			{yardReceived && (
				<span style={{height: 24, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.12)', color: 'rgb(21, 128, 61)', border: '1px solid rgba(34, 197, 94, 0.28)', width: 'fit-content', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{yardReceivedAt ? `Yard Received ${new Date(yardReceivedAt).toLocaleDateString()}` : 'Yard Received'}</span>
			)}
		</div>
	);

	// ⚡ Bolt: Removed `useState` and `useEffect` for visibility and replaced `<Slide>` with a pure CSS animation
	// from `globals.css` (`className="animate-fade-in-up"`) applying the delay using inline styles.
	// This eliminates the double-render on mount for each row, significantly boosting list rendering performance.
	return (
			<article className="animate-fade-in-up" style={{animationDelay: `${delay}s`, animationFillMode: 'both', background: selected ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'var(--panel)', border: selected ? '1px solid var(--accent-gold)' : '1px solid rgba(var(--panel-rgb), 0.9)', borderLeft: selected ? '3px solid var(--accent-gold)' : '3px solid transparent', borderRadius: '16px', boxShadow: '0 18px 32px rgba(var(--text-primary-rgb), 0.08)', padding: 1.75, display: 'grid', gridTemplateColumns: purchasePrice != null
							? 'minmax(0, 1.6fr) minmax(0, 1.15fr) minmax(0, 0.95fr) minmax(0, 1fr) auto'
							: 'minmax(0, 1.6fr) minmax(0, 1.15fr) minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', minHeight: 'auto', minWidth: 0, width: '100%', boxSizing: 'border-box', color: 'inherit', transition: 'all 200ms ease', outline: 'none'}}>
				{/* Column 1: Vehicle Info & Status */}
				<div style={{display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden'}}>
					<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'}}>
						{selectable && (
							<label
								className="p-1 min-w-[28px] min-h-[28px] justify-center rounded-md hover:bg-[var(--panel)] cursor-pointer inline-flex items-center shrink-0"
								title={selected ? "Deselect" : "Select for batch action"}
							>
								<input
									type="checkbox"
									checked={selected}
									onChange={() => {
										if (onToggleSelect) onToggleSelect(id);
									}}
									aria-label={selected ? 'Deselect shipment for batch action' : 'Select shipment for batch action'}
									className="w-4 h-4 rounded accent-[var(--accent-gold)] cursor-pointer"
								/>
							</label>
						)}
						<Link href={shipmentHref} style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'block', textDecoration: 'none'}}>
							{vehicleInfo}
						</Link>
						<div style={{display: 'none', flexShrink: 0}}>
							<StatusBadge status={status} size="sm" showIcon />
						</div>
					</div>
					{vehicleVIN && (
						<div style={{display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content', paddingLeft: '6px', paddingRight: '6px', paddingTop: '1.6px', paddingBottom: '1.6px', borderRadius: '999px', backgroundColor: 'rgba(var(--border-rgb), 0.3)'}}>
							<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)'}}>
								VIN:
							</p>
							<p style={{fontSize: '0.68rem', color: 'var(--text-primary)', fontFamily: 'monospace'}}>
								{vehicleVIN}
							</p>
						</div>
					)}
					<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)'}}>
						Created: {new Date(createdAt).toLocaleDateString()}
					</p>
					<div style={{display: 'flex'}}>{statusRow}</div>
				</div>

				{/* Column 2: Vehicle Type */}
				<div style={{minWidth: 0, overflow: 'hidden'}}>
					<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
						Vehicle Type
					</p>
					<p style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{vehicleType}</p>
					{showCustomer && user && (
						<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
							{user.name || user.email}
						</p>
					)}
				</div>

				{/* Column 2b: Purchase Price (finance roles only) */}
				{purchasePrice != null && (
					<div style={{minWidth: 0, overflow: 'hidden'}}>
						<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
							Purchase Price
						</p>
						<p style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
							${purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</p>
						{paidAmount > 0 ? (
							<>
								<p style={{fontSize: '0.68rem', fontWeight: 700, color: isPurchasePaidOff ? 'rgb(34, 197, 94)' : 'rgb(251, 191, 36)', marginTop: '2.4px'}}>
									Paid ${Math.min(paidAmount, totalPurchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${totalPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</p>
								<p style={{fontSize: '0.66rem', fontWeight: 600, color: isPurchasePaidOff ? 'rgb(34, 197, 94)' : 'var(--text-secondary)', marginTop: '1.6px'}}>
									{isPurchasePaidOff ? '✓ Paid Off' : `Remaining $${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
								</p>
							</>
						) : (
							<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2.4px'}}>Unpaid</p>
						)}
					</div>
				)}

				{/* Column 3: Container Info or Status Info */}
				<div style={{minWidth: 0, overflow: 'hidden'}}>
					{transit ? (
						<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
							<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
								Transit
							</p>
							<div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
								<Truck className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>
								<p style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-gold-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									{transit.referenceNumber}
								</p>
							</div>
							<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1.6px'}}>
								Final-mile delivery in progress
							</p>
							{transit.destination && (
								<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '1.6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									Destination: {transit.destination}
								</p>
							)}
						</div>
					) : container ? (
						<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
							<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
								Container Shipping
							</p>
							
							{/* Container Number */}
							<div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
								<Truck className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>
								<p style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-gold-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									{container.containerNumber}
								</p>
							</div>

							{/* Progress Bar */}
							{typeof container.progress === 'number' && (
								<div style={{display: 'flex', flexDirection: 'column', gap: '2.4px', marginTop: '2.4px'}}>
									<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
										<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)'}}>
											Progress
										</p>
										<p style={{fontSize: '0.68rem', fontWeight: 600, color: 'var(--accent-gold-text)'}}>
											{container.progress}%
										</p>
									</div>
									<div style={{height: 4, borderRadius: '8px', backgroundColor: 'rgba(var(--border-rgb), 0.3)'}} className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" role="progressbar" aria-valuenow={container.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{ width: `${container.progress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
								</div>
							)}

							{/* Status */}
							{container.status && (
								<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1.6px'}}>
									Status: {formatStatus(container.status)}
								</p>
							)}

							{/* Current Location */}
							{container.currentLocation && (
								<div style={{display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1.6px'}}>
									<MapPin className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }}/>
									<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
										{container.currentLocation}
									</p>
								</div>
							)}

							{/* Vessel Name */}
							{container.vesselName && (
								<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '1.6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									🚢 {container.vesselName}
								</p>
							)}

							{/* Estimated Arrival */}
							{container.estimatedArrival && (
								<div style={{display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1.6px'}}>
									<Calendar className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }}/>
									<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)'}}>
										ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
									</p>
								</div>
							)}

							{/* Shipping Line */}
							{container.shippingLine && (
								<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '1.6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									Line: {container.shippingLine}
									</p>
							)}
						</div>
					) : dispatch ? (
						<div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
							<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
								Dispatch To Port
							</p>
							<div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
								<Truck className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>
								<p style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
									{dispatch.referenceNumber}
								</p>
							</div>
							<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1.6px'}}>
								{dispatch.origin || 'USA Yard'} to {dispatch.destination || 'Port of Loading'}
							</p>
							{dispatch.status && (
								<p style={{fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '1.6px'}}>
									Status: {formatStatus(dispatch.status)}
								</p>
							)}
						</div>
					) : (
						<>
							<p style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', marginBottom: '2.4px'}}>
								Location
							</p>
							<p style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)'}}>
								Warehouse
							</p>
							<p style={{fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1.6px'}}>
								{dispatchId ? 'Dispatch assigned' : 'On Hand'}
							</p>
						</>
					)}
				</div>

				<div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexShrink: 0}}>
					{onQuickPeek && (
						<Button
							variant="outline"
							size="sm"
							icon={<PanelRightOpen className="w-3.5 h-3.5" />}
							iconPosition="start"
							onClick={(event) => {
								event.stopPropagation();
								onQuickPeek(id);
							}}
							style={{borderRadius: '999px', minWidth: 'auto', paddingLeft: '10px', paddingRight: '10px', fontSize: '0.75rem'}}
						>
							Quick Peek
						</Button>
					)}
					{onOpenQR && (
						<Button
							variant="outline"
							size="sm"
							icon={<QrCode className="w-3.5 h-3.5" />}
							onClick={(event) => {
								event.stopPropagation();
								onOpenQR({
									id,
									vehicle: vehicleInfo,
									vin: vehicleVIN || '-',
									customer: user?.name || user?.email || '-',
									status,
								});
							}}
							title="Print Yard QR Sticker"
							style={{borderRadius: '999px', minWidth: 'auto', paddingLeft: '8px', paddingRight: '8px'}}
						/>
					)}
					{onNotify && (
						<Button
							variant="outline"
							size="sm"
							icon={<MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
							onClick={(event) => {
								event.stopPropagation();
								onNotify(id);
							}}
							title="WhatsApp Business & Customer Notification Studio"
							style={{borderRadius: '999px', minWidth: 'auto', paddingLeft: '8px', paddingRight: '8px', borderColor: 'rgba(16, 185, 129, 0.35)'}}
						/>
					)}
					<Button
						component={Link}
						href={editHref}
						variant="ghost"
						size="sm"
						icon={<Pencil className="h-3.5 w-3.5"/>}
						iconPosition="start"
						onClick={(event) => {
							event.stopPropagation();
						}}
						style={{borderRadius: '999px', minWidth: 'auto', minHeight: 'auto', paddingLeft: '10px', paddingRight: '10px', color: 'var(--accent-gold-text)'}}
					>
						Pencil
					</Button>
				</div>

				<div style={{display: 'none', gridColumn: '1 / -1', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '8px', marginTop: '4px', borderTop: '1px solid rgba(var(--border-rgb), 0.4)'}}>
					<div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: 0}}>
						{yardReceived && (
							<span style={{height: 22, fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.12)', color: 'rgb(21, 128, 61)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Yard Received"</span>
						)}
						{paymentStatus && (
							<StatusBadge 
								status={paymentStatus} 
								variant="default" 
								size="sm" 
								icon={<CreditCard className="h-3 w-3"/>} 
							/>
						)}
					</div>
					<div style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
						{onQuickPeek && (
							<Button
								variant="outline"
								size="sm"
								icon={<PanelRightOpen className="w-3.5 h-3.5" />}
								onClick={(event) => {
									event.stopPropagation();
									onQuickPeek(id);
								}}
								style={{minWidth: 'auto', minHeight: 'auto', borderRadius: '999px', paddingLeft: '8px', paddingRight: '8px'}}
							/>
						)}
						{onOpenQR && (
							<Button
								variant="outline"
								size="sm"
								icon={<QrCode className="w-3.5 h-3.5" />}
								onClick={(event) => {
									event.stopPropagation();
									onOpenQR({
										id,
										vehicle: vehicleInfo,
										vin: vehicleVIN || '-',
										customer: user?.name || user?.email || '-',
										status,
									});
								}}
								style={{minWidth: 'auto', minHeight: 'auto', borderRadius: '999px', paddingLeft: '8px', paddingRight: '8px'}}
							/>
						)}
						<Button
							component={Link}
							href={shipmentHref}
							variant="outline"
							size="sm"
							onClick={(event) => {
								event.stopPropagation();
							}}
							style={{minHeight: 'auto', borderRadius: '999px', paddingLeft: '12px', paddingRight: '12px', fontSize: '0.75rem', fontWeight: 600}}
						>
							View
						</Button>
						<Button
							component={Link}
							href={editHref}
							variant="ghost"
							size="sm"
							icon={<Pencil className="h-3.5 w-3.5"/>}
							iconPosition="start"
							onClick={(event) => {
								event.stopPropagation();
							}}
							style={{minHeight: 'auto', borderRadius: '999px', paddingLeft: '10px', paddingRight: '10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold-text)'}}
						>
							Pencil
						</Button>
					</div>
				</div>
			</article>
	);
}
