/**
 * Tracking Sync Service
 * Syncs tracking data from external API to database
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { trackingAPI } from './tracking-api';
import { isCompletedStatus, calculateProgress } from '@/lib/tracking-utils';

export class TrackingSyncService {
	/**
	 * Sync tracking events for a container
	 */
	async syncContainerTracking(
		containerId: string,
		options?: { force?: boolean }
	): Promise<{
		success: boolean;
		newEvents: number;
		updatedETA: boolean;
		provider?: string;
		error?: string;
	}> {
		try {
			// Get container details
			const container = await prisma.container.findUnique({
				where: { id: containerId },
				select: {
					containerNumber: true,
					trackingNumber: true,
					shippingLine: true,
					estimatedArrival: true,
					autoTrackingEnabled: true,
					status: true,
				},
			});

			if (!container) {
				return { success: false, newEvents: 0, updatedETA: false, error: 'Container not found' };
			}

			if (!options?.force && !container.autoTrackingEnabled) {
				return { success: false, newEvents: 0, updatedETA: false, error: 'Auto-tracking is disabled for this container' };
			}

			const trackingNum = container.trackingNumber || container.containerNumber;
			if (!trackingNum) {
				return { success: false, newEvents: 0, updatedETA: false, error: 'Container has no tracking or container number' };
			}

			// Fetch tracking data from external API
			const snapshot = await trackingAPI.fetchContainerTrackingData(
				trackingNum,
				{ forceRefresh: options?.force }
			);

			if (!snapshot || snapshot.trackingEvents.length === 0) {
				return { success: true, newEvents: 0, updatedETA: false, provider: snapshot?.provider };
			}

			const externalEvents = snapshot.trackingEvents.map((ev) => ({
				status: ev.status,
				location: ev.location || 'Unknown',
				timestamp: ev.eventDate,
				description: ev.description,
				vesselName: ev.vesselName || snapshot.vesselName,
				voyageNumber: snapshot.voyageNumber,
				completed: ev.completed,
				source: ev.source || 'API',
			}));

			// Get existing events from database
			const existingEvents = await prisma.containerTrackingEvent.findMany({
				where: { containerId },
				select: { status: true, eventDate: true },
			});

			// Find new events (not already in database)
			const newEvents = externalEvents.filter((extEvent) => {
				const eventDate = new Date(extEvent.timestamp);
				return !existingEvents.some(
					(dbEvent) =>
						dbEvent.status === extEvent.status &&
						Math.abs(dbEvent.eventDate.getTime() - eventDate.getTime()) < 60000 // Within 1 minute
				);
			});

			// Insert new events
			let insertedCount = 0;
			for (const event of newEvents) {
				try {
					await prisma.containerTrackingEvent.create({
						data: {
							containerId,
							status: event.status,
							location: event.location || undefined,
							vesselName: event.vesselName || undefined,
							description: event.description || undefined,
							eventDate: new Date(event.timestamp),
							source: event.source || 'API',
							completed: isCompletedStatus(event.status),
							latitude: event.latitude || undefined,
							longitude: event.longitude || undefined,
						},
					});
					insertedCount++;
				} catch (error) {
					logger.error('Error inserting tracking event:', error);
				}
			}

			// Update estimated arrival if available
			let updatedETA = false;
			const eta = await trackingAPI.getEstimatedArrival(trackingNum);
			if (eta && (!container.estimatedArrival || eta.getTime() !== container.estimatedArrival.getTime())) {
				await prisma.container.update({
					where: { id: containerId },
					data: { estimatedArrival: eta },
				});
				updatedETA = true;
			}

			// Update container progress and other fields based on latest status
			if (externalEvents.length > 0) {
				const latestEvent = externalEvents[0];
				const progress = calculateProgress(latestEvent.status);
				
                // Prepare update data
                const updateData: {
                    progress: number;
                    lastLocationUpdate: Date;
                    currentLocation?: string;
                    vesselName?: string;
                    status?: string;
                    autoTrackingEnabled?: boolean;
                } = {
                    progress,
                    lastLocationUpdate: new Date(),
                };

                // Update current location if available
                if (latestEvent.location) {
                    updateData.currentLocation = latestEvent.location;
                }

                // Update vessel name if available
                if (latestEvent.vesselName) {
                    updateData.vesselName = latestEvent.vesselName;
                }

                // Auto-update container status based on tracking if it's a significant milestone.
                // Carrier events can arrive late, so only advance early workflow stages.
                const statusLower = latestEvent.status.toLowerCase();
                let statusChanged = false;
                if (
                    statusLower.includes('arrived') &&
                    ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'].includes(container.status)
                ) {
                    updateData.status = 'ARRIVED_PORT';
                    updateData.autoTrackingEnabled = false;
                    statusChanged = true;
                } else if ((statusLower.includes('depart') || statusLower.includes('transit')) && container.status === 'LOADED') {
                    updateData.status = 'IN_TRANSIT';
                    statusChanged = true;
                } else if (
                    (statusLower.includes('released') || statusLower.includes('cleared')) &&
                    ['ARRIVED_PORT', 'CUSTOMS_CLEARANCE'].includes(container.status)
                ) {
                    updateData.status = 'RELEASED';
                    updateData.autoTrackingEnabled = false;
                    statusChanged = true;
                } else if (
                    statusLower.includes('delivered') &&
                    ['RELEASED', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE'].includes(container.status)
                ) {
                    updateData.status = 'CLOSED';
                    updateData.autoTrackingEnabled = false;
                    statusChanged = true;
                }

				await prisma.container.update({
					where: { id: containerId },
					data: updateData,
				});

                // If container status changed, cascade to shipments
                if (statusChanged && updateData.status) {
                    if (updateData.status === 'IN_TRANSIT') {
                        await prisma.shipment.updateMany({
							where: { containerId, transitId: null },
                            data: { status: 'IN_TRANSIT' },
                        });
                    } else if (updateData.status === 'ARRIVED_PORT') {
                        await prisma.shipment.updateMany({
							where: { containerId, transitId: null },
                            data: { status: 'ON_HAND' },
                        });
                    } else if (updateData.status === 'RELEASED') {
                        await prisma.shipment.updateMany({
							where: { containerId, transitId: null },
                            data: { status: 'RELEASED' },
                        });
                    } else if (updateData.status === 'CLOSED') {
                        await prisma.shipment.updateMany({
							where: { containerId, transitId: null },
                            data: { status: 'DELIVERED' },
                        });
                    }
                }
			}

			return {
				success: true,
				newEvents: insertedCount,
				updatedETA,
				provider: snapshot.provider,
			};
		} catch (error) {
			logger.error('Error syncing container tracking:', error);
			return { success: false, newEvents: 0, updatedETA: false };
		}
	}

	/**
	 * Sync all active containers
	 */
	async syncAllActiveContainers(): Promise<{
		processed: number;
		successful: number;
		totalNewEvents: number;
	}> {
		try {
			// Get all containers with auto-tracking enabled and in transit
			const containers = await prisma.container.findMany({
				where: {
					autoTrackingEnabled: true,
					status: {
						in: ['WAITING_FOR_LOADING', 'IN_TRANSIT', 'LOADED', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE'],
					},
					trackingNumber: {
						not: null,
					},
				},
				select: { id: true },
			});

			let successful = 0;
			let totalNewEvents = 0;

			for (const container of containers) {
				const result = await this.syncContainerTracking(container.id);
				if (result.success) {
					successful++;
					totalNewEvents += result.newEvents;
				}

				// Add delay to avoid rate limiting
				await this.sleep(5000); // 5 second delay between requests
			}

			return {
				processed: containers.length,
				successful,
				totalNewEvents,
			};
		} catch (error) {
			logger.error('Error syncing all containers:', error);
			return { processed: 0, successful: 0, totalNewEvents: 0 };
		}
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Singleton instance
export const trackingSync = new TrackingSyncService();
