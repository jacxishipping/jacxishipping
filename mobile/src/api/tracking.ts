import client from './client';
import { Shipment } from '../types/shipment';

export interface TrackingResult {
  tracking: any;
}

function extractShipment(value: TrackingResult | Shipment): Shipment {
  // Backend canonical shape is POST /api/tracking -> { tracking }.
  // Older mobile code expected a bare Shipment; tolerate both so cached
  // callers keep working during the migration.
  if (value && typeof value === 'object' && 'tracking' in (value as any)) {
    const tracking = (value as TrackingResult).tracking;
    if (tracking?.shipment) return tracking.shipment as Shipment;
    return tracking as Shipment;
  }
  return value as Shipment;
}

export const trackingApi = {
  async trackByNumber(trackingNumber: string): Promise<Shipment> {
    const response = await client.post<TrackingResult>('/api/tracking', { trackNumber: trackingNumber });
    return extractShipment(response.data);
  },

  async trackByVin(vin: string): Promise<Shipment> {
    const response = await client.post<TrackingResult>('/api/tracking', { trackNumber: vin });
    return extractShipment(response.data);
  },

  async getPublicTracking(trackingNumber: string): Promise<Shipment> {
    const response = await client.post<TrackingResult>('/api/tracking', { trackNumber: trackingNumber });
    return extractShipment(response.data);
  },
};
