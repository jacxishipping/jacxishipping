/**
 * Shared tracking utility functions.
 * Single source of truth for progress calculation and status checks
 * used across tracking-api, tracking-sync, and webhook route.
 */

/**
 * Determine if a status string represents a "completed" state.
 */
export function isCompletedStatus(status: string): boolean {
	const completedStatuses = [
		'delivered',
		'completed',
		'arrived',
		'released',
		'cleared',
	];
	return completedStatuses.some((s) => status.toLowerCase().includes(s));
}

/**
 * Calculate progress percentage (0-100) based on status text.
 * Used by tracking-sync and webhook route.
 */
export function calculateProgress(status: string): number {
	const statusLower = status.toLowerCase();

	if (statusLower.includes('book')) return 10;
	if (statusLower.includes('pickup') || statusLower.includes('empty')) return 20;
	if (statusLower.includes('loading')) return 25;
	if (statusLower.includes('loaded')) return 30;
	if (statusLower.includes('dock')) return 35;
	if (statusLower.includes('depart')) return 40;
	if (statusLower.includes('transit') || statusLower.includes('ocean')) return 60;
	if (statusLower.includes('arrived')) return 75;
	if (statusLower.includes('customs')) return 85;
	if (statusLower.includes('released') || statusLower.includes('cleared')) return 90;
	if (statusLower.includes('delivery') || statusLower.includes('out for')) return 95;
	if (statusLower.includes('delivered') || statusLower.includes('completed')) return 100;

	return 50; // Default
}

/**
 * Haversine distance between two coordinates in nautical miles.
 */
export function haversineDistanceNM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3440.065; // Earth radius in NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate progress percentage based on distance traveled vs total distance.
 * Falls back to keyword-based progress if coordinates are not available.
 */
export function calculateDistanceBasedProgress(
  status: string,
  currentLat?: number,
  currentLng?: number,
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number,
): number {
  // If we have valid coordinates, use distance-based calculation
  if (
    currentLat != null && currentLng != null &&
    originLat != null && originLng != null &&
    destLat != null && destLng != null
  ) {
    const totalDist = haversineDistanceNM(originLat, originLng, destLat, destLng);
    if (totalDist > 1) {
      const traveledDist = haversineDistanceNM(originLat, originLng, currentLat, currentLng);
      const pct = Math.round((traveledDist / totalDist) * 100);
      return Math.min(100, Math.max(0, pct));
    }
  }
  // Fallback to keyword-based progress
  return calculateProgress(status);
}

/**
 * Calculate progress from a status string (alias used by tracking-api).
 * Merges the same logic as calculateProgress for consistency.
 */
export function calculateProgressFromStatus(status?: string): number {
	return calculateProgress(status || '');
}

/**
 * Generic retry wrapper for async fetch operations with exponential backoff.
 * Retries on network errors and HTTP 5xx status codes.
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = 2,
	initialDelayMs = 1000
): Promise<Response> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, options);
			if (response.ok || response.status < 500) {
				return response;
			}
			// 5xx — retry
			lastError = new Error(`HTTP ${response.status}`);
			if (attempt < maxRetries) {
				await new Promise((r) => setTimeout(r, initialDelayMs * Math.pow(2, attempt)));
			} else {
				return response;
			}
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			// An aborted request must fail fast — retrying it would just
			// re-issue a fetch that throws immediately, and the backoff
			// delays would defeat the caller's timeout.
			if (lastError.name === 'AbortError' || options.signal?.aborted) {
				throw lastError;
			}
			if (attempt < maxRetries) {
				await new Promise((r) => setTimeout(r, initialDelayMs * Math.pow(2, attempt)));
			}
		}
	}

	throw lastError || new Error(`Request to ${url} failed after ${maxRetries} retries.`);
}
