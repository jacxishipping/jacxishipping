/**
 * PGL tracking integration service.
 * Fetches container tracking history from the public PGL endpoint.
 */

import { logger } from '@/lib/logger';

const PGL_TRACKING_ENDPOINT = 'https://api.pglsystem.com/api/public/tracking';

// In-memory TTL cache for PGL lookups. The upstream API is slow (1-4s) and
// tracking data changes infrequently, so a short cache dramatically speeds up
// repeat lookups (page refreshes, share-link visits, status syncs).
const PGL_CACHE_TTL_MS = 5 * 60 * 1000;
const pglCache = new Map<string, { entries: PGLTrackingEntry[]; expiresAt: number }>();

interface ExternalTrackingEvent {
	status: string;
	location: string;
	timestamp: string;
	description?: string;
	vesselName?: string;
	voyageNumber?: string;
	latitude?: number;
	longitude?: number;
	completed?: boolean;
}

export interface ContainerTrackingSnapshot {
	containerNumber: string;
	trackingNumber: string;
	bookingNumber?: string;
	vesselName?: string;
	voyageNumber?: string;
	shippingLine?: string;
	loadingPort?: string;
	destinationPort?: string;
	loadingDate?: string;
	departureDate?: string;
	estimatedArrival?: string;
	containerType?: string;
	status?: string;
	trackingEvents: Array<{
		status: string;
		location?: string;
		vesselName?: string;
		description?: string;
		eventDate: string;
		completed: boolean;
		source: 'API';
	}>;
	progress: number;
	currentLocation?: string;
}

interface PGLTrackingResponse {
	result?: boolean;
	type?: string;
	data?: PGLTrackingEntry[];
}

interface PGLTrackingEntry {
	status?: string | null;
	container_id?: number;
	created_at?: string | null;
	containers?: {
		company_id?: number;
		container_number?: string | null;
		cover_photo?: string | null;
		photo_link?: string | null;
		vehicles?: Array<{
			pol_locations?: {
				name?: string | null;
			} | null;
		}>;
		bookings?: {
			booking_number?: string | null;
			eta?: string | null;
			destinations?: {
				name?: string | null;
			} | null;
			vessels?: {
				etd?: string | null;
				name?: string | null;
				vessel?: string | null;
				voyage?: string | null;
				voyage_number?: string | null;
			} | null;
		} | null;
	};
}

export class TrackingAPIService {
	/**
	 * Fetch tracking data as normalized tracking events.
	 */
	async fetchTrackingData(
		trackingNumber: string,
		_shippingLine?: string
	): Promise<ExternalTrackingEvent[]> {
		try {
			const entries = await this.fetchPGLEntries(trackingNumber);
			if (entries.length === 0) {
				return [];
			}

			return this.transformEntriesToEvents(entries);
		} catch (error) {
			logger.error('Error fetching tracking data:', error);
			return [];
		}
	}

	/**
	 * Fetch full tracking data for the container form route.
	 */
	async fetchContainerTrackingData(
		containerNumber: string
	): Promise<ContainerTrackingSnapshot | null> {
		try {
			const normalizedContainerNumber = containerNumber.trim().toUpperCase();
			const entries = await this.fetchPGLEntries(normalizedContainerNumber);
			if (entries.length === 0) {
				return null;
			}

			return this.buildSnapshotFromPGLEntries(normalizedContainerNumber, entries);
		} catch (error) {
			logger.error('Error fetching container tracking data:', error);
			return null;
		}
	}

