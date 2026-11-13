'use client';

import { useEffect, useState } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, CheckCircle2, Clock, Copy, MapPin, Package, Search, Ship, XCircle, Camera, Plus, Minus, Layers, List, Loader2 } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, EmptyState, FormField, Breadcrumbs, toast, DashboardPageSkeleton, StatusBadge } from '@/components/design-system';
import TrackingRouteMap from '@/components/tracking/TrackingRouteMap';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';

interface TrackingEventEntry {
	id: string;
	status: string;
	statusCode?: string;
	location?: string;
	terminal?: string;
	timestamp?: string;
	actual: boolean;
	description?: string;
}

interface TrackingDetails {
	containerNumber: string;
	isContainerAssigned?: boolean;
	containerType?: string;
	shipmentStatus?: string;
	origin?: string;
	destination?: string;
	currentLocation?: string;
	estimatedArrival?: string;
	estimatedDeparture?: string;
	progress?: number | null;
	company?: {
		name?: string;
		url?: string | null;
		scacs?: string[];
	};
	events: TrackingEventEntry[];
}

const normalizeProgress = (value: TrackingDetails['progress']) => {
	if (typeof value !== 'number' || Number.isNaN(value)) return null;
	return Math.min(100, Math.max(0, Math.round(value)));
};

const formatDisplayDate = (value?: string) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
};

const RECENT_TRACKING_KEY = 'jacxi.recentTrackingNumbers';

function getStoredTrackingNumbers() {
	if (typeof window === 'undefined') return [];
	try {
		const value = window.localStorage.getItem(RECENT_TRACKING_KEY);
		const parsed = value ? JSON.parse(value) : [];
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
	} catch {
		return [];
	}
}