	/**
	 * Transform PGL tracking history to our normalized event format.
	 */
	private transformEntriesToEvents(entries: PGLTrackingEntry[]): ExternalTrackingEvent[] {
		try {
				return entries
					.map((entry) => {
						const rawStatus = entry.status || undefined;
						const status = this.normalizeStatus(rawStatus);
						const location = this.getEventLocation(entry, rawStatus);
						const vesselName = this.getVesselName(entry);
						const voyageNumber = this.getVoyageNumber(entry);
						const bookingNumber = entry.containers?.bookings?.booking_number;
						const descriptionParts = [
							bookingNumber ? `Booking: ${bookingNumber}` : null,
							voyageNumber ? `Voyage: ${voyageNumber}` : null,
							rawStatus ? `Source status: ${rawStatus}` : null,
						].filter(Boolean);

						return {
							status,
							location: location || 'Unknown',
							timestamp: this.toIsoString(entry.created_at) || new Date().toISOString(),
							description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : undefined,
							vesselName: vesselName || undefined,
							voyageNumber: voyageNumber || undefined,
							latitude: undefined,
							longitude: undefined,
							completed: true,
						};
					})
					.filter((event) => event.status !== 'Status Update');
		} catch (error) {
			logger.error('Error transforming PGL response:', error);
			return [];
		}
	}

	/**
	 * Get estimated arrival from the latest booking data.
	 */
	async getEstimatedArrival(
		trackingNumber: string
	): Promise<Date | null> {
		try {
			const entries = await this.fetchPGLEntries(trackingNumber);
			if (entries.length === 0) {
				return null;
			}

			const eta = entries[0].containers?.bookings?.eta;
			if (!eta) {
				return null;
			}

			const date = new Date(eta);
			return Number.isNaN(date.getTime()) ? null : date;
		} catch (error) {
			logger.error('Error fetching ETA:', error);
			return null;
		}
	}

	private buildSnapshotFromPGLEntries(
		normalizedContainerNumber: string,
		entries: PGLTrackingEntry[]
	): ContainerTrackingSnapshot {
		const trackingEvents = this.transformEntriesToEvents(entries).map((event) => ({
			status: event.status,
			location: event.location || undefined,
			vesselName: event.vesselName || undefined,
			description: event.description || undefined,
			eventDate: event.timestamp,
			completed: Boolean(event.completed),
			source: 'API' as const,
		}));

		const latestEntry = entries[0];
		const metadata = latestEntry.containers;
		const booking = metadata?.bookings;
		const loadingPort = this.getLoadingPort(latestEntry);
		const destinationPort = this.getDestinationPort(latestEntry);
		const latestEvent = trackingEvents[0];
		const latestStatus = latestEvent?.status;

		return {
			containerNumber: metadata?.container_number || normalizedContainerNumber,
			trackingNumber: metadata?.container_number || normalizedContainerNumber,
			bookingNumber: booking?.booking_number || undefined,
			vesselName: this.getVesselName(latestEntry),
			voyageNumber: this.getVoyageNumber(latestEntry),
			shippingLine: undefined,
			loadingPort: loadingPort || undefined,
			destinationPort: destinationPort || undefined,
			loadingDate: this.findEventTimestamp(entries, ['at_loading', 'loaded']) || undefined,
			departureDate:
				this.toIsoString(booking?.vessels?.etd) ||
				this.findEventTimestamp(entries, ['depart', 'on_board', 'in_transit']) ||
				undefined,
			estimatedArrival: this.toIsoString(booking?.eta) || undefined,
			containerType: undefined,
			status: latestStatus,
			trackingEvents,
			progress: this.calculateProgressFromStatus(latestStatus),
			currentLocation: latestEvent?.location || loadingPort || undefined,
		};
	}

	private async fetchPGLEntries(containerNumber: string): Promise<PGLTrackingEntry[]> {
		const normalizedContainerNumber = containerNumber.trim().toUpperCase();

		const cached = pglCache.get(normalizedContainerNumber);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.entries;
		}

		const url = `${PGL_TRACKING_ENDPOINT}?tracking_value=${encodeURIComponent(normalizedContainerNumber)}`;

		const response = await fetch(url, {
			cache: 'no-store',
			headers: {
				Accept: 'application/json',
			},
		});

		if (!response.ok) {
			logger.error('PGL tracking API error:', response.status);
			return [];
		}