export default function DashboardTrackingPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [trackingNumber, setTrackingNumber] = useState('');
	const [trackingDetails, setTrackingDetails] = useState<TrackingDetails | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [recentTrackingNumbers, setRecentTrackingNumbers] = useState<string[]>([]);
	const [scannerOpen, setScannerOpen] = useState(false);
	const [showRouteMap, setShowRouteMap] = useState(false);
	const [batchMode, setBatchMode] = useState(false);
	const [batchNumbers, setBatchNumbers] = useState<string[]>(['']);
	const [batchResults, setBatchResults] = useState<Array<{ number: string; details: TrackingDetails | null; error?: string }>>([]);
	const [batchLoading, setBatchLoading] = useState(false);

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.replace('/auth/signin?callbackUrl=/dashboard/tracking');
		}
	}, [status, router]);

	useEffect(() => {
		setRecentTrackingNumbers(getStoredTrackingNumbers());
	}, []);

	const saveRecentTrackingNumber = (value: string) => {
		const next = [value, ...recentTrackingNumbers.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
		setRecentTrackingNumbers(next);
		window.localStorage.setItem(RECENT_TRACKING_KEY, JSON.stringify(next));
	};

	const clearRecentTrackingNumbers = () => {
		setRecentTrackingNumbers([]);
		window.localStorage.removeItem(RECENT_TRACKING_KEY);
	};

	const copyTrackingNumber = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success('Tracking number copied');
		} catch {
			toast.error('Unable to copy tracking number');
		}
	};

	const handleTrack = async (overrideNumber?: string) => {
		const raw = (overrideNumber || trackingNumber).trim();
		const value = sanitizeTrackNumber(raw) || raw;
		if (!value) {
			setErrorMessage('Enter a container or tracking number to continue.');
			setTrackingDetails(null);
			return;
		}

		setTrackingNumber(value);
		setIsLoading(true);
		setErrorMessage(null);
		setTrackingDetails(null);

		try {
			const response = await fetch('/api/tracking', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ trackNumber: value, needRoute: true }),
			});

			const payload = (await response.json()) as {
				tracking?: TrackingDetails;
				message?: string;
			};

			if (!response.ok) {
				setErrorMessage(payload?.message || 'Unable to fetch tracking information.');
				return;
			}

			const details: TrackingDetails | undefined = payload?.tracking;
			if (!details) {
				setErrorMessage('No tracking data returned for that number.');
				return;
			}

			setTrackingDetails(details);
			saveRecentTrackingNumber(value);
		} catch (error: unknown) {
			console.error('Dashboard tracking error:', error);
			setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch tracking information.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleBatchTrack = async () => {
		const numbers = batchNumbers.map((n) => sanitizeTrackNumber(n.trim()) || n.trim()).filter(Boolean);
		if (numbers.length === 0) {
			setErrorMessage('Enter at least one container or tracking number to continue.');
			return;
		}

		setBatchLoading(true);
		setErrorMessage(null);
		setBatchResults(numbers.map((n) => ({ number: n, details: null })));

		const results: Array<{ number: string; details: TrackingDetails | null; error?: string }> = [];
		for (const number of numbers) {
			try {
				const response = await fetch('/api/tracking', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ trackNumber: number, needRoute: true }),
				});
				const payload = (await response.json()) as { tracking?: TrackingDetails; message?: string };
				if (!response.ok) {
					results.push({ number, details: null, error: payload?.message || 'Unable to fetch tracking information.' });
				} else if (!payload?.tracking) {
					results.push({ number, details: null, error: 'No tracking data returned.' });
				} else {
					results.push({ number, details: payload.tracking });
				}
			} catch (error: unknown) {
				results.push({ number, details: null, error: error instanceof Error ? error.message : 'Failed to fetch tracking information.' });
			}
		}

		setBatchResults(results);
		setBatchLoading(false);
	};

	if (status === 'loading') {
		return <DashboardPageSkeleton />;
	}

	if (!session) {
		return null;
	}

	const progressValue = normalizeProgress(trackingDetails?.progress);
	const timelineEvents = (trackingDetails?.events || []).map((event) => ({
		...event,
		displayTimestamp: formatDisplayDate(event.timestamp) || event.timestamp || 'Pending update',
		icon: event.actual ? CheckCircle2 : Clock,
	}));

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Shipment Tracking"
				description="Monitor containers and track shipment milestones in real-time"
			/>

			{/* Search Panel */}
			<DashboardPanel title="Track Shipment" description="Enter container or tracking number">
				{/* Batch Mode Toggle */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
					<p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)'}}>
						{batchMode ? 'Batch Tracking Mode' : 'Single Tracking Mode'}
					</p>
					<Button
						variant="outline"
						size="sm"
						icon={batchMode ? <Search className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
						onClick={() => {
							setBatchMode(!batchMode);
							setBatchResults([]);
							setTrackingDetails(null);
							setErrorMessage(null);
						}}
					>
						{batchMode ? 'Single Mode' : 'Batch Mode'}
					</Button>
				</JXBox>

				{batchMode ? (
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
						{batchNumbers.map((num, idx) => (
							<JXBox padding="none" border={false} key={idx} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}}>
									<FormField
										label=""
										type="text"
										value={num}
										onChange={(e) => {
											const next = [...batchNumbers];
											next[idx] = e.target.value;
											setBatchNumbers(next);
										}}
										placeholder={`Container or tracking #${idx + 1}`}
										leftIcon={<Search style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
										onKeyPress={(e) => {
											if (e.key === 'Enter' && !batchLoading) {
												void handleBatchTrack();
											}
										}}
									/>
								</JXBox>
								{batchNumbers.length > 1 && (
									<Button
										variant="ghost"
										size="sm"
										icon={<Minus className="w-4 h-4 text-[var(--error)]" />}
										onClick={() => {
											setBatchNumbers(prev => prev.filter((_, i) => i !== idx));
										}}
									/>
								)}
							</JXBox>
						))}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
							<Button
								variant="outline"
								size="sm"
								icon={<Plus className="w-4 h-4" />}
								onClick={() => setBatchNumbers(prev => [...prev, ''])}
							>
								Add Another
							</Button>
							<Button
								variant="primary"
								onClick={() => void handleBatchTrack()}
								disabled={batchLoading || batchNumbers.every(n => !n.trim())}
								icon={batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
							>
								{batchLoading ? 'Tracking...' : `Track All (${batchNumbers.filter(n => n.trim()).length})`}
							</Button>
						</JXBox>

						{/* Batch Results */}
						{batchResults.length > 0 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
								{batchResults.map((result, idx) => (
									<JXBox padding="none" border={false} key={idx} style={{padding: '16px', borderRadius: '16px', border: `1px solid ${result.error ? 'rgba(239, 68, 68, 0.3)' : result.details ? 'rgba(34, 211, 238, 0.3)' : 'var(--border)'}`, backgroundColor: result.error ? 'rgba(239, 68, 68, 0.05)' : result.details ? 'rgba(34, 211, 238, 0.05)' : 'var(--background)'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0px'}}>
												{result.error ? (
													<XCircle className="w-4 h-4 text-[var(--error)] shrink-0" />
												) : result.details ? (
													<CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
												) : (
													<Clock className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
												)}
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '0px'}}>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)'}}>
														{result.number}
													</p>
													{result.error && (
														<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--error)'}}>
															{result.error}
														</p>
													)}
													{result.details && (
														<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
															{result.details.origin || 'N/A'} → {result.details.destination || 'N/A'}
															{result.details.shipmentStatus && ` • ${result.details.shipmentStatus.replace(/_/g, ' ')}`}
														</p>
													)}
												</JXBox>
											</JXBox>
											{result.details && (
												<Button
													variant="outline"
													size="sm"
													icon={<Search className="w-4 h-4" />}
													onClick={() => {
														setBatchMode(false);
														setTrackingNumber(result.number);
														setTrackingDetails(result.details);
													}}
												>
													View Details
												</Button>
											)}
										</JXBox>
									</JXBox>
								))}
							</JXBox>
						)}
					</JXBox>
				) : (
					<>
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px'}} className="flex-col sm:flex-row">
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}}>
						<FormField
							label=""
							type="text"
							value={trackingNumber}
							onChange={(e) => setTrackingNumber(e.target.value)}
							placeholder="Container or tracking number (e.g., UETU6059142)"
							leftIcon={<Search style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
							onKeyPress={(e) => {
								if (e.key === 'Enter') {
									void handleTrack();
								}
							}}
						/>
					</JXBox>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'flex-end', gap: '8px'}}>
						<Button
							variant="outline"
							onClick={() => setScannerOpen(true)}
							icon={<Camera className="w-4 h-4" />}
						>
							Scan
						</Button>
						<Button
							variant="primary"
							onClick={() => void handleTrack()}
							disabled={isLoading}
							icon={isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
						>
							{isLoading ? 'Tracking...' : 'Track'}
						</Button>
					</JXBox>
				</JXBox>

				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', display: 'grid', gap: '16px'}} className="grid-cols-1 grid lg:grid-cols-[1.2fr_0.8fr]">
					<JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px'}}>
							<p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)'}}>
								Recent lookups
							</p>
							{recentTrackingNumbers.length > 0 && (
								<Button variant="ghost" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={clearRecentTrackingNumbers}>
									Clear
								</Button>
							)}
						</JXBox>
						{recentTrackingNumbers.length === 0 ? (
							<p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
								Successful tracking searches will appear here for fast repeat checks.
							</p>
						) : (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
								{recentTrackingNumbers.map((number) => (
									<Button
										key={number}
										variant="outline"
										size="sm"
										icon={<Clock className="w-4 h-4" />}
										onClick={() => void handleTrack(number)}
										disabled={isLoading}
									>
										{number}
									</Button>
								))}
							</JXBox>
						)}
					</JXBox>

					<JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
						<p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px'}}>
							Tracking readiness
						</p>
						<p className="text-sm leading-relaxed" style={{fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 700}}>
							Container number, booking number, or carrier tracking ID
						</p>
						<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
							Results include carrier milestones, route, ETA, and progress when the provider returns those fields.
						</p>
					</JXBox>
				</JXBox>

				{errorMessage && (
					<JXBox padding="none" border={false} style={{marginTop: '16px', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'start', gap: '12px'}}>
						<AlertCircle style={{ fontSize: 18, color: 'rgb(239, 68, 68)', flexShrink: 0 }} />
						<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'rgb(239, 68, 68)'}}>
							{errorMessage}
						</p>
					</JXBox>
				)}
					</>
				)}
			</DashboardPanel>

			{/* Tracking Results */}
			{trackingDetails ? (
				<>
					{/* Interactive Route Map Toggle Button */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '8px'}}>
						<Button
							variant={showRouteMap ? 'primary' : 'outline'}
							size="sm"
							icon={<Ship className="w-4 h-4" />}
							onClick={() => setShowRouteMap((prev) => !prev)}
						>
							{showRouteMap ? 'Hide Route Map' : 'View Interactive Route Map'}
						</Button>
					</JXBox>

					{/* Interactive Route Map (Only on demand) */}
					{showRouteMap && (
						<DashboardPanel title="Interactive Route Map" description="Live vessel and overland transit visualization">
							<TrackingRouteMap
								progressPercent={progressValue ?? 35}
								origin={trackingDetails.origin || 'USA / Canada'}
								destination={trackingDetails.destination || 'Afghanistan'}
								containerNumber={trackingDetails.containerNumber}
								estimatedArrival={trackingDetails.estimatedArrival}
							/>
						</DashboardPanel>
					)}

					{/* Container Details */}
					<DashboardPanel title="Container Details" description="Current status and information">
						<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Container Number
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all'}}>
									{trackingDetails.containerNumber}
								</p>
								<Button
									variant="ghost"
									size="sm"
									icon={<Copy className="w-4 h-4" />}
									onClick={() => void copyTrackingNumber(trackingDetails.containerNumber)}
									style={{marginTop: '8px'}}
								>
									Copy
								</Button>
								{trackingDetails.company?.name && (
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
										Carrier: {trackingDetails.company.name}
									</p>
								)}
							</JXBox>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Status
								</p>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px'}}>
									<StatusBadge status={trackingDetails.shipmentStatus || 'IN_TRANSIT'} size="md" />
								</JXBox>
							</JXBox>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Current Location
								</p>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px'}}>
									<MapPin style={{ fontSize: 16, color: 'var(--text-secondary)' }} />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
										{trackingDetails.currentLocation || 'Not available'}
									</p>
								</JXBox>
							</JXBox>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Estimated Arrival
								</p>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px'}}>
									<Calendar style={{ fontSize: 16, color: 'var(--text-secondary)' }} />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
										{formatDisplayDate(trackingDetails.estimatedArrival) || 'Not available'}
									</p>
								</JXBox>
							</JXBox>
						</DashboardGrid>

						{/* Route Information */}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
							<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Origin
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
									{trackingDetails.origin || 'Not available'}
								</p>
							</JXBox>

							<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Destination
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
									{trackingDetails.destination || 'Not available'}
								</p>
							</JXBox>

							<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
									Container Type
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
									{trackingDetails.containerType || 'Not available'}
								</p>
							</JXBox>
						</JXBox>

						{/* Progress Bar */}
						{progressValue !== null && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Shipment Progress
									</p>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
										{progressValue}%
									</p>
								</JXBox>
								<JXBox padding="none" border={false} style={{width: '100%', height: '8px', borderRadius: '8px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', overflow: 'hidden'}}>
									<JXBox padding="none" border={false} style={{borderRadius: 0, width: `${progressValue}%`, height: '100%', backgroundColor: 'var(--accent-gold)', transition: 'width 0.5s ease'}} />
								</JXBox>
							</JXBox>
						)}
					</DashboardPanel>

					{/* Timeline/Milestones */}
					<DashboardPanel title="Carrier Milestones" description="Tracking history and updates" fullHeight>
						{timelineEvents.length === 0 ? (
							<EmptyState
								icon={<Package />}
								title="No milestone history"
								description="No tracking events available for this container yet"
							/>
						) : (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								{timelineEvents.map((event) => {
									const Icon = event.icon;
									const isActual = event.actual;
									return (
										<JXBox padding="none" border={false} key={event.id} style={{padding: '16px', borderRadius: '16px', border: `1px solid ${isActual ? 'rgba(34, 211, 238, 0.3)' : 'var(--border)'}`, backgroundColor: isActual ? 'rgba(34, 211, 238, 0.05)' : 'var(--panel)', transition: 'all 0.2s ease'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'start', gap: '16px'}}>
												<JXBox padding="none" border={false} style={{width: '40px', height: '40px', borderRadius: '16px', backgroundColor: isActual ? 'rgba(34, 211, 238, 0.15)' : 'var(--background)', border: `1px solid ${isActual ? 'rgba(34, 211, 238, 0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
													<Icon style={{ fontSize: 18, color: isActual ? 'rgb(34, 211, 238)' : 'var(--text-secondary)' }} />
												</JXBox>

												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1, minWidth: '0px'}}>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px'}}>
														{event.status}
													</p>
													
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px'}}>
														{event.location && (
															<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px'}}>
																<MapPin style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
																<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
																	{event.location}
																</p>
															</JXBox>
														)}
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px'}}>
															<Clock style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
															<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
																{event.displayTimestamp}
															</p>
														</JXBox>
													</JXBox>

													{event.description && (
														<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
															{event.description}
														</p>
													)}
												</JXBox>
											</JXBox>
										</JXBox>
									);
								})}
							</JXBox>
						)}
					</DashboardPanel>
				</>
			) : !isLoading && !errorMessage && (
				<DashboardPanel fullHeight>
					<EmptyState
						icon={<Ship />}
						title="Start tracking"
						description="Enter a container or tracking number above to view shipment details and milestones"
					/>
				</DashboardPanel>
			)}
			<BarcodeScannerModal
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onScan={(scanned) => {
					setScannerOpen(false);
					setTrackingNumber(scanned);
					void handleTrack(scanned);
				}}
				title="Scan Container or VIN QR Code"
				description="Align vehicle VIN barcode, tracking QR code, or container label within the camera frame"
			/>
		</DashboardSurface>
	);
}