		const payload = (await response.json()) as PGLTrackingResponse;
		if (!payload?.result || !Array.isArray(payload.data) || payload.data.length === 0) {
			logger.info(`No tracking data found for container: ${normalizedContainerNumber}`);
			return [];
		}

		const entries = payload.data
			.slice()
			.sort((left, right) => this.getTimestamp(right.created_at) - this.getTimestamp(left.created_at));

		pglCache.set(normalizedContainerNumber, {
			entries,
			expiresAt: Date.now() + PGL_CACHE_TTL_MS,
		});

		return entries;
	}

	private normalizeStatus(status?: string | null): string {
		const rawStatus = status?.trim().toLowerCase();
		if (!rawStatus) {
			return 'Status Update';
		}

		const statusMap: Record<string, string> = {
			pending: 'Container Booked',
			at_loading: 'Loaded at Origin',
			loaded: 'Loaded at Origin',
			at_the_dock: 'At Origin Dock',
			on_board: 'In Transit - Ocean',
			in_transit: 'In Transit - Ocean',
			at_sea: 'In Transit - Ocean',
			transshipment: 'Transshipment',
			arrived_destination: 'Arrived at Destination Port',
			arrived_at_destination: 'Arrived at Destination Port',
			customs_clearance: 'Customs Clearance',
			released_from_customs: 'Released from Customs',
			out_for_delivery: 'Out for Delivery',
			delivered: 'Delivered',
		};

		if (statusMap[rawStatus]) {
			return statusMap[rawStatus];
		}

		return rawStatus
			.split('_')
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(' ');
	}

	private getLoadingPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.vehicles?.find((vehicle) => vehicle.pol_locations?.name)?.pol_locations?.name || undefined;
	}

	private getDestinationPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.destinations?.name || undefined;
	}

	private getVesselName(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.name || entry.containers?.bookings?.vessels?.vessel || undefined;
	}

	private getVoyageNumber(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.voyage_number || entry.containers?.bookings?.vessels?.voyage || undefined;
	}

	private getEventLocation(entry: PGLTrackingEntry, rawStatus?: string | null): string | undefined {
		const status = rawStatus?.toLowerCase() || '';
		const loadingPort = this.getLoadingPort(entry);
		const destinationPort = this.getDestinationPort(entry);

		if (
			status.includes('destination') ||
			status.includes('deliver') ||
			status.includes('customs') ||
			status.includes('release') ||
			status.includes('arrived') ||
			status.includes('discharge')
		) {
			return destinationPort || loadingPort;
		}

		return loadingPort || destinationPort;
	}

	private findEventTimestamp(entries: PGLTrackingEntry[], patterns: string[]): string | undefined {
		const match = entries
			.slice()
			.reverse()
			.find((entry) => {
				const status = entry.status?.toLowerCase() || '';
				return patterns.some((pattern) => status.includes(pattern));
			});

		return this.toIsoString(match?.created_at);
	}

	private calculateProgressFromStatus(status?: string): number {
		const normalizedStatus = status?.toLowerCase() || '';

		if (normalizedStatus.includes('booked')) return 10;
		if (normalizedStatus.includes('loading')) return 25;
		if (normalizedStatus.includes('loaded')) return 30;
		if (normalizedStatus.includes('dock')) return 35;
		if (normalizedStatus.includes('depart')) return 40;
		if (normalizedStatus.includes('transit') || normalizedStatus.includes('ocean')) return 60;
		if (normalizedStatus.includes('arrived')) return 75;
		if (normalizedStatus.includes('customs')) return 85;
		if (normalizedStatus.includes('released') || normalizedStatus.includes('cleared')) return 90;
		if (normalizedStatus.includes('delivery')) return 95;
		if (normalizedStatus.includes('delivered')) return 100;

		return 50;
	}

	private toIsoString(value?: string | null): string | undefined {
		if (!value) {
			return undefined;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
	}

	private getTimestamp(value?: string | null): number {
		if (!value) {
			return 0;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 0 : date.getTime();
	}
}

// Singleton instance
export const trackingAPI = new TrackingAPIService();
